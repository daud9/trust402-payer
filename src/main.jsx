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
        item.network ===
          "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k",
    );

  if (!requirements) {
    throw new Error(
      "No compatible Algorand MainNet payment requirement was returned.",
    );
  }

  if (requirements.asset !== "31566704") {
    throw new Error(
      `Unexpected payment asset: ${requirements.asset}`,
    );
  }

  const amount = BigInt(requirements.amount);

  const algod = new algosdk.Algodv2(
    "",
    ALGOD_URL,
    "",
  );

  const suggestedParams =
    await algod
      .getTransactionParams()
      .do();

  const transaction =
    algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(
      {
        sender: account,
        receiver: requirements.payTo,
        amount,
        assetIndex: BigInt(requirements.asset),
        suggestedParams,
      },
    );

  algosdk.assignGroupID([transaction]);

  const signedTxns =
  await peraWallet.signTransaction([
    [
      {
        txn: transaction,
        signers: [account],
      },
    ],
  ]);

  if (!signedTxns?.length) {
    throw new Error(
      "Pera Wallet did not return a signed transaction.",
    );
  }

const signedTxn = signedTxns[0];

  const paymentPayload = {
  x402Version: 2,
  scheme: requirements.scheme,
  network: requirements.network,
  resource: paymentRequired.resource,
  accepted: requirements,
  payload: {
    paymentIndex: 0,
    paymentGroup: [
      bytesToBase64(signedTxn),
    ],
  },
  extensions:
    paymentRequired.extensions || {},
  outputSchema:
    paymentRequired.outputSchema || null,
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
    setError("Connect Pera Wallet first.");
    return;
  }

  setLoading(true);
  setResult(null);
  setError(null);

  try {
    // STEP 1: Request payment requirements
    setError("Testing POST /v1/trust...");

let firstResponse;

try {
  firstResponse = await fetch(
    TRUST402_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
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

const paymentHeader =
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
  `TRUST402 RESPONSE\n\n` +
  `HTTP STATUS: ${firstResponse.status}\n\n` +
  `PAYMENT-REQUIRED: ${
    paymentHeader
      ? "PRESENT"
      : "MISSING"
  }\n\n` +
  `HEADERS:\n${JSON.stringify(
    allHeaders,
    null,
    2,
  )}\n\n` +
  `BODY:\n${responseBody}`,
);

    // STEP 2: Read payment requirements
    let paymentRequired;

    try {
      paymentRequired =
        await getPaymentRequired(firstResponse);
    } catch (err) {
      throw new Error(
        "STEP 2 FAILED: Could not read PAYMENT-REQUIRED header.\n\n" +
        String(err?.message || err),
      );
    }

    setError(
      "Step 2 successful.\n\n" +
      "Building Algorand payment...",
    );

    // STEP 3: Build/sign payment
    let paymentHeader;

    try {
      paymentHeader =
        await createPayment(
          paymentRequired,
          account,
        );
    } catch (err) {
      throw new Error(
        "STEP 3 FAILED: Could not create/sign payment.\n\n" +
        String(err?.message || err),
      );
    }

    setError(
      "Step 3 successful.\n\n" +
      "Sending paid request to Trust402...",
    );

    // STEP 4: Send paid request
    let paidResponse;

    try {
      paidResponse = await fetch(
        TRUST402_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "PAYMENT-SIGNATURE":
              paymentHeader,
          },
          body: JSON.stringify({
            target: "TEST-AGENT",
          }),
        },
      );
    } catch (err) {
      throw new Error(
        "STEP 4 FAILED: Paid request could not reach Trust402.\n\n" +
        String(err?.message || err),
      );
    }

    const responseText =
      await paidResponse.text();

    let data = null;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    if (!paidResponse.ok) {
      const paymentRequiredError =
        paidResponse.headers.get(
          "PAYMENT-REQUIRED",
        );

      const paymentResponse =
        paidResponse.headers.get(
          "PAYMENT-RESPONSE",
        );

      let errorDetails =
        responseText || "{}";

      if (paymentRequiredError) {
        try {
          const decodedError =
            decodeBase64Json(
              paymentRequiredError,
            );

          errorDetails =
            JSON.stringify(
              decodedError,
              null,
              2,
            );
        } catch {
          errorDetails =
            paymentRequiredError;
        }
      }

      throw new Error(
        `STEP 4 RESPONSE: HTTP ${paidResponse.status}\n\n` +
        `x402 error:\n${errorDetails}\n\n` +
        `PAYMENT-RESPONSE:\n${
          paymentResponse || "none"
        }`,
      );
    }

    setResult(data);
    setError(null);
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