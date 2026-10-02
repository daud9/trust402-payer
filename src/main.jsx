import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import Landing, { Footer } from "./Landing.jsx";

const BASE = "https://trust402.daud9.deno.net";
const TIERS = [
  { id: "basic", label: "Basic", price: "$0.05", path: "/v1/trust", blurb: "Core wallet / web checks" },
  { id: "advanced", label: "Advanced", price: "$0.20", path: "/v1/trust/advanced", blurb: "+ flow, counterparties, velocity, holdings, domain expiry" },
];
const NET_PREFIX = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k";
const USDC = "31566704";
const MAX = 250000n; // up to 0.25 USDC per call
const PROOF_TX = "XANHY3LI5NUTB37EWXTLRNCPU4STI4XSXSIV2C3NOCQEZOFG4GZA";
const EXAMPLES = ["VO66SCWROBJOXOCWQ2IB3YAM3DIFP4CVKDEB73S2BNLISMVFT4VEQTEPHM", "https://example.com", "https://trust402.daud9.deno.net/v1/trust"];
const kindOf = (t = "") => {
  t = t.trim();
  if (/^[A-Z2-7]{58}$/.test(t)) return "Algorand wallet";
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.algo$/i.test(t)) return "NFD name";
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : "https://" + t);
    if (u.hostname.includes(".") && !/^[\d.]+$/.test(u.hostname)) return "Website / API";
  } catch {}
  return null;
};

const css = `
*{box-sizing:border-box}body{margin:0;background:#070b14;color:#e6ebf5;font-family:system-ui,sans-serif}
.wrap{max-width:560px;margin:0 auto;padding:18px 14px 60px}
.brand{display:flex;gap:12px;align-items:center;margin:8px 0 14px}
.logo{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#19d3a2,#3b82f6);display:grid;place-items:center;font-weight:800;font-size:22px;color:#04101a}
h1{margin:0;font-size:22px}.sub{margin:2px 0 0;color:#8fa0bd;font-size:13px}
.card{background:#0e1526;border:1px solid #1d2a44;border-radius:16px;padding:16px;margin-bottom:14px}
.card h3{margin:0 0 10px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8fa0bd}
.badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.badge{font-size:12px;padding:5px 10px;border-radius:999px;background:#12203a;border:1px solid #223559;color:#b9c6e0}
.badge.g{color:#19d3a2;border-color:#14614f;background:#0b2a24}
.steps{display:flex;gap:6px;margin-bottom:14px}
.step{flex:1;text-align:center;font-size:11px;padding:7px 2px;border-radius:8px;background:#0e1526;border:1px solid #1d2a44;color:#6c7d9c}
.step.on{color:#04101a;background:#19d3a2;border-color:#19d3a2;font-weight:700}
.step.done{color:#19d3a2;border-color:#14614f}
button{width:100%;padding:13px;border-radius:12px;border:0;font-size:15px;font-weight:700;cursor:pointer;margin-top:10px}
.pri{background:linear-gradient(135deg,#19d3a2,#3b82f6);color:#04101a}
.sec{background:#12203a;color:#cfe0ff;border:1px solid #223559}
button:disabled{opacity:.5}
input{width:100%;padding:12px;border-radius:10px;border:1px solid #223559;background:#0a1120;color:#e6ebf5;font-size:14px}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.chip{font-size:11px;padding:4px 8px;border-radius:8px;background:#12203a;border:1px solid #223559;color:#9fb3d6;cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #16223a;font-size:13px}
.row:last-child{border:0}.row span{color:#8fa0bd}.row b{text-align:right;word-break:break-all;font-weight:600}
.log{font-family:ui-monospace,monospace;font-size:12px;color:#9fb3d6;line-height:1.7}
.err{color:#ff8a8a}.ok{color:#19d3a2}
.score{display:flex;align-items:baseline;gap:6px}.score b{font-size:54px}.score span{color:#8fa0bd}
.bar{height:8px;border-radius:6px;background:#16223a;overflow:hidden;margin:8px 0 12px}.bar i{display:block;height:100%}
.risk{display:inline-block;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase}
a{color:#5fb0ff}pre{white-space:pre-wrap;word-break:break-all;font-size:11px;color:#9fb3d6;margin:0}
`;
const short = (a = "") => (a.length > 14 ? a.slice(0, 6) + "…" + a.slice(-6) : a);
const riskColor = (r = "") =>
  /low/i.test(r) ? ["#0b2a24", "#19d3a2"] : /high|crit/i.test(r) ? ["#33141a", "#ff6b6b"] : ["#33290f", "#ffc857"];

const policy = (_v, reqs) =>
  reqs.filter((r) => {
    try {
      const a = BigInt(r.amount ?? r.maxAmountRequired ?? "0");
      return String(r.network).startsWith(NET_PREFIX) && String(r.asset) === USDC && a > 0n && a <= MAX;
    } catch {
      return false;
    }
  });

if (typeof document !== "undefined" && !document.querySelector('meta[name="name"]')) {
  const m = document.createElement("meta");
  m.name = "name";
  m.content = "Trust402";
  document.head.appendChild(m); // app name shown in Pera's connect sheet
}

const ADAPTERS = [
  { id: "pera", name: "Pera", load: async () => (await import("@txnlab/use-wallet-pera")).pera() },
  { id: "defly", name: "Defly", load: async () => (await import("@txnlab/use-wallet-defly")).defly() },
  { id: "lute", name: "Lute", load: async () => (await import("@galaxypay/use-wallet-lute")).lute({ siteName: "Trust402" }) },
  { id: "exodus", name: "Exodus", load: async () => (await import("@txnlab/use-wallet-exodus")).exodus() },
  { id: "kibisis", name: "Kibisis", load: async () => (await import("@txnlab/use-wallet-kibisis")).kibisis() },
];

// One manager for every wallet that loads. If one adapter package fails, the others still work.
let _mgr = null;
async function getManager() {
  if (_mgr) return _mgr;
  const { WalletManager } = await import("@txnlab/use-wallet-react");
  const list = inWallet ? ADAPTERS.filter((x) => x.id === inWallet) : ADAPTERS;
  const loaded = await Promise.allSettled(list.map((x) => x.load()));
  const wallets = loaded.filter((r) => r.status === "fulfilled").map((r) => r.value);
  const mgr = new WalletManager({ wallets, defaultNetwork: "mainnet" });
  try { await mgr.resumeSessions?.(); } catch {}
  _mgr = mgr;
  return mgr;
}
const addrOf = (w) => w?.activeAccount?.address || w?.accounts?.[0]?.address || "";
const detectWallet = () => {
  if (typeof window === "undefined") return null;
  const ua = navigator.userAgent || "";
  if (window.exodus?.algorand) return "exodus";
  if (/defly/i.test(ua) || window.deflyWallet) return "defly";
  if (/pera/i.test(ua)) return "pera";
  return null;
};
const inWallet = detectWallet();
const inPera = inWallet === "pera";
const walletName = (id) => ADAPTERS.find((x) => x.id === id)?.name || "wallet";
const chromeUrl = () => {
  const u = location.href;
  return /android/i.test(navigator.userAgent)
    ? `intent://${u.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.android.chrome;end`
    : u.replace(/^https?:/, "googlechrome:");
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function App() {
  const [target, setTarget] = useState(EXAMPLES[0]);
  const [addr, setAddr] = useState("");
  const [terms, setTerms] = useState(null);
  const [result, setResult] = useState(null);
  const [tx, setTx] = useState("");
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState(false);
  const [hist, setHist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("t402_hist") || "[]"); } catch { return []; }
  });
  const saveHist = (t, s, r) => {
    const prev = hist.find((h) => h.t === t);
    const next = [{ t, s, r, d: prev ? s - prev.s : null, at: Date.now() }, ...hist.filter((h) => h.t !== t)].slice(0, 8);
    setHist(next);
    try { localStorage.setItem("t402_hist", JSON.stringify(next)); } catch {}
  };
  const wallet = useRef(null);
  const [tier, setTier] = useState("basic");
  const T = TIERS.find((x) => x.id === tier);
  const endpoint = BASE + T.path;

  const say = (m, c = "") => setLog((l) => [...l.slice(-7), { m, c }]);
  const step = result ? 4 : busy ? 3 : addr ? 2 : terms ? 1 : 0;
  const body = () => ({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target: target.trim().slice(0, 200) }),
  });

  async function preview() {
    setBusy(true);
    say("Requesting payment terms (no payment yet)…");
    try {
      const r = await fetch(endpoint, body());
      const h = r.headers.get("PAYMENT-REQUIRED");
      if (r.status !== 402 || !h) throw new Error("Endpoint did not return a 402 challenge.");
      const pr = JSON.parse(atob(h));
      setTerms({ ...pr.accepts[0], description: pr.resource?.description });
      say("HTTP 402 Payment Required received.", "ok");
    } catch (e) {
      say(e.message, "err");
    }
    setBusy(false);
  }

  async function connect(id) {
    const name = ADAPTERS.find((x) => x.id === id)?.name || "wallet";
    setBusy(true);
    say(`Opening ${name}…`);
    try {
      const mgr = await getManager();
      const w = mgr.wallets.find((x) => x.id === id);
      if (!w) throw new Error(`${name} is not available in this browser. Try another wallet.`);
      if (!addrOf(w)) {
        try { await w.connect(); } catch { /* modal closed or pairing hiccup: check below */ }
        if (!addrOf(w)) say(`Waiting for approval in ${name}…`);
        for (let i = 0; i < 10 && !addrOf(w); i++) await sleep(750);
      }
      const a = addrOf(w);
      if (!a) throw new Error(`Not connected yet. Tap ${name} again and approve in the wallet.`);
      wallet.current = w;
      setAddr(a);
      say(`${name} connected.`, "ok");
    } catch (e) {
      say(e?.message || String(e), "err");
    }
    setBusy(false);
  }

  // Restore an existing session on load, and whenever the user comes back from the Pera app.
  useEffect(() => {
    if (inWallet) { connect(inWallet); return undefined; }
    let live = true;
    const sync = async () => {
      try {
        const mgr = await getManager();
        const w = mgr.activeWallet || mgr.wallets.find((x) => addrOf(x));
        const a = addrOf(w);
        if (live && a) { wallet.current = w; setAddr(a); }
      } catch {}
    };
    sync();
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { live = false; document.removeEventListener("visibilitychange", onVis); };
  }, []);

  async function disconnect() {
    try { await wallet.current?.disconnect(); } catch {}
    wallet.current = null;
    setAddr("");
  }

  async function pay() {
    if (!wallet.current || !addr) return say("Connect your wallet first.", "err");
    if (!kindOf(target)) return say("Enter an Algorand address, .algo name or website URL. Nothing was charged.", "err");
    setBusy(true);
    setResult(null);
    setTx("");
    try {
      say("Preparing payment client…");
      const { x402Client, x402HTTPClient } = await import("@x402/core/client");
      const { ExactAvmScheme } = await import("@x402/avm/exact/client");
      const signer = {
        address: addr,
        signTransactions: (t, i) => wallet.current.signTransactions(t, i),
      };
      const client = new x402Client();
      client.register("algorand:*", new ExactAvmScheme(signer));
      if (client.registerPolicy) client.registerPolicy(policy);

      let res;
      const opts = body();
      if (typeof client.fetch === "function") {
        say("Approve the payment in your wallet…");
        res = await client.fetch(endpoint, opts);
      } else {
        const first = await fetch(endpoint, opts);
        if (first.status !== 402) res = first;
        else {
          const http = new x402HTTPClient(client);
          let b;
          try { b = await first.clone().json(); } catch {}
          const req = http.getPaymentRequiredResponse((n) => first.headers.get(n), b);
          say("Approve the payment in your wallet…");
          const payload = await http.createPaymentPayload(req);
          say("Signed. Settling on Algorand MainNet…");
          res = await fetch(endpoint, { ...opts, headers: { ...opts.headers, ...http.encodePaymentSignatureHeader(payload) } });
        }
      }
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) {
        let why = data?.error || text.slice(0, 120);
        const ph = res.headers.get("PAYMENT-REQUIRED");
        if (ph) { try { why = JSON.parse(atob(ph)).error || why; } catch {} }
        throw new Error(`HTTP ${res.status}: ${String(why).slice(0, 220)}`);
      }
      const rc = res.headers.get("PAYMENT-RESPONSE");
      if (rc) { try { setTx(JSON.parse(atob(rc)).transaction || ""); } catch {} }
      setResult(data);
      if (data.trust_score != null) saveHist(String(data.target || target), Number(data.trust_score), data.risk_level);
      say("Payment settled. Trust report received.", "ok");
    } catch (e) {
      const m = e?.message || String(e);
      say(/reject|cancel|declin/i.test(m) ? "Signature cancelled in Pera." : m, "err");
    }
    setBusy(false);
  }

  const score = Number(result?.trust_score);
  const [rbg, rfg] = riskColor(result?.risk_level);

  return (
    <div className="wrap">
      <style>{css}</style>
      <h2 style={{ textAlign: "center", margin: "4px 0 4px", fontSize: 26 }}>Run a trust check</h2>
      <p className="sub" style={{ textAlign: "center", margin: "0 0 14px" }}>Pick a target, connect your Algorand wallet and pay per report. Basic $0.05 · Advanced $0.20 · USDC on MainNet.</p>
      <div className="steps">
        {["Terms", "Connect", "Pay", "Report"].map((s, i) => (
          <div key={s} className={"step " + (step === i + 1 ? "on" : step > i + 1 ? "done" : "")}>{i + 1}. {s}</div>
        ))}
      </div>

      <div className="card">
        <h3>1 · Target to assess</h3>
        <input value={target} maxLength={200} onChange={(e) => setTarget(e.target.value)} placeholder="Agent, wallet, API or website" />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {TIERS.map((x) => (
            <div key={x.id} onClick={() => setTier(x.id)} style={{ flex: 1, padding: 10, borderRadius: 12, cursor: "pointer", border: "1px solid " + (tier === x.id ? "#19d3a2" : "#223559"), background: tier === x.id ? "#0b2a24" : "#0a1120" }}>
              <b>{x.label} · {x.price}</b>
              <div className="sub" style={{ fontSize: 11, marginTop: 2 }}>{x.blurb}</div>
       </div>
          ))}
        </div>
        <div className="sub" style={{ marginTop: 8 }}>
          {kindOf(target) ? <span className="ok">✓ Detected: {kindOf(target)}</span> : <span className="err">⚠ Needs an Algorand address, .algo name or website URL</span>}
        </div>
        <div className="chips">
          {EXAMPLES.map((x) => <span key={x} className="chip" onClick={() => setTarget(x)}>{x}</span>)}
        </div>
        <button className="sec" disabled={busy} onClick={preview}>Preview payment terms (free)</button>
      </div>

      {terms && (
        <div className="card">
          <h3>Live 402 challenge</h3>
          <div className="row"><span>Price</span><b>{(Number(terms.amount) / 1e6).toFixed(2)} USDC</b></div>
          <div className="row"><span>Network</span><b>{String(terms.network).slice(0, 24)}…</b></div>
          <div className="row"><span>Pay to</span><b>{short(terms.payTo)}</b></div>
          <div className="row"><span>Asset</span><b>USDC (ASA {terms.asset})</b></div>
          <div className="row"><span>Challenge tag</span><b>{terms.extra?.tag}</b></div>
        </div>
      )}

      <div className="card">
        <h3>2 · Wallet &amp; payment</h3>
        {!addr ? (
          <>
            {inWallet ? (
              <>
                <div className="sub" style={{ marginBottom: 8 }}>{walletName(inWallet)} detected. Connecting with the wallet you are in:</div>
                <button className="pri" style={{ marginTop: 0 }} disabled={busy} onClick={() => connect(inWallet)}>
                  {busy ? "Connecting…" : `Connect with ${walletName(inWallet)}`}
                </button>
                <div className="sub" style={{ marginTop: 12 }}>
                  Some wallet browsers block connections from outside pages. If it does not connect after one try, open this page in Chrome or on desktop, where it connects reliably.
                </div>
                <button className="sec" onClick={() => { window.location.href = chromeUrl(); }}>Open in Chrome</button>
                <button className="sec" onClick={() => navigator.clipboard?.writeText(location.href)}>Copy page link</button>
              </>
            ) : (
              <>
                <div className="sub" style={{ marginBottom: 8 }}>Choose your Algorand wallet</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {ADAPTERS.map((x) => (
                    <button key={x.id} className="sec" style={{ marginTop: 0 }} disabled={busy} onClick={() => connect(x.id)}>
                      {busy ? "…" : x.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="row"><span>Connected</span><b>{short(addr)}</b></div>
            <button className="pri" disabled={busy || !kindOf(target)} onClick={pay}>{busy ? "Processing…" : `Pay ${T.price} · ${T.label} report`}</button>
            <button className="sec" disabled={busy} onClick={disconnect}>Disconnect</button>
          </>
        )}
        {log.length > 0 && (
          <div className="log" style={{ marginTop: 12 }}>
            {log.map((l, i) => <div key={i} className={l.c}>› {l.m}</div>)}
          </div>
        )}
      </div>

      {result && (
        <div className="card">
          <h3>Trust report</h3>
          {result.trust_score != null ? (
            <>
              <div className="score"><b>{result.trust_score}</b><span>/ 100</span></div>
              <div className="bar"><i style={{ width: Math.min(100, Math.max(0, score)) + "%", background: rfg }} /></div>
              <span className="risk" style={{ background: rbg, color: rfg }}>{result.risk_level} risk</span>
              <div style={{ marginTop: 12 }}>
                <div className="row"><span>Target</span><b>{short(String(result.target))}</b></div>
                <div className="row"><span>Identity</span><b>{result.identity?.status ?? "n/a"}</b></div>
                <div className="row"><span>Wallet</span><b>{result.wallet?.status ?? "n/a"}</b></div>
                <div className="row"><span>Reputation</span><b>{result.reputation?.status ?? "n/a"}</b></div>
                <div className="row"><span>Confidence</span><b>{result.confidence ?? "n/a"}</b></div>
                <div className="row"><span>Time</span><b>{result.timestamp ?? "n/a"}</b></div>
              </div>
              {result.warnings?.length > 0 && <div className="err" style={{ marginTop: 8 }}>{result.warnings.map(String).join(" · ")}</div>}
              {result.checks?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div className="sub" style={{ marginBottom: 4 }}>Checks run · {result.target_type}</div>
                  {result.checks.map((c, i) => (
                    <div key={i} className="row">
                      <span>{c.status === "pass" ? "✅" : c.status === "fail" ? "⛔" : c.status === "warn" ? "⚠️" : "ℹ️"} {c.name}</span>
                      <b style={{ fontWeight: 400, fontSize: 12, color: "#b9c6e0" }}>{c.detail}</b>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : <pre>{JSON.stringify(result, null, 2)}</pre>}
          <button className="sec" onClick={() => setRaw(!raw)}>{raw ? "Hide" : "Show"} raw JSON</button>
          {raw && <pre style={{ marginTop: 10 }}>{JSON.stringify(result, null, 2)}</pre>}
        </div>
      )}

      {hist.length > 0 && (
        <div className="card">
          <h3>Your recent scans</h3>
          {hist.map((h) => (
            <div key={h.t} className="row" style={{ cursor: "pointer" }} onClick={() => setTarget(h.t)}>
              <span>{short(h.t)}</span>
              <b>
                {h.s}/100 {h.d ? <em style={{ color: h.d > 0 ? "#19d3a2" : "#ff8a8a", fontStyle: "normal" }}>{h.d > 0 ? "▲" : "▼"}{Math.abs(h.d)}</em> : null}
              </b>
            </div>
          ))}
          <div className="sub" style={{ marginTop: 6 }}>Tap one to re-scan and track score changes.</div>
        </div>
      )}

      <div className="card">
        <h3>On-chain proof</h3>
        {tx && <div className="row"><span>This payment</span><b><a href={"https://allo.info/tx/" + tx} target="_blank" rel="noreferrer">{short(tx)}</a></b></div>}
        <div className="row"><span>Verified MainNet settlement</span><b><a href={"https://allo.info/tx/" + PROOF_TX} target="_blank" rel="noreferrer">{short(PROOF_TX)}</a></b></div>
        <div className="row"><span>Leaderboard</span><b><a href="https://facilitator.goplausible.xyz/dashboard/leaderboards" target="_blank" rel="noreferrer">GoPlausible</a></b></div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    <Landing>
      <div id="try"><App /></div>
    </Landing>
    <Footer />
  </>,
);
