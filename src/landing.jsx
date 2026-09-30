import React, { useEffect, useState } from "react";

const API = "https://trust402.daud9.deno.net";
const PAYTO = "VO66SCWROBJOXOCWQ2IB3YAM3DIFP4CVKDEB73S2BNLISMVFT4VEQTEPHM";
const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

const css = `
.land{max-width:1000px;margin:0 auto;padding:0 16px;color:#e6ebf5}
.land *{box-sizing:border-box}
.land button,.land a.l-btn{width:auto;margin:0;display:inline-block;text-decoration:none;text-align:center;padding:13px 22px;border-radius:12px;border:0;font-size:15px;font-weight:700;cursor:pointer}
.land .l-pri{background:linear-gradient(135deg,#19d3a2,#3b82f6);color:#04101a}
.land .l-sec{background:#12203a;color:#cfe0ff;border:1px solid #223559}
.l-nav{display:flex;justify-content:space-between;align-items:center;padding:14px 0;gap:10px;flex-wrap:wrap}
.l-logo{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.04em}
.l-logo i{width:32px;height:32px;border-radius:9px;background:linear-gradient(135deg,#19d3a2,#3b82f6);display:grid;place-items:center;color:#04101a;font-style:normal}
.l-nav nav{display:flex;gap:16px;font-size:14px}.l-nav nav a{color:#9fb3d6;text-decoration:none}
.l-hero{text-align:center;padding:36px 0 24px}
.l-hero h1{font-size:clamp(30px,8vw,54px);line-height:1.08;margin:0 0 14px;letter-spacing:-.02em}
.l-hero h1 em{font-style:normal;background:linear-gradient(135deg,#19d3a2,#5fb0ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.l-hero p{color:#9fb3d6;max-width:560px;margin:0 auto 18px;font-size:16px;line-height:1.55}
.l-price{display:inline-block;padding:6px 14px;border-radius:999px;background:#0b2a24;border:1px solid #14614f;color:#19d3a2;font-size:13px;margin-bottom:18px}
.l-cta{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.l-flow{display:flex;flex-direction:column;align-items:center;gap:4px;margin:26px auto 0;max-width:280px}
.l-flow b{width:100%;padding:9px;border-radius:10px;background:#0e1526;border:1px solid #1d2a44;font-size:12px;letter-spacing:.08em}
.l-flow s{text-decoration:none;color:#19d3a2;line-height:1}
.l-sec2{padding:34px 0}.l-sec2>h2{font-size:clamp(22px,5vw,30px);margin:0 0 6px;text-align:center}
.l-sub{color:#8fa0bd;text-align:center;margin:0 auto 20px;max-width:560px;line-height:1.5;font-size:15px}
.l-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
.l-card{background:#0e1526;border:1px solid #1d2a44;border-radius:16px;padding:16px}
.l-card h3{margin:0 0 6px;font-size:16px}.l-card p{margin:0;color:#9fb3d6;font-size:14px;line-height:1.5}
.l-n{color:#19d3a2;font-weight:800;font-size:12px;letter-spacing:.1em}
.l-stat b{display:block;font-size:30px}.l-stat span{color:#8fa0bd;font-size:12px}
.l-tabs{display:flex;gap:8px;justify-content:center;margin-bottom:12px;flex-wrap:wrap}
.land .l-tab{padding:8px 14px;font-size:13px;background:#0e1526;color:#9fb3d6;border:1px solid #1d2a44}
.land .l-tab.on{background:#19d3a2;color:#04101a;border-color:#19d3a2}
.land pre{background:#0a1120;border:1px solid #1d2a44;border-radius:12px;padding:14px;overflow-x:auto;font-size:12px;line-height:1.6;color:#b9c6e0;margin:0;white-space:pre}
.l-copy{margin-top:8px;font-size:12px!important;padding:7px 12px!important}
.l-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #16223a;font-size:13px}
.l-row span{color:#9fb3d6}.l-row b{text-align:right}
.l-faq details{background:#0e1526;border:1px solid #1d2a44;border-radius:12px;padding:14px;margin-bottom:8px}
.l-faq summary{cursor:pointer;font-weight:600}.l-faq p{color:#9fb3d6;font-size:14px;line-height:1.55;margin:8px 0 0}
.l-stack{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.l-stack span{padding:8px 14px;border-radius:999px;background:#12203a;border:1px solid #223559;font-size:13px;color:#cfe0ff}
.l-foot{text-align:center;color:#6c7d9c;font-size:12px;padding:26px 0 10px}.l-foot a{color:#8fa0bd}
`;

const STEPS = [
  ["01", "Request", "An agent sends POST /v1/trust with a wallet, .algo name, website or x402 endpoint."],
  ["02", "402 Payment Required", "Trust402 answers with an x402 payment requirement: $0.05 USDC on Algorand."],
  ["03", "Pay", "The agent signs a USDC payment. No account, key or subscription."],
  ["04", "Verify", "The GoPlausible facilitator verifies and settles the payment on-chain."],
  ["05", "Receive", "Trust402 runs live checks and returns a machine-readable report."],
];

const CHECKS = [
  ["Wallets", "Account age, balance, recent activity, rekey status, USDC readiness and linked NFD identity, read live from Algorand."],
  ["AI agents & .algo names", "Resolves NFD names to their owner wallet and assesses the wallet behind the agent."],
  ["Websites & APIs", "HTTPS, domain age (RDAP), reachability and security headers."],
  ["x402 endpoints", "Reads the price and payTo wallet from the 402 challenge, then checks that wallet before you pay it."],
];

const SAMPLES = {
  Wallet: { trust_score: 84, risk_level: "low", confidence: 0.79, checks: ["✅ Account age: about 812 days", "✅ Recent activity: 2 day(s) ago", "✅ Key control: not rekeyed", "✅ NFD identity: linked"] },
  Website: { trust_score: 71, risk_level: "medium", confidence: 0.61, checks: ["✅ HTTPS", "ℹ️ Domain age: 410 days", "✅ Reachability: HTTP 200", "ℹ️ Security headers: 1/3"] },
  "x402 endpoint": { trust_score: 58, risk_level: "medium", confidence: 0.7, checks: ["✅ x402 endpoint: returns 402", "ℹ️ Terms: 0.050 USDC", "⚠️ payTo · Account age: 6 days", "⚠️ payTo · Rekeyed account"] },
};

const CURL = `curl -i -X POST ${API}/v1/trust \\
  -H "Content-Type: application/json" \\
  -d '{"target":"https://example.com"}'
# -> HTTP/2 402 + PAYMENT-REQUIRED header`;

const AGENT = `// any x402 client: pay, then decide
const res = await payFetch("${API}/v1/trust", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ target: payeeAddress }),
});
const t = await res.json();
if (t.trust_score < 50) throw new Error("Payee too risky");
await sendPayment(payeeAddress);`;

const FAQ = [
  ["Do I need an account or API key?", "No. You pay per request with USDC through x402. Nothing to sign up for."],
  ["What does a score mean?", "It combines live on-chain and web signals. It is decision support, not financial or security advice."],
  ["What can agents check?", "Algorand addresses, .algo names, https websites and x402 endpoints, including the wallet behind them."],
  ["Is it live?", "Yes. It runs on Algorand MainNet and settles through the GoPlausible facilitator."],
];

function Copy({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="l-sec l-copy" onClick={() => { navigator.clipboard?.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? "Copied ✓" : "Copy"}
    </button>
  );
}

export default function Landing() {
  const [tab, setTab] = useState("Wallet");
  const [st, setSt] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`https://mainnet-idx.algonode.cloud/v2/accounts/${PAYTO}/transactions?asset-id=31566704&tx-type=axfer&limit=200`);
        const j = await r.json();
        const t = (j.transactions || []).filter((x) => x["asset-transfer-transaction"]?.receiver === PAYTO && x["asset-transfer-transaction"].amount > 0);
        setSt({
          n: t.length,
          usdc: t.reduce((s, x) => s + x["asset-transfer-transaction"].amount, 0) / 1e6,
          payers: new Set(t.map((x) => x.sender)).size,
        });
      } catch {}
    })();
  }, []);

  const s = SAMPLES[tab];
  const sample = JSON.stringify({ trust_score: s.trust_score, risk_level: s.risk_level, confidence: s.confidence }, null, 2);

  return (
    <div className="land">
      <style>{css}</style>

      <div className="l-nav">
        <div className="l-logo"><i>T</i>TRUST402</div>
        <nav>
          <a href="#how" onClick={(e) => { e.preventDefault(); go("how"); }}>Product</a>
          <a href="#dev" onClick={(e) => { e.preventDefault(); go("dev"); }}>Docs</a>
          <a href="https://github.com/daud9/trust402" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <button className="l-pri" onClick={() => go("try")}>Try API</button>
      </div>

      <section className="l-hero">
        <span className="l-price">$0.05 / verification</span>
        <h1>Trust <em>before</em> you transact.</h1>
        <p>A pay-per-use trust verification API for autonomous AI agents. Assess wallets, agents and endpoints before they move money, paid with x402 and USDC on Algorand.</p>
        <div className="l-cta">
          <button className="l-pri" onClick={() => go("try")}>Try Trust402</button>
          <button className="l-sec" onClick={() => go("dev")}>View API</button>
        </div>
        <div className="l-flow">
          {["AI AGENT", "TRUST402", "402 PAYMENT", "USDC / ALGORAND", "TRUST RESULT"].map((x, i) => (
            <React.Fragment key={x}>{i > 0 && <s>↓</s>}<b>{x}</b></React.Fragment>
          ))}
        </div>
      </section>

      <section className="l-sec2">
        <h2>Live on-chain activity</h2>
        <p className="l-sub">Read straight from Algorand MainNet for our payTo wallet.</p>
        <div className="l-grid">
          <div className="l-card l-stat"><b>{st ? st.n : "…"}</b><span>settled payments</span></div>
          <div className="l-card l-stat"><b>{st ? st.usdc.toFixed(2) : "…"}</b><span>USDC earned</span></div>
          <div className="l-card l-stat"><b>{st ? st.payers : "…"}</b><span>unique payers</span></div>
          <div className="l-card l-stat"><b>0.4s</b><span>typical settle time</span></div>
        </div>
      </section>

      <section className="l-sec2">
        <h2>AI agents can pay. Can they trust who they pay?</h2>
        <p className="l-sub">Agents will meet wallets, APIs and other agents they have never seen. Human verification needs accounts and manual review. Trust402 turns it into one paid HTTP call.</p>
        <div className="l-grid">
          {["No accounts", "No subscriptions", "No manual checkout"].map((x) => (
            <div key={x} className="l-card"><h3>{x}</h3><p>Request, pay, receive. Only pay when you need a verification.</p></div>
          ))}
        </div>
      </section>

      <section className="l-sec2" id="how">
        <h2>How it works</h2>
        <p className="l-sub">Request → Pay → Verify → Decide</p>
        <div className="l-grid">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="l-card"><span className="l-n">{n}</span><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>

      <section className="l-sec2">
        <h2>What Trust402 checks</h2>
        <p className="l-sub">Real data, no API keys. Every report lists the checks that produced the score.</p>
        <div className="l-grid">
          {CHECKS.map(([t, d]) => (<div key={t} className="l-card"><h3>{t}</h3><p>{d}</p></div>))}
        </div>
      </section>

      <section className="l-sec2">
        <h2>A machine-readable result</h2>
        <p className="l-sub">Sample responses. Every report includes the full list of checks.</p>
        <div className="l-tabs">
          {Object.keys(SAMPLES).map((k) => (
            <button key={k} className={"l-tab" + (k === tab ? " on" : "")} onClick={() => setTab(k)}>{k}</button>
          ))}
        </div>
        <div className="l-card">
          <pre>{sample}</pre>
          <div style={{ marginTop: 10 }}>{s.checks.map((c) => <div key={c} className="l-row"><span>{c}</span></div>)}</div>
        </div>
      </section>

      <section className="l-sec2" id="dev">
        <h2>For developers</h2>
        <p className="l-sub">One HTTP request. Any x402 client can pay it. Agents decide on the score.</p>
        <div className="l-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
          <div><pre>{CURL}</pre><Copy text={CURL} /></div>
          <div><pre>{AGENT}</pre><Copy text={AGENT} /></div>
        </div>
        <div className="l-cta" style={{ marginTop: 16 }}>
          <a className="l-btn l-sec" href={API + "/.well-known/trust402.json"} target="_blank" rel="noreferrer">API discovery JSON</a>
          <a className="l-btn l-sec" href="https://github.com/daud9/trust402" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </section>

      <section className="l-sec2">
        <h2>Powered by open infrastructure</h2>
        <div className="l-stack"><span>x402</span><span>Algorand</span><span>USDC</span><span>GoPlausible</span><span>Bazaar discovery</span></div>
      </section>

      <section className="l-sec2">
        <h2>Simple pricing</h2>
        <div className="l-card" style={{ maxWidth: 360, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 42, fontWeight: 800 }}>$0.05</div>
          <p>USDC per verification. No subscription. No account.</p>
          <button className="l-pri" style={{ marginTop: 14 }} onClick={() => go("try")}>Try Trust402</button>
        </div>
      </section>

      <section className="l-sec2 l-faq">
        <h2>FAQ</h2>
        <div style={{ marginTop: 16 }}>
          {FAQ.map(([q, a]) => (<details key={q}><summary>{q}</summary><p>{a}</p></details>))}
        </div>
      </section>

      <section className="l-hero" style={{ paddingBottom: 6 }}>
        <h1 style={{ fontSize: "clamp(24px,6vw,38px)" }}>Trust before you transact.</h1>
        <p>Agents won't just need the ability to pay. They'll need to know who they're paying.</p>
        <button className="l-pri" onClick={() => go("try")}>Try Trust402 below ↓</button>
      </section>
    </div>
  );
}

export function Footer() {
  return (
    <div className="l-foot land">
      Trust402 · Algorand · x402 · Scores are decision support, not financial or security advice.{" "}
      <a href="https://github.com/daud9/trust402" target="_blank" rel="noreferrer">GitHub</a>
    </div>
  );
}
