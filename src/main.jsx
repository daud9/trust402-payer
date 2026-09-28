import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import PeraWalletConnect from "@perawallet/connect";

import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactAvmClient } from "@x402/avm";

import "./style.css";

const peraWallet = new PeraWalletConnect();

function App() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        if (accounts?.length) {
          setAccount(accounts[0]);
        }
      })
      .catch(() => {});
  }, []);

  const connectWallet = async () => {
    try {
      setError(null);

      const accounts = await peraWallet.connect();

      if (!accounts?.length) {
        throw new Error("No Pera account was returned.");
      }

      setAccount(accounts[0]);
    } catch (err) {
      setError(err?.message || String(err));
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setAccount(null);
  };

  const pay = async () => {
    if (!account) {
      setError("Connect Pera Wallet first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const signer = {
        address: account,

        signTransactions: async (
          txns,
          indexesToSign,
        ) => {
          const txnGroup = txns.map((txn, i) => ({
            txn,
            signers:
              indexesToSign &&
              !indexesToSign.includes(i)
                ? []
                : [account],
          }));

          const signedTxns =
            await peraWallet.signTransaction([
              txnGroup,
            ]);

          return txns.map((_, i) => {
            if (
              indexesToSign &&
              !indexesToSign.includes(i)
            ) {
              return null;
            }

            return signedTxns.shift() ?? null;
          });
        },
      };

      const client = new x402Client().register(
        "algorand:*",
        new ExactAvmClient(signer),
      );

      const fetchWithPayment =
        wrapFetchWithPayment(
          fetch,
          client,
        );

      const response = await fetchWithPayment(
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
  };

  return (
    <main>
      <section className="card">
        <h1>Trust402</h1>

        <p className="subtitle">
          Algorand MainNet x402 payment test
        </p>

        {!account ? (
          <button onClick={connectWallet}>
            Connect Pera Wallet
          </button>
        ) : (
          <>
            <div className="wallet">
              <strong>Connected wallet</strong>
              <span>{account}</span>
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
              onClick={disconnectWallet}
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
            <strong>
              Payment successful ✓
            </strong>

            <pre>
              {JSON.stringify(
                result,
                null,
                2,
              )}
            </pre>
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(
  document.getElementById("root"),
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);