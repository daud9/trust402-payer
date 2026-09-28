import React, { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  WalletProvider,
  useWallet,
  WalletId,
} from "@txnlab/use-wallet-react";

import { x402Client } from "@x402/core/client";
import { registerExactAvmScheme } from "@x402/avm/exact/client";

import "./style.css";

const walletConfig = {
  wallets: [WalletId.PERA],
};

function Payer() {
  const {
    activeAccount,
    signTransactions,
    connect,
    disconnect,
  } = useWallet();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const pay = useCallback(async () => {
    if (!activeAccount) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const signer = {
        address: activeAccount.address,

        signTransactions: async (txns, indexes) => {
          return signTransactions(txns, indexes);
        },
      };

      const client = new x402Client({
        schemes: [],
      });

      registerExactAvmScheme(client, {
        signer,
      });

      const response = await client.fetch(
        "https://trust402.daud9.deno.net/v1/trust",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            target: "TEST-AGENT",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            `Request failed: HTTP ${response.status}`,
        );
      }

      setResult(data);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [activeAccount, signTransactions]);

  return (
    <main>
      <section className="card">
        <h1>Trust402</h1>

        <p className="subtitle">
          Algorand MainNet x402 payment test
        </p>

        {!activeAccount ? (
          <button onClick={() => connect()}>
            Connect Pera Wallet
          </button>
        ) : (
          <>
            <div className="wallet">
              <strong>Connected wallet</strong>
              <span>{activeAccount.address}</span>
            </div>

            <button
              onClick={pay}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : "Pay $0.05 USDC"}
            </button>

            <button
              className="secondary"
              onClick={() => disconnect()}
              disabled={loading}
            >
              Disconnect
            </button>
          </>
        )}

        {error && (
          <div className="error">
            <strong>Payment failed</strong>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="success">
            <strong>Payment successful ✓</strong>
            <pre>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}

function App() {
  return (
    <WalletProvider value={walletConfig}>
      <Payer />
    </WalletProvider>
  );
}

createRoot(
  document.getElementById("root"),
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
