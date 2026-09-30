import React, { useCallback, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  WalletProvider,
  WalletManager,
  WalletId,
  NetworkId,
  useWallet,
} from "@txnlab/use-wallet-react";
import { x402Client } from "@x402/core/client";
import { registerExactAvmScheme } from "@x402/avm/exact/client";

/* ========================= CONFIG ========================= */

const TRUST402_URL = "https://trust402.daud9.deno.net/v1/trust";
const ALGOD_URL = "https://mainnet-api.algonode.cloud";

// Algorand MainNet (CAIP-2) and USDC ASA
const MAINNET_CAIP2 = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=";
const USDC_ASA_ID = "31566704";

// Hard spending cap: 0.05 USDC = 50,000 base units (6 decimals)
const MAX_AMOUNT = 50000n;
const REQUEST_TIMEOUT_MS = 60000;

const walletManager = new WalletManager({
  wallets: [WalletId.PERA],
  defaultNetwork: NetworkId.MAINNET,
});

/* ========================= HELPERS ========================= */

// Only allow: Algorand MainNet + USDC + amount <= cap.
// Stops a bad/compromised endpoint from asking for more than $0.05.
const safePaymentPolicy = (_version, requirements) =>
  requirements.filter((r) => {
    try {
      const amount = BigInt(r.amount ?? r.maxAmountRequired ?? "0");
      return (
        r.network === MAINNET_CAIP2 &&
        String(r.asset) === USDC_ASA_ID &&
        amount > 0n &&
        amount <= MAX_AMOUNT
      );
    } catch {
      return false;
    }
  });

// Settlement receipt is returned base64-JSON in a response header.
function readReceipt(response) {
  const raw =
    response.headers.get("PAYMENT-RESPONSE") ||
    response.headers.get("X-PAYMENT-RESPONSE");
  if (!raw) return null;
  try {
    return JSON.parse(atob(raw));
  } catch {
    return null;
  }
}

function friendlyError(error) {
  const msg = error?.message || String(error);
  if (/reject|cancel|denied|declined/i.test(msg))
    return "You cancelled the signature in Pera.";
  if (/opt.?in|asset.*not.*found|receiver.*asset/i.test(msg))
    return "Your account is not opted in to USDC (ASA 31566704).";
  if (/overspend|below min|insufficient|balance/i.test(msg))
    return "Insufficient USDC or ALGO. You need 0.05 USDC and the ALGO minimum balance.";
  if (/abort/i.test(msg)) return "Request timed out. Try again.";
  if (/no.*payment.*requirements|no.*matching|no.*scheme/i.test(msg))
    return "The endpoint's payment terms were rejected by the safety policy (wrong network, asset or price).";
  return msg;
}

/* ========================= APP ========================= */

function Trust402App() {
  const { wallets, activeWallet, activeAccount, signTransactions } =
    useWallet();

  const [target, setTarget] = useState("TEST-AGENT");
  const [result, setResult] = useState(null);
  const [txId, setTxId] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const pera = wallets?.find((w) => w.id === WalletId.PERA);

  const signer = useMemo(() => {
    if (!activeAccount) return null;
    return {
      address: activeAccount.address,
      signTransactions: (txns, indexesToSign) =>
        signTransactions(txns, indexesToSign),
    };
  }, [activeAccount, signTransactions]);

  const handleConnect = async () => {
    try {
      await pera?.connect();
    } catch (e) {
      setStatus(friendlyError(e));
    }
  };

  const handleDisconnect = async () => {
    try {
      await activeWallet?.disconnect();
    } catch (e) {
      setStatus(friendlyError(e));
    }
  };

  const runTrustCheck = useCallback(async () => {
    if (!signer) {
      setStatus("Connect your Pera wallet first.");
      return;
    }
    const cleanTarget = target.trim().slice(0, 200);
    if (!cleanTarget) {
      setStatus("Enter a target to assess.");
      return;
    }

    setLoading(true);
    setResult(null);
    setTxId(null);
    setStatus("Requesting Trust402 assessment...");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const client = new x402Client({ schemes: [] });

      registerExactAvmScheme(client, {
        signer,
        algodConfig: { algodUrl: ALGOD_URL },
        networks: [MAINNET_CAIP2],
        policies: [safePaymentPolicy],
      });

      // Handles: request -> 402 -> build txn group -> Pera signs -> retry.
      // If your installed SDK has no client.fetch, use:
      //   import { wrapFetchWithPayment } from "@x402/fetch";
      //   const pay = wrapFetchWithPayment(fetch, client);
      const response = await client.fetch(TRUST402_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: cleanTarget }),
        signal: controller.signal,
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        throw new Error(
          `Trust402 returned HTTP ${response.status}: ${
            data?.message || data?.error || text
          }`,
        );
      }

      const receipt = readReceipt(response);
      if (receipt?.transaction) setTxId(receipt.transaction);

      setResult(data);
      setStatus(
        receipt?.success === false
          ? "Response received, but settlement was not confirmed."
          : "Payment settled. Trust report received.",
      );
    } catch (error) {
      console.error("TRUST402 PAYMENT ERROR:", error);
      setStatus(friendlyError(error));
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, [signer, target]);

  const hasScore = result && result.trust_score != null;

  return (
    <div className="app">
      <div className="card">
        <div className="brand">
          <div className="logo">T</div>
          <div>
            <h1>Trust402</h1>
            <p>Paid trust &amp; risk assessment for autonomous agents</p>
          </div>
        </div>

        <div className="network">
          <span>Algorand MainNet</span>
          <strong>$0.05 USDC</strong>
        </div>

        {!activeAccount ? (
          <button className="primary" onClick={handleConnect}>
            Connect Pera Wallet
          </button>
        ) : (
          <>
            <div className="wallet">
              <span>Connected</span>
              <code>
                {activeAccount.address.slice(0, 6)}...
                {activeAccount.address.slice(-6)}
              </code>
              <button className="disconnect" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>

            <label>Agent / Target</label>
            <input
              value={target}
              maxLength={200}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Agent, wallet, API or website"
            />

            <button
              className="primary"
              onClick={runTrustCheck}
              disabled={loading}
            >
              {loading ? "Processing..." : "Get Trust Report — $0.05"}
            </button>
          </>
        )}

        {status && <div className="status">{status}</div>}

        {txId && (
          <div className="status">
            Tx:{" "}
            <a
              href={`https://allo.info/tx/${txId}`}
              target="_blank"
              rel="noreferrer"
            >
              {txId.slice(0, 10)}...
            </a>
          </div>
        )}

        {result && !hasScore && (
          <pre className="result">{JSON.stringify(result, null, 2)}</pre>
        )}

        {hasScore && (
          <div className="result">
            <h2>Trust Report</h2>

            <div className="score">
              <strong>{result.trust_score}</strong>
              <span>/ 100</span>
            </div>

            <div className="risk">
              Risk level: <strong>{result.risk_level ?? "n/a"}</strong>
            </div>

            <div className="details">
              <div>
                <span>Identity</span>
                <strong>{result.identity?.status ?? "n/a"}</strong>
              </div>
              <div>
                <span>Wallet</span>
                <strong>{result.wallet?.status ?? "n/a"}</strong>
              </div>
              <div>
                <span>Reputation</span>
                <strong>{result.reputation?.status ?? "n/a"}</strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>{result.confidence ?? "n/a"}</strong>
              </div>
            </div>

            {result.warnings?.length > 0 && (
              <div>
                <h3>Warnings</h3>
                <ul>
                  {result.warnings.map((w, i) => (
                    <li key={i}>{String(w)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================= ROOT ========================= */

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WalletProvider manager={walletManager}>
      <Trust402App />
    </WalletProvider>
  </React.StrictMode>,
);
