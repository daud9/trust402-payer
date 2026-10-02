import React, { useEffect, useState } from "react";

const API = "https://trust402.daud9.deno.net";
const PAYTO = "VO66SCWROBJOXOCWQ2IB3YAM3DIFP4CVKDEB73S2BNLISMVFT4VEQTEPHM";
const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
const ago = (ts) => {
  if (!ts) return "";
  const m = Math.max(1, Math.floor((Date.now() / 1000 - ts) / 60));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
};

const MENU = [["Product", "how"], ["Live data", "data"], ["What we check", "checks"], ["Methodology", "method"], ["Pricing", "pricing"], ["Developers", "dev"], ["FAQ", "faq"]];

const css = `
.land{--ac:#22d3ee;--bl:#1da1f2;--bd:#15324a;max-width:1040px;margin:0 auto;padding:0 16px;color:#e6ebf5}
.land *{box-sizing:border-box}
.land button,.land a.l-btn{width:auto;margin:0;display:inline-block;text-decoration:none;text-align:center;padding:14px 24px;border-radius:12px;border:0;font-size:15px;font-weight:700;cursor:pointer}
.land .l-pri{background:linear-gradient(135deg,var(--ac),var(--bl));color:#04101a;box-shadow:0 0 28px #22d3ee33}
.land .l-sec{background:#0a1a2c;color:#cfe9ff;border:1px solid var(--bd)}
.l-promo{background:linear-gradient(90deg,#062b3a,#0a1f3a);border-bottom:1px solid var(--bd);text-align:center;font-size:13px;padding:9px 12px;margin:0 -16px;color:#bfe9f7}
.l-promo b{color:var(--ac)}.land .l-promo button{padding:5px 12px;font-size:12px;margin-left:8px}
.l-nav{display:flex;justify-content:space-between;align-items:center;padding:16px 0}
.l-logo{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.03em;font-size:18px}
.l-logo i{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--ac),var(--bl));display:grid;place-items:center;color:#04101a;font-style:normal}
.land .l-burger{background:none;border:0;color:#e6ebf5;padding:6px;display:flex;align-items:center;gap:10px;font-size:13px;letter-spacing:.08em}
.l-burger s{display:block;width:26px;height:18px;background:linear-gradient(#e6ebf5 0 0) 0 0/100% 3px no-repeat,linear-gradient(#e6ebf5 0 0) 0 50%/100% 3px no-repeat,linear-gradient(#e6ebf5 0 0) 0 100%/100% 3px no-repeat}
.l-ov{position:fixed;inset:0;background:#000a;opacity:0;pointer-events:none;transition:.25s;z-index:60}.l-ov.on{opacity:1;pointer-events:auto}
.l-drawer{position:fixed;top:0;right:0;height:100%;width:min(320px,86vw);background:#070f1d;border-left:1px solid var(--bd);transform:translateX(100%);transition:.28s;z-index:61;padding:20px;display:flex;flex-direction:column}
.l-drawer.on{transform:none}
.l-drawer a{display:block;padding:15px 4px;border-bottom:1px solid #12263b;color:#cfe9ff;text-decoration:none;font-size:17px}
.land .l-x{align-self:flex-end;background:none;color:#8fb3d0;font-size:26px;padding:0 6px;margin-bottom:8px}
.l-eyebrow{color:var(--ac);font-weight:800;letter-spacing:.08em;font-size:13px;text-transform:uppercase}
.l-hero{text-align:center;padding:34px 0 20px}
.l-hero h1{font-size:clamp(34px,9vw,60px);line-height:1.04;margin:12px 0 14px;letter-spacing:-.02em}
.l-hero h1 em{font-style:normal;color:var(--ac)}
.l-hero p{color:#9fb7cf;max-width:600px;margin:0 auto 20px;font-size:16px;line-height:1.55}
.l-cta{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.l-badges{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:18px}
.l-badges span{padding:7px 13px;border-radius:999px;background:#0a1a2c;border:1px solid var(--bd);font-size:12px;color:#9fd8ee}
.l-term{margin:26px auto 0;max-width:520px;text-align:left;background:#060d19;border:1px solid var(--bd);border-radius:16px;overflow:hidden;box-shadow:0 0 50px #22d3ee1a}
.l-term>div:first-child{padding:9px 14px;border-bottom:1px solid var(--bd);font-size:12px;color:#6f95b3;display:flex;gap:6px;align-items:center}
.l-term>div:first-child i{width:9px;height:9px;border-radius:50%;background:#1b3c57}
.land .l-term pre{margin:0;padding:14px;font-size:12.5px;line-height:1.75;color:#b9d6ea;overflow-x:auto;background:none;border:0;white-space:pre}
.l-term .k{color:var(--ac)}.l-term .g{color:#34d399}.l-term .y{color:#fbbf24}
.l-sec2{padding:38px 0}.l-sec2>h2{font-size:clamp(24px,6vw,34px);margin:6px 0 8px;text-align:center}
.l-sub{color:#8fa9c2;text-align:center;margin:0 auto 22px;max-width:600px;line-height:1.55;font-size:15px}
.l-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}
.l-card{background:linear-gradient(180deg,#0b1830,#08111f);border:1px solid var(--bd);border-radius:16px;padding:18px}
.l-card h3{margin:0 0 6px;font-size:16px}.l-card p{margin:0;color:#9fb7cf;font-size:14px;line-height:1.55}
.l-n{color:var(--ac);font-weight:800;font-size:12px;letter-spacing:.1em}
.l-stat b{display:block;font-size:32px;color:#fff}.l-stat span{color:#7fa0bb;font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.l-row{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #12263b;font-size:13px}
.l-row span{color:#9fb7cf}.l-row b{text-align:right;font-weight:600}.l-row a{color:var(--ac)}
.l-tabs{display:flex;gap:8px;justify-content:center;margin-bottom:12px;flex-wrap:wrap}
.land .l-tab{padding:8px 14px;font-size:13px;background:#0a1a2c;color:#9fb7cf;border:1px solid var(--bd)}
.land .l-tab.on{background:var(--ac);color:#04101a;border-color:var(--ac)}
.land pre{background:#060d19;border:1px solid var(--bd);border-radius:12px;padding:14px;overflow-x:auto;font-size:12px;line-height:1.6;color:#b9d6ea;margin:0;white-space:pre}
.land .l-copy{margin-top:8px;font-size:12px;padding:7px 12px}
.l-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.l-tags span{font-size:12px;padding:5px 10px;border-radius:8px;background:#0a1a2c;border:1px solid var(--bd);color:#bfe9f7}
.l-tags span.adv{border-color:#14614f;color:#34d399}
.l-bands{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}
.l-bands div{padding:12px 6px;border-radius:12px;font-size:12px}.l-bands b{display:block;font-size:20px}
.l-faq details{background:#0a1424;border:1px solid var(--bd);border-radius:12px;padding:15px;margin-bottom:8px}
.l-faq summary{cursor:pointer;font-weight:600}.l-faq p{color:#9fb7cf;font-size:14px;line-height:1.6;margin:8px 0 0}
.l-strip{position:fixed;left:0;right:0;bottom:0;z-index:50;background:#050b16ee;border-top:1px solid var(--bd);backdrop-filter:blur(8px);padding:9px 14px;display:flex;gap:12px;align-items:center;justify-content:center;font-size:12px;color:#9fd8ee;flex-wrap:wrap}
.l-strip i{width:8px;height:8px;border-radius:50%;background:#34d399;box-shadow:0 0 10px #34d399;display:inline-block;margin-right:6px}
.l-foot{text-align:center;color:#5d7b94;font-size:12px;padding:26px 16px 80px}.l-foot a{color:#8fb3d0}
`;

const STEPS = [
  ["01", "Request", "An agent sends POST /v1/trust with a wallet, .algo name, website or x402 endpoint."],
  ["02", "402 Payment Required", "Trust402 replies with an x402 requirement: USDC on Algorand."],
  ["03", "Pay", "The agent signs one USDC payment. No account, key or subscription."],
  ["04", "Verify", "The GoPlausible facilitator verifies and settles it on-chain."],
  ["05", "Decide", "A machine-readable report comes back with a score and every check."],
];

const SIGNALS = {
  "Wallet": ["Account age", "ALGO balance", "Recent activity", "Rekey status", "USDC readiness", "NFD identity"],
  "Website / API": ["HTTPS", "Domain age", "Reachability", "Security headers", "Redirects"],
  "x402 endpoint": ["402 challenge", "Price & terms", "payTo wallet analysis"],
  "Advanced only": ["Counterparty diversity", "Two-way flow", "Burst activity", "Holdings & created assets", "Domain expiry", "security.txt", "Ranked risk factors", "Proceed / caution / avoid"],
};

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
  body: JSON.stringify({ target: payee }),
});
const t = await res.json();
if (t.trust_score < 50) throw new Error("Payee too risky");
await sendPayment(payee);`;

const FAQ = [
  ["Do I need an account or API key?", "No. You pay per request with USDC through x402. Nothing to sign up for."],
  ["Which wallets work?", "Pera, Defly, Exodus, Lute and Kibisis. Open the page inside your wallet's browser and Trust402 detects it. If a wallet's built-in browser blocks the connection, use Chrome or desktop."],
  ["What does a score mean?", "It combines live on-chain and web signals using a published formula. It is decision support, not financial or security advice, and it does not verify legal identity."],
  ["Am I charged for a bad request?", "No. If the target can't be recognised the API returns an error and the payment is not settled."],
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

export default function Landing({ children }) {
  const [tab, setTab] = useState("Wallet");
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`https://mainnet-idx.algonode.cloud/v2/accounts/${PAYTO}/transactions?asset-id=31566704&tx-type=axfer&limit=200`);
        const j = await r.json();
        const t = (j.transactions || []).filter((x) => x["asset-transfer-transaction"]?.receiver === PAYTO && x["asset-transfer-transaction"].amount > 0);
        const amt = (x) => x["asset-transfer-transaction"].amount;
        setSt({
          n: t.length,
          usdc: t.reduce((s, x) => s + amt(x), 0) / 1e6,
          payers: new Set(t.map((x) => x.sender)).size,
          basic: t.filter((x) => amt(x) === 50000).length,
          adv: t.filter((x) => amt(x) >= 200000).length,
          last: Math.max(0, ...t.map((x) => x["round-time"] || 0)),
          recent: t.slice(0, 5).map((x) => ({ id: x.id, a: amt(x) / 1e6, at: x["round-time"] })),
        });
      } catch {}
    })();
  }, []);

  const nav = (id) => { setOpen(false); setTimeout(() => go(id), 200); };
  const s = SAMPLES[tab];
  const sample = JSON.stringify({ trust_score: s.trust_score, risk_level: s.risk_level, confidence: s.confidence }, null, 2);
  const total = Object.values(SIGNALS).reduce((n, a) => n + a.length, 0);

  return (
    <div className="land">
      <style>{css}</style>

      <div className="l-promo">
        <b>LIVE</b> on Algorand MainNet · Basic <b>$0.05</b> · Advanced <b>$0.20</b>
        <button className="l-pri" onClick={() => go("try")}>Start now</button>
      </div>

      <div className="l-nav">
        <div className="l-logo"><i>T</i>Trust402</div>
        <button className="l-burger" onClick={() => setOpen(true)}>MENU <s /></button>
      </div>

      <div className={"l-ov" + (open ? " on" : "")} onClick={() => setOpen(false)} />
      <aside className={"l-drawer" + (open ? " on" : "")}>
        <button className="l-x" onClick={() => setOpen(false)}>✕</button>
        {MENU.map(([t, id]) => (<a key={id} href={"#" + id} onClick={(e) => { e.preventDefault(); nav(id); }}>{t}</a>))}
        <a href="https://github.com/daud9/trust402" target="_blank" rel="noreferrer">GitHub ↗</a>
        <a href={API + "/.well-known/trust402.json"} target="_blank" rel="noreferrer">API discovery ↗</a>
        <button className="l-pri" style={{ marginTop: "auto" }} onClick={() => nav("try")}>Try Trust402</button>
      </aside>

      <section className="l-hero">
        <div className="l-eyebrow">Pay-per-use trust API for AI agents</div>
        <h1>Trust <em>before</em> you transact.</h1>
        <p>Assess wallets, agents and x402 endpoints before they move money. One HTTP call, paid in USDC on Algorand. No account, no subscription.</p>
        <div className="l-cta">
          <button className="l-pri" onClick={() => go("try")}>Try Trust402</button>
          <button className="l-sec" onClick={() => go("dev")}>View API</button>
        </div>
        <div className="l-badges"><span>✓ Live on MainNet</span><span>x402</span><span>USDC</span><span>GoPlausible Bazaar</span><span>{total}+ signals</span></div>
        <div className="l-term">
          <div><i /><i /><i />&nbsp; agent → trust402</div>
          <pre>{`> POST /v1/trust  {"target":"VO66…EPHM"}
< `}<span className="y">402 Payment Required</span>{`  0.05 USDC
> `}<span className="k">PAYMENT-SIGNATURE</span>{` (signed in wallet)
< `}<span className="g">200 OK</span>{`  trust_score 84 · low risk`}</pre>
        </div>
      </section>
 
      {children}

      <section className="l-sec2" id="data">
        <div className="l-eyebrow" style={{ textAlign: "center" }}>Live data</div>
        <h2>Real activity, straight from Algorand</h2>
        <p className="l-sub">Read from MainNet for our payTo wallet. Nothing here is hardcoded.</p>
        <div className="l-grid">
          <div className="l-card l-stat"><b>{st ? st.n : "…"}</b><span>settled payments</span></div>
          <div className="l-card l-stat"><b>{st ? st.usdc.toFixed(2) : "…"}</b><span>USDC earned</span></div>
          <div className="l-card l-stat"><b>{st ? st.payers : "…"}</b><span>unique payers</span></div>
          <div className="l-card l-stat"><b>{st ? `${st.basic} / ${st.adv}` : "…"}</b><span>basic / advanced</span></div>
        </div>
        {st?.recent?.length > 0 && (
          <div className="l-card" style={{ marginTop: 12 }}>
            <h3>Latest settlements</h3>
            {st.recent.map((r) => (
              <div key={r.id} className="l-row">
                <span>{r.a.toFixed(2)} USDC · {ago(r.at)}</span>
                <b><a href={"https://allo.info/tx/" + r.id} target="_blank" rel="noreferrer">{r.id.slice(0, 8)}…</a></b>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="l-sec2" id="how">
        <div className="l-eyebrow" style={{ textAlign: "center" }}>How it works</div>
        <h2>Request → Pay → Verify → Decide</h2>
        <p className="l-sub">AI agents can pay. Trust402 tells them who they're paying, before the money moves.</p>
        <div className="l-grid">
          {STEPS.map(([n, t, d]) => (<div key={n} className="l-card"><span className="l-n">{n}</span><h3>{t}</h3><p>{d}</p></div>))}
        </div>
      </section>

      <section className="l-sec2" id="checks">
        <div className="l-eyebrow" style={{ textAlign: "center" }}>What we check</div>
        <h2>{total} signals, no API keys</h2>
        <p className="l-sub">Every report lists the checks that produced the score.</p>
        <div className="l-grid">
          {Object.entries(SIGNALS).map(([k, v]) => (
            <div key={k} className="l-card">
              <h3>{k}</h3>
              <div className="l-tags">{v.map((x) => <span key={x} className={k === "Advanced only" ? "adv" : ""}>{x}</span>)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="l-sec2">
        <h2>A machine-readable result</h2>
        <p className="l-sub">Sample responses. Real reports include the full list of checks.</p>
        <div className="l-tabs">
          {Object.keys(SAMPLES).map((k) => (<button key={k} className={"l-tab" + (k === tab ? " on" : "")} onClick={() => setTab(k)}>{k}</button>))}
        </div>
        <div className="l-card">
          <pre>{sample}</pre>
          <div style={{ marginTop: 10 }}>{s.checks.map((c) => <div key={c} className="l-row"><span>{c}</span></div>)}</div>
        </div>
      </section>

      <section className="l-sec2" id="method">
        <div className="l-eyebrow" style={{ textAlign: "center" }}>Methodology</div>
        <h2>How the score is built</h2>
        <p className="l-sub">Start at 50. Each passed check adds its weight, each failed check subtracts it, each warning subtracts half. Capped between 1 and 99. Confidence rises with the number of real checks.</p>
        <div className="l-bands">
          <div style={{ background: "#062a22", color: "#34d399" }}><b>75–99</b>Low risk</div>
          <div style={{ background: "#2d2509", color: "#fbbf24" }}><b>50–74</b>Medium</div>
          <div style={{ background: "#33141a", color: "#ff7b7b" }}><b>1–49</b>High risk</div>
        </div>
        <p className="l-sub" style={{ marginTop: 14, fontSize: 13 }}>The score measures technical and on-chain hygiene. It does not verify legal identity or intent, and an old, well-configured site will score high. Use it as one input to a decision.</p>
      </section>

      <section className="l-sec2" id="pricing">
        <div className="l-eyebrow" style={{ textAlign: "center" }}>Pricing</div>
        <h2>Pay per verification</h2>
        <div className="l-grid" style={{ maxWidth: 680, margin: "18px auto 0" }}>
          <div className="l-card" style={{ textAlign: "center" }}>
            <h3>Basic</h3><div style={{ fontSize: 40, fontWeight: 800 }}>$0.05</div>
            <p>Core on-chain and web checks with a trust score.</p><p style={{ marginTop: 6, color: "#5d7b94" }}>POST /v1/trust</p>
          </div>
          <div className="l-card" style={{ textAlign: "center", borderColor: "#22d3ee66" }}>
            <h3>Advanced</h3><div style={{ fontSize: 40, fontWeight: 800 }}>$0.20</div>
            <p>Flow, counterparties, bursts, holdings, ranked risk factors and a recommendation.</p><p style={{ marginTop: 6, color: "#5d7b94" }}>POST /v1/trust/advanced</p>
          </div>
        </div>
        <div className="l-cta" style={{ marginTop: 18 }}><button className="l-pri" onClick={() => go("try")}>Try Trust402</button></div>
      </section>

      <section className="l-sec2" id="dev">
        <div className="l-eyebrow" style={{ textAlign: "center" }}>For developers</div>
        <h2>One request. Any x402 client.</h2>
        <p className="l-sub">Agents pay, read the score and decide.</p>
        <div className="l-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))" }}>
          <div><pre>{CURL}</pre><Copy text={CURL} /></div>
          <div><pre>{AGENT}</pre><Copy text={AGENT} /></div>
        </div>
        <div className="l-cta" style={{ marginTop: 16 }}>
          <a className="l-btn l-sec" href={API + "/.well-known/trust402.json"} target="_blank" rel="noreferrer">API discovery JSON</a>
          <a className="l-btn l-sec" href="https://github.com/daud9/trust402" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </section>

      <section className="l-sec2 l-faq" id="faq">
        <h2>FAQ</h2>
        <div style={{ marginTop: 16 }}>{FAQ.map(([q, a]) => (<details key={q}><summary>{q}</summary><p>{a}</p></details>))}</div>
      </section>

      <section className="l-hero" style={{ paddingBottom: 6 }}>
        <h1 style={{ fontSize: "clamp(26px,7vw,42px)" }}>Trust before you <em>transact</em>.</h1>
        <p>Agents won't just need the ability to pay. They'll need to know who they're paying.</p>
        <button className="l-pri" onClick={() => go("try")}>Try Trust402 ↑</button>
      </section>

      <div className="l-strip">
        <span><i />LIVE</span>
        <span>{st ? `${st.n} settled` : "…"}</span>
        <span>{st ? `${st.usdc.toFixed(2)} USDC` : ""}</span>
        <span>{st?.last ? `last ${ago(st.last)}` : ""}</span>
        <a href="#try" onClick={(e) => { e.preventDefault(); go("try"); }} style={{ color: "#22d3ee" }}>Try it →</a>
      </div>
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
