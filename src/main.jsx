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
const pay = async () => {
  if (!account) {
    setError("Connect Pera Wallet first.");
    return;
  }

  setLoading(true);
  setResult(null);
  setError(null);

  try {
    // STEP 1 — request payment requirements
    const firstResponse = await fetch(
      TRUST402_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/plain;charset=UTF-8",
        },
        body: JSON.stringify({
          target: "TEST-AGENT",
        }),
      },
    );

    if (firstResponse.status !== 402) {
      const body =
        await firstResponse.text();

      throw new Error(
        `Expected HTTP 402, got ${firstResponse.status}\n\n${body}`,
      );
    }

    // STEP 2 — read PAYMENT-REQUIRED
    const paymentRequired =
      await getPaymentRequired(
        firstResponse,
      );

    // STEP 3 — create and sign payment
    setError(
      "Payment required. Opening Pera Wallet...",
    );

    const paymentSignature =
      await createPayment(
        paymentRequired,
        account,
      );

    // STEP 4 — retry with payment
    setError(
      "Payment signed. Submitting payment...",
    );

    const paidResponse = await fetch(
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
          target: "TEST-AGENT",
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

    setResult(
      JSON.parse(paidBody),
    );

    setError(null);
  } catch (err) {
    setError(
      err?.message || String(err),
    );
  } finally {
    setLoading(false);
  }
};

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
    setError("Connect Pera Wallet first.");
    return;
  }

  setLoading(true);
  setResult(null);
  setError(null);

  try {
    setError("Testing POST /v1/trust...");

    let firstResponse;

    try {
      firstResponse = await fetch(
        TRUST402_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "text/plain;charset=UTF-8",
          },
          body: JSON.stringify({
            target: "TEST-AGENT",
          }),
        },
      );
    } catch (err) {
      throw new Error(
        "POST /v1/trust FAILED:\n\n" +
          String(err?.message || err),
      );
    }

    const rawPaymentHeader =
      firstResponse.headers.get(
        "PAYMENT-REQUIRED",
      );

    const allHeaders = {};

    firstResponse.headers.forEach(
      (value, key) => {
        allHeaders[key] = value;
      },
    );

    const responseBody =
      await firstResponse.text();

    throw new Error(
      "TRUST402 RESPONSE\n\n" +
        `HTTP STATUS: ${firstResponse.status}\n\n` +
        `PAYMENT-REQUIRED: ${
          rawPaymentHeader
            ? "PRESENT"
            : "MISSING"
        }\n\n` +
        "HEADERS:\n" +
        JSON.stringify(
          allHeaders,
          null,
          2,
        ) +
        "\n\nBODY:\n" +
        responseBody,
    );
  } catch (err) {
    setError(
      err?.message || String(err),
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
            onClick={connectWallet}
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
              onClick={disconnectWallet}
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