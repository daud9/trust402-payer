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

const USDC_ASSET_ID = "31566704";

/*
 * --------------------------------------------------
 * BASE64 HELPERS
 * --------------------------------------------------
 */

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

/*
 * --------------------------------------------------
 * PAYMENT REQUIRED
 * --------------------------------------------------
 */

async function getPaymentRequired(response) {
  const header =
    response.headers.get(
      "PAYMENT-REQUIRED",
    );

  if (!header) {
    throw new Error(
      "Trust402 did not return a PAYMENT-REQUIRED header.",
    );
  }

  return decodeBase64Json(header);
}

/*
 * --------------------------------------------------
 * CREATE X402 PAYMENT
 * --------------------------------------------------
 */

async function createPayment(
  paymentRequired,
  account,
) {
  /*
   * Find Algorand exact payment requirement.
   */

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

  /*
   * Validate USDC.
   */

  if (
    String(requirements.asset) !==
    USDC_ASSET_ID
  ) {
    throw new Error(
      `Unexpected payment asset: ${requirements.asset}`,
    );
  }

  /*
   * Payment amount is in atomic USDC units.
   * 0.05 USDC = 50000.
   */

  const amount = BigInt(
    requirements.amount,
  );

  /*
   * Algod connection.
   */

  const algod =
    new algosdk.Algodv2(
      "",
      ALGOD_URL,
      "",
    );

  const suggestedParams =
    await algod
      .getTransactionParams()
      .do();

  /*
   * Facilitator fee-payer address.
   */

  const feePayer =
    requirements.extra?.feePayer;

  /*
   * ------------------------------------------------
   * SIMPLE PAYMENT
   * ------------------------------------------------
   *
   * Used only if the facilitator does
   * not provide a feePayer.
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
            BigInt(
              requirements.asset,
            ),

          suggestedParams,
        },
      );

    /*
     * Single transaction still needs
     * its own group ID.
     */

    algosdk.assignGroupID([
      paymentTxn,
    ]);

    /*
     * Pera signs the payment.
     */

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
        paymentRequired.extensions ||
        {},

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
   * ------------------------------------------------
   * FEE-ABSTRACTED PAYMENT
   * ------------------------------------------------
   *
   * Transaction 0:
   * Facilitator fee-payer transaction.
   *
   * Transaction 1:
   * User USDC transfer.
   *
   * The current x402 Algorand specification
   * requires the fee-payer transaction to omit
   * the "amt" field completely.
   */

  const minFee =
    Number(
      suggestedParams.minFee ||
        suggestedParams.fee ||
        1000,
    );

  /*
   * -----------------------------------------------
   * TRANSACTION 0
   * FACILITATOR FEE-PAYER
   * -----------------------------------------------
   *
   * IMPORTANT:
   *
   * There is intentionally NO:
   *
   *     amount: 0
   *
   * here.
   *
   * The Algorand x402 verifier requires the
   * amount field to be omitted.
   */

  const feePayerTxn =
    algosdk.makePaymentTxnWithSuggestedParamsFromObject(
      {
        sender: feePayer,

        receiver: feePayer,

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
   * -----------------------------------------------
   * TRANSACTION 1
   * USER USDC PAYMENT
   * -----------------------------------------------
   */

  const paymentTxn =
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
      {
        sender: account,

        receiver:
          requirements.payTo,

        amount,

        assetIndex:
          BigInt(
            requirements.asset,
          ),

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
   * -----------------------------------------------
   * ATOMIC GROUP
   * -----------------------------------------------
   *
   * Transaction 0 = fee payer
   * Transaction 1 = USDC payment
   */

  algosdk.assignGroupID([
    feePayerTxn,
    paymentTxn,
  ]);

  /*
   * -----------------------------------------------
   * PERA SIGNING
   * -----------------------------------------------
   *
   * Pera receives BOTH transactions so that
   * it can validate the atomic group ID.
   *
   * Pera signs ONLY transaction 1.
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
   * Pera returns the signed transaction
   * that it actually signed.
   *
   * Because transaction 0 has signers: [],
   * the signed USDC transaction is index 0
   * in Pera's returned signed transaction array.
   */

  const signedPaymentTxn =
    signedTxns[0];

  if (!signedPaymentTxn) {
    throw new Error(
      "Pera Wallet did not return the signed USDC payment transaction.",
    );
  }

  /*
   * -----------------------------------------------
   * ENCODE FEE-PAYER TRANSACTION
   * -----------------------------------------------
   *
   * It remains unsigned.
   *
   * GoPlausible signs this transaction during
   * facilitator verification/settlement.
   */

  const unsignedFeePayerTxn =
    algosdk.encodeUnsignedTransaction(
      feePayerTxn,
    );

  /*
   * -----------------------------------------------
   * X402 PAYMENT PAYLOAD
   * -----------------------------------------------
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
      paymentRequired.extensions ||
      {},

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

  /*
   * Debug information in browser console.
   */

  console.log(
    "TRUST402 PAYMENT PAYLOAD:",
    paymentPayload,
  );

  return encodeBase64Json(
    paymentPayload,
  );
}

/*
 * --------------------------------------------------
 * APP
 * --------------------------------------------------
 */

function App() {
  const [account, setAccount] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState(null);

  /*
   * Reconnect Pera session.
   */

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

  /*
   * Connect wallet.
   */

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
        err?.message ||
          String(err),
      );
    }
  };

  /*
   * Disconnect wallet.
   */

  const disconnectWallet = () => {
    peraWallet.disconnect();

    setAccount(null);
  };

  /*
   * ------------------------------------------------
   * PAY
   * ------------------------------------------------
   */

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

      console.log(
        "TRUST402 PAYMENT-REQUIRED:",
        paymentRequired,
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

      /*
       * --------------------------------------------
       * PAYMENT FAILURE
       * --------------------------------------------
       */

      if (!paidResponse.ok) {
        const paymentResponse =
          paidResponse.headers.get(
            "PAYMENT-RESPONSE",
          );

        let diagnostic =
          "";

        if (paymentResponse) {
          try {
            diagnostic =
              "\n\nPAYMENT-RESPONSE:\n" +
              JSON.stringify(
                decodeBase64Json(
                  paymentResponse,
                ),
                null,
                2,
              );
          } catch {
            diagnostic =
              "\n\nPAYMENT-RESPONSE:\n" +
              paymentResponse;
          }
        }

        throw new Error(
          `Paid request failed: HTTP ${paidResponse.status}\n\nBODY:\n${paidBody}${diagnostic}`,
        );
      }

      /*
       * STEP 5
       * Parse Trust402 report.
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
      console.error(
        "TRUST402 PAYMENT ERROR:",
        err,
      );

      setError(
        err?.message ||
          String(err),
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ------------------------------------------------
   * UI
   * ------------------------------------------------
   */

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

            <p>
              {error}
            </p>
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