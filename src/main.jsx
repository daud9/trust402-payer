import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

import "./style.css";

const peraWallet = new PeraWalletConnect({
  chainId: 416001,
});

const TRUST402_URL =
  "https://trust402.daud9.deno.net/v1/trust";

const ALGOD_URL =
  "https://mainnet-api.algonode.cloud";

function encodeBase64Json(value) {
  const bytes = new TextEncoder().encode(
    JSON.stringify(value),
  );

  let binary = "";
  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize),
    );
  }

  return btoa(binary);
}

function decodeBase64Json(value) {
  const binary = atob(value);

  const bytes = Uint8Array.from(
    binary,
    (char) => char.charCodeAt(0),
  );

  return JSON.parse(
    new TextDecoder().decode(bytes),
  );
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize),
    );
  }

  return btoa(binary);
}

async function getPaymentRequired(response) {
  const header =
    response.headers.get("PAYMENT-REQUIRED");

  if (!header) {
    throw new Error(
      "Trust402 did not return a PAYMENT-REQUIRED header.",
    );
  }

  return decodeBase64Json(header);
}

async function createPayment(
  paymentRequired,
  account,
) {
  const requirements =
    paymentRequired.accepts?.find(
      (item) =>
        item.scheme === "exact" &&
        item.network?.startsWith(
          "algorand:",
        ),
    );

  if (!requirements) {
    throw new Error(
      "No compatible Algorand exact payment requirement was returned.",
    );
  }

  if (requirements.asset !== "31566704") {
    throw new Error(
      `Unexpected payment asset: ${requirements.asset}`,
    );
  }

  const amount = BigInt(
    requirements.amount,
  );

  const algod = new algosdk.Algodv2(
    "",
    ALGOD_URL,
    "",
  );

  const suggestedParams =
    await algod
      .getTransactionParams()
      .do();

  const feePayer =
    requirements.extra?.feePayer;

  /*
   * --------------------------------------------------
   * SIMPLE PAYMENT
   * --------------------------------------------------
   */

  if (!feePayer) {
    const paymentTxn =
      algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
        {
          sender: account,
          receiver:
            requirements.payTo,
          amount,
          assetIndex:
            BigInt(requirements.asset),
          suggestedParams,
        },
      );

    algosdk.assignGroupID([
      paymentTxn,
    ]);

    const signedTxns =
      await peraWallet.signTransaction([
        [
          {
            txn: paymentTxn,
            signers: [account],
          },
        ],
      ]);

    if (!signedTxns?.length) {
      throw new Error(
        "Pera Wallet did not return a signed transaction.",
      );
    }

    const signedTxn =
      signedTxns[0];

    const paymentPayload = {
      x402Version: 2,

      scheme:
        requirements.scheme,

      network:
        requirements.network,

      resource:
        paymentRequired.resource,

      accepted:
        requirements,

      extensions:
        paymentRequired.extensions || {},

      payload: {
        paymentGroup: [
          bytesToBase64(
            signedTxn,
          ),
        ],

        paymentIndex: 0,
      },
    };

    return encodeBase64Json(
      paymentPayload,
    );
  }

  /*
   * --------------------------------------------------
   * FEE-ABSTRACTED PAYMENT
   * --------------------------------------------------
   *
   * Transaction 0:
   *   Fee payer self-payment
   *
   * Transaction 1:
   *   User USDC transfer
   *
   * Both transactions are sent to Pera
   * so Pera can validate the SAME group ID.
   *
   * Pera signs ONLY transaction 1.
   */

  const minFee =
    Number(
      suggestedParams.minFee ||
        suggestedParams.fee ||
        1000,
    );

  /*
   * TRANSACTION 0
   * Fee payer transaction
   */

  const feePayerTxn =
    algosdk.makePaymentTxnWithSuggestedParamsFromObject(
      {
        sender: feePayer,

        receiver: feePayer,

        amount: 0,

        note:
          new TextEncoder().encode(
            "x402-fee-payer",
          ),

        suggestedParams: {
          ...suggestedParams,

          fee: minFee * 2,

          flatFee: true,
        },
      },
    );

  /*
   * TRANSACTION 1
   * User USDC payment
   */

  const paymentTxn =
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
      {
        sender: account,

        receiver:
          requirements.payTo,

        amount,

        assetIndex:
          BigInt(requirements.asset),

        note:
          new TextEncoder().encode(
            "x402-payment-v2",
          ),

        suggestedParams: {
          ...suggestedParams,

          fee: 0,

          flatFee: true,
        },
      },
    );

  /*
   * IMPORTANT:
   *
   * Create the atomic group BEFORE
   * sending anything to Pera.
   */

  algosdk.assignGroupID([
    feePayerTxn,
    paymentTxn,
  ]);

  /*
   * IMPORTANT FIX:
   *
   * Send BOTH transactions to Pera.
   *
   * Transaction 0:
   *   signers: [] = Pera must NOT sign it.
   *
   * Transaction 1:
   *   signers: [account] = Pera signs it.
   *
   * Pera therefore sees the complete group
   * and can validate the group ID.
   */

  const signedTxns =
    await peraWallet.signTransaction([
      [
        {
          txn: feePayerTxn,
          signers: [],
        },

        {
          txn: paymentTxn,
          signers: [account],
        },
      ],
    ]);

  if (!signedTxns) {
    throw new Error(
      "Pera Wallet did not return a signing result.",
    );
  }

  /*
   * ARC-0025 requires the returned array
   * to correspond to the original group.
   *
   * Index 0:
   *   null because Pera did not sign
   *   the fee-payer transaction.
   *
   * Index 1:
   *   signed user payment transaction.
   */

  const signedPaymentTxn =
  signedTxns[0];

if (!signedPaymentTxn) {
  throw new Error(
    "Pera Wallet did not return the signed USDC payment transaction.",
  );
}

  /*
   * The fee-payer transaction remains
   * unsigned. The facilitator signs it
   * during settlement.
   */

  const unsignedFeePayerTxn =
    algosdk.encodeUnsignedTransaction(
      feePayerTxn,
    );

  /*
   * Build x402 payment payload.
   */

  const paymentPayload = {
    x402Version: 2,

    scheme:
      requirements.scheme,

    network:
      requirements.network,

    resource:
      paymentRequired.resource,

    accepted:
      requirements,

    extensions:
      paymentRequired.extensions || {},

    payload: {
      paymentGroup: [
        bytesToBase64(
          unsignedFeePayerTxn,
        ),

        bytesToBase64(
          signedPaymentTxn,
        ),
      ],

      paymentIndex: 1,
    },
  };

  return encodeBase64Json(
    paymentPayload,
  );
}

function App() {
  const [account, setAccount] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState(null);

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

      const accounts =
        await peraWallet.connect();

      if (!accounts?.length) {
        throw new Error(
          "No Pera account was returned.",
        );
      }

      setAccount(accounts[0]);
    } catch (err) {
      setError(
        err?.message || String(err),
      );
    }
  };

  const disconnectWallet = () => {
    peraWallet.disconnect();
    setAccount(null);
  };

  const pay = async () => {
    if (!account) {
      setError(
        "Connect Pera Wallet first.",
      );
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      /*
       * STEP 1
       * Request payment requirements.
       */

      setError(
        "Getting payment requirements...",
      );

      const firstResponse =
        await fetch(
          TRUST402_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "text/plain;charset=UTF-8",
            },

            body: JSON.stringify({
              target:
                "TEST-AGENT",
            }),
          },
        );

      if (
        firstResponse.status !==
        402
      ) {
        const body =
          await firstResponse.text();

        throw new Error(
          `Expected HTTP 402, got ${firstResponse.status}\n\n${body}`,
        );
      }

      /*
       * STEP 2
       * Decode PAYMENT-REQUIRED.
       */

      const paymentRequired =
        await getPaymentRequired(
          firstResponse,
        );

      /*
       * STEP 3
       * Build and sign payment.
       */

      setError(
        "Payment required. Opening Pera Wallet...",
      );

      const paymentSignature =
        await createPayment(
          paymentRequired,
          account,
        );

      /*
       * STEP 4
       * Submit signed payment.
       */

      setError(
        "Payment signed. Submitting payment...",
      );

      const paidResponse =
        await fetch(
          TRUST402_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "text/plain;charset=UTF-8",

              "PAYMENT-SIGNATURE":
                paymentSignature,
            },

            body: JSON.stringify({
              target:
                "TEST-AGENT",
            }),
          },
        );

      const paidBody =
        await paidResponse.text();

      if (!paidResponse.ok) {
        throw new Error(
          `Paid request failed: HTTP ${paidResponse.status}\n\n${paidBody}`,
        );
      }

      /*
       * STEP 5
       * Display Trust402 report.
       */

      let parsedBody;

      try {
        parsedBody =
          JSON.parse(
            paidBody,
          );
      } catch {
        parsedBody =
          paidBody;
      }

      setResult(
        parsedBody,
      );

      setError(null);
    } catch (err) {
      setError(
        err?.message ||
          String(err),
      );
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
          <button
            onClick={
              connectWallet
            }
          >
            Connect Pera Wallet
          </button>
        ) : (
          <>
            <div className="wallet">
              <strong>
                Connected wallet
              </strong>

              <span>
                {account}
              </span>
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
              onClick={
                disconnectWallet
              }
              disabled={loading}
            >
              Disconnect
            </button>
          </>
        )}

        {error && (
          <div className="error">
            <strong>
              Payment failed
            </strong>

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