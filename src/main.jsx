import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import ReactDOM from "react-dom/client";

import {
  WalletProvider,
  WalletManager,
  useWallet,
} from "@txnlab/use-wallet-react";

import { x402Client } from "@x402/core/client";

import {
  registerExactAvmScheme,
} from "@x402/avm/exact/client";

/* =========================
   TRUST402
========================= */

const TRUST402_URL =
  "https://trust402.daud9.deno.net/v1/trust";

/* =========================
   WALLET MANAGER
========================= */

const walletManager =
  new WalletManager({
    wallets: [
      {
        id: "pera",
      },
    ],
    defaultNetwork: "mainnet",
  });

/* =========================
   MAIN APP
========================= */

function Trust402App() {
  const {
    activeAccount,
    signTransactions,
    connect,
    disconnect,
  } = useWallet();

  const [target, setTarget] =
    useState("TEST-AGENT");

  const [result, setResult] =
    useState(null);

  const [status, setStatus] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /* =========================
     X402 SIGNER
  ========================= */

  const signer = useMemo(() => {
    if (!activeAccount) {
      return null;
    }

    return {
      address: activeAccount.address,

      signTransactions: async (
        txns,
        indexesToSign,
      ) => {
        return signTransactions(
          txns,
          indexesToSign,
        );
      },
    };
  }, [
    activeAccount,
    signTransactions,
  ]);

  /* =========================
     TRUST CHECK
  ========================= */

  const runTrustCheck =
    useCallback(async () => {
      if (!signer) {
        setStatus(
          "Connect your Pera wallet first.",
        );
        return;
      }

      if (!target.trim()) {
        setStatus(
          "Enter a target to assess.",
        );
        return;
      }

      setLoading(true);
      setResult(null);

      setStatus(
        "Requesting Trust402 assessment...",
      );

      try {
        /*
         * Create x402 client.
         */

        const client =
          new x402Client({
            schemes: [],
          });

        /*
         * Register official
         * Algorand Exact scheme.
         */

        registerExactAvmScheme(
          client,
          {
            signer,

            algodConfig: {
              algodUrl:
                "https://mainnet-api.algonode.cloud",
            },
          },
        );

        /*
         * x402 handles:
         *
         * 1. Initial request
         * 2. HTTP 402
         * 3. PAYMENT-REQUIRED
         * 4. Algorand transaction creation
         * 5. Wallet signing
         * 6. Payment payload
         * 7. Retry
         */

        const response =
          await client.fetch(
            TRUST402_URL,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                target:
                  target.trim(),
              }),
            },
          );

        const text =
          await response.text();

        let data;

        try {
          data = JSON.parse(text);
        } catch {
          data = {
            raw: text,
          };
        }

        if (!response.ok) {
          throw new Error(
            `Trust402 returned HTTP ${response.status}: ${
              data?.message ||
              data?.error ||
              text
            }`,
          );
        }

        setResult(data);

        setStatus(
          "Payment successful. Trust report received.",
        );
      } catch (error) {
        console.error(
          "TRUST402 PAYMENT ERROR:",
          error,
        );

        setStatus(
          error?.message ||
            String(error),
        );
      } finally {
        setLoading(false);
      }
    }, [
      signer,
      target,
    ]);

  /* =========================
     UI
  ========================= */

  return (
    <div className="app">
      <div className="card">

        <div className="brand">

          <div className="logo">
            T
          </div>

          <div>
            <h1>
              Trust402
            </h1>

            <p>
              Paid trust & risk
              assessment for
              autonomous agents
            </p>
          </div>

        </div>

        <div className="network">

          <span>
            Algorand MainNet
          </span>

          <strong>
            $0.05 USDC
          </strong>

        </div>

        {!activeAccount ? (

          <button
            className="primary"
            onClick={connect}
          >
            Connect Pera Wallet
          </button>

        ) : (

          <>
            <div className="wallet">

              <span>
                Connected
              </span>

              <code>
                {
                  activeAccount.address.slice(
                    0,
                    6,
                  )
                }
                ...
                {
                  activeAccount.address.slice(
                    -6,
                  )
                }
              </code>

              <button
                className="disconnect"
                onClick={disconnect}
              >
                Disconnect
              </button>

            </div>

            <label>
              Agent / Target
            </label>

            <input
              value={target}
              onChange={(e) =>
                setTarget(
                  e.target.value,
                )
              }
              placeholder="Agent, wallet, API or website"
            />

            <button
              className="primary"
              onClick={
                runTrustCheck
              }
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : "Get Trust Report — $0.05"}
            </button>
          </>

        )}

        {status && (
          <div className="status">
            {status}
          </div>
        )}

        {result && (
          <div className="result">

            <h2>
              Trust Report
            </h2>

            <div className="score">

              <strong>
                {result.trust_score}
              </strong>

              <span>
                / 100
              </span>

            </div>

            <div className="risk">
              Risk level:{" "}
              <strong>
                {result.risk_level}
              </strong>
            </div>

            <div className="details">

              <div>
                <span>
                  Identity
                </span>

                <strong>
                  {
                    result.identity
                      ?.status
                  }
                </strong>
              </div>

              <div>
                <span>
                  Wallet
                </span>

                <strong>
                  {
                    result.wallet
                      ?.status
                  }
                </strong>
              </div>

              <div>
                <span>
                  Reputation
                </span>

                <strong>
                  {
                    result.reputation
                      ?.status
                  }
                </strong>
              </div>

              <div>
                <span>
                  Confidence
                </span>

                <strong>
                  {result.confidence}
                </strong>
              </div>

            </div>

            {result.warnings
              ?.length > 0 && (

              <div>

                <h3>
                  Warnings
                </h3>

                <ul>

                  {result.warnings.map(
                    (warning, i) => (
                      <li key={i}>
                        {String(
                          warning,
                        )}
                      </li>
                    ),
                  )}

                </ul>

              </div>

            )}

          </div>
        )}

      </div>
    </div>
  );
}

/* =========================
   APP ROOT
========================= */

ReactDOM.createRoot(
  document.getElementById("root"),
).render(
  <React.StrictMode>

    <WalletProvider
      manager={walletManager}
    >
      <Trust402App />
    </WalletProvider>

  </React.StrictMode>,
);