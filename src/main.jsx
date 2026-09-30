import React, { useRef, useState } from "react";
import ReactDOM from "react-dom/client";

const ENDPOINT = "https://trust402.daud9.deno.net/v1/trust";
const NET_PREFIX = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k";
const USDC = "31566704";
const MAX = 50000n;
const PROOF_TX = "XANHY3LI5NUTB37EWXTLRNCPU4STI4XSXSIV2C3NOCQEZOFG4GZA";
const EXAMPLES = ["TEST-AGENT", "https://example.com", "VO66SCWROBJOXOCWQ2IB3YAM3DIFP4CVKDEB73S2BNLISMVFT4VEQTEPHM"];

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

function App() {
  const [target, setTarget] = useState("TEST-AGENT");
  const [addr, setAddr] = useState("");
  const [terms, setTerms] = useState(null);
  const [result, setResult] = useState(null);
  const [tx, setTx] = useState("");
  const [log, setLog] = useState([]);
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState(false);
  const wallet = useRef(null);

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
      const r = await fetch(ENDPOINT, body());
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

  async function connect() {
    setBusy(true);
    say("Loading Pera wallet…");
    try {
      const m = await import("@txnlab/use-wallet-react");
      const mgr = new m.WalletManager({ wallets: [{ id: "pera" }], defaultNetwork: "mainnet" });
      const w = mgr.wallets.find((x) => x.id === "pera");
      await w.connect();
      wallet.current = w;
      setAddr(w.activeAccount?.address || w.accounts?.[0]?.address || "");
      say("Wallet connected.", "ok");
    } catch (e) {
      say("Wallet could not load: " + (e?.message || e), "err");
    }
    setBusy(false);
  }

  async function disconnect() {
    try { await wallet.current?.disconnect(); } catch {}
    wallet.current = null;
    setAddr("");
  }

  async function pay() {
    if (!wallet.current || !addr) return say("Connect your wallet first.", "err");
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
        say("Approve the $0.05 USDC payment in Pera…");
        res = await client.fetch(ENDPOINT, opts);
      } else {
        const first = await fetch(ENDPOINT, opts);
        if (first.status !== 402) res = first;
        else {
          const http = new x402HTTPClient(client);
          let b;
          try { b = await first.clone().json(); } catch {}
          const req = http.getPaymentRequiredResponse((n) => first.headers.get(n), b);
          say("Approve the $0.05 USDC payment in Pera…");
          const payload = await http.createPaymentPayload(req);
          say("Signed. Settling on Algorand MainNet…");
          res = await fetch(ENDPOINT, { ...opts, headers: { ...opts.headers, ...http.encodePaymentSignatureHeader(payload) } });
        }
      }
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${data?.error || text.slice(0, 120)}`);
      const rc = res.headers.get("PAYMENT-RESPONSE");
      if (rc) { try { setTx(JSON.parse(atob(rc)).transaction || ""); } catch {} }
      setResult(data);
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
      <div className="brand">
        <div className="logo">T</div>
        <div>
          <h1>Trust402</h1>
          <p className="sub">Pay-per-request trust &amp; risk checks for AI agents</p>
        </div>
      </div>
      <div className="badges">
        <span className="badge g">$0.05 USDC / call</span>
        <span className="badge">Algorand MainNet</span>
        <span className="badge">x402 · GoPlausible</span>
      </div>
      <div className="steps">
        {["Terms", "Connect", "Pay", "Report"].map((s, i) => (
          <div key={s} className={"step " + (step === i + 1 ? "on" : step > i + 1 ? "done" : "")}>{i + 1}. {s}</div>
        ))}
      </div>

      <div className="card">
        <h3>1 · Target to assess</h3>
        <input value={target} maxLength={200} onChange={(e) => setTarget(e.target.value)} placeholder="Agent, wallet, API or website" />
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
          <button className="pri" disabled={busy} onClick={connect}>Connect Pera Wallet</button>
        ) : (
          <>
            <div className="row"><span>Connected</span><b>{short(addr)}</b></div>
            <button className="pri" disabled={busy} onClick={pay}>{busy ? "Processing…" : "Pay $0.05 & get Trust Report"}</button>
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
            </>
          ) : <pre>{JSON.stringify(result, null, 2)}</pre>}
          <button className="sec" onClick={() => setRaw(!raw)}>{raw ? "Hide" : "Show"} raw JSON</button>
          {raw && <pre style={{ marginTop: 10 }}>{JSON.stringify(result, null, 2)}</pre>}
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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
