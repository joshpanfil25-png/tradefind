"use client";
import { useState } from "react";

const TRADES = ["Plumbers", "Electricians", "Carpenters"];
const ICONS = { Plumbers: "🔧", Electricians: "⚡", Carpenters: "🪚" };
const ACCENT = { Plumbers: "#2196F3", Electricians: "#FFC107", Carpenters: "#FF7043" };
const ACTIVE_TEXT = { Plumbers: "#fff", Electricians: "#000", Carpenters: "#fff" };

async function fetchTrade(city, trade) {
  const res = await fetch("/api/contractors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, trade }),
  });
  const data = await res.json();
  return data.contractors || [];
}

export default function TradeFind() {
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({});
  const [results, setResults] = useState(null);
  const [activeTrade, setActiveTrade] = useState("Plumbers");
  const [searchedCity, setSearchedCity] = useState("");
  const [globalError, setGlobalError] = useState(null);

  const handleSearch = async () => {
    if (!city.trim() || loading) return;
    setLoading(true);
    setResults(null);
    setGlobalError(null);
    setActiveTrade("Plumbers");
    setSearchedCity(city.trim());
    setProgress({ Plumbers: "loading", Electricians: "loading", Carpenters: "loading" });

    const out = {};
    try {
      await Promise.all(
        TRADES.map(async (trade) => {
          try {
            const contractors = await fetchTrade(city.trim(), trade);
            out[trade] = contractors;
            setProgress(p => ({ ...p, [trade]: "done" }));
          } catch {
            out[trade] = [];
            setProgress(p => ({ ...p, [trade]: "error" }));
          }
        })
      );
      const total = Object.values(out).reduce((a, v) => a + v.length, 0);
      if (total === 0) setGlobalError("No results returned. Try a different city name.");
      else setResults(out);
    } catch {
      setGlobalError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentList = results?.[activeTrade] || [];

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#f0f0f0", fontFamily: "Georgia, serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        * { box-sizing: border-box; }
        input { background:#1a1a1a; border:1px solid #333; border-radius:8px; color:#fff; font-size:15px; padding:13px 18px; font-family:inherit; outline:none; width:100%; }
        input:focus { border-color:#555; }
        .card { background:#141414; border:1px solid #222; border-radius:10px; padding:18px; position:relative; transition:border-color 0.2s, transform 0.15s; }
        .card:hover { transform:translateY(-2px); }
      `}</style>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1a1a1a,#0d0d0d)", borderBottom: "1px solid #222", padding: "40px 24px 36px", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.35em", color: "#444", textTransform: "uppercase", marginBottom: 10 }}>Construction Contractor Intelligence</div>
        <h1 style={{ fontSize: "clamp(30px,5vw,54px)", fontWeight: "bold", color: "#fff", letterSpacing: "-0.02em", marginBottom: 6, margin: "0 0 6px" }}>TradeFind</h1>
        <p style={{ color: "#555", fontSize: 14, marginBottom: 28 }}>Source plumbers, electricians & carpenters in any city</p>
        <div style={{ display: "flex", gap: 10, maxWidth: 500, margin: "0 auto" }}>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Enter city (e.g. Columbia, SC)"
          />
          <button onClick={handleSearch} disabled={loading || !city.trim()} style={{
            padding: "13px 24px", background: loading ? "#222" : "#fff", color: loading ? "#555" : "#000",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", whiteSpace: "nowrap", fontFamily: "inherit"
          }}>
            {loading ? "..." : "Search"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{ width: 40, height: 40, border: "3px solid #222", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.75s linear infinite", margin: "0 auto 18px" }} />
            <p style={{ color: "#666", fontSize: 15 }}>Searching for contractors in {searchedCity}...</p>
            <p style={{ color: "#444", fontSize: 13, marginTop: 6 }}>All 3 trades running in parallel — usually 15–25 seconds</p>
            <div style={{ display: "flex", gap: 20, maxWidth: 420, margin: "24px auto 0" }}>
              {TRADES.map(t => (
                <div key={t} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: progress[t] === "done" ? ACCENT[t] : "#555", marginBottom: 6 }}>
                    {ICONS[t]} {t}
                  </div>
                  <div style={{ height: 3, background: "#1e1e1e", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: progress[t] === "done" || progress[t] === "error" ? "100%" : "70%",
                      background: progress[t] === "error" ? "#f44336" : ACCENT[t], borderRadius: 2,
                      transition: "width 0.4s", animation: progress[t] === "loading" ? "pulse 1.5s infinite" : "none"
                    }} />
                  </div>
                  <div style={{ fontSize: 11, marginTop: 5, color: progress[t] === "done" ? "#4caf50" : progress[t] === "error" ? "#f44336" : "#555" }}>
                    {progress[t] === "done" ? "✓ Done" : progress[t] === "error" ? "⚠ Failed" : "Searching..."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {globalError && !loading && (
          <div style={{ background: "#1a0a0a", border: "1px solid #5a1a1a", borderRadius: 8, padding: "16px 20px", color: "#ff6b6b", fontSize: 14 }}>
            ⚠️ {globalError}
          </div>
        )}

        {/* Results */}
        {results && !loading && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 19, fontWeight: 400, color: "#aaa", margin: 0 }}>
                Results for <span style={{ color: "#fff", fontWeight: 700 }}>{searchedCity}</span>
              </h2>
              <span style={{ color: "#444", fontSize: 13 }}>
                {Object.values(results).reduce((a, v) => a + v.length, 0)} contractors across 3 trades
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {TRADES.map(trade => {
                const isActive = activeTrade === trade;
                return (
                  <button key={trade} onClick={() => setActiveTrade(trade)} style={{
                    padding: "10px 20px", background: isActive ? ACCENT[trade] : "#1a1a1a",
                    color: isActive ? ACTIVE_TEXT[trade] : "#555", border: `1px solid ${isActive ? ACCENT[trade] : "#2a2a2a"}`,
                    borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 400,
                    fontFamily: "inherit", letterSpacing: "0.05em", textTransform: "uppercase"
                  }}>
                    {ICONS[trade]} {trade} ({results[trade]?.length || 0})
                  </button>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(290px,1fr))", gap: 14 }}>
              {currentList.map((c, i) => (
                <div key={i} className="card"
                  onMouseEnter={e => e.currentTarget.style.borderColor = ACCENT[activeTrade]}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#222"}
                >
                  <div style={{ position: "absolute", top: 14, right: 14, width: 24, height: 24, borderRadius: "50%", background: "#1e1e1e", border: "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#555", fontWeight: 700 }}>{i + 1}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10, paddingRight: 32, lineHeight: 1.35 }}>{c.name}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                    {c.phone && c.phone !== "N/A" && <span style={{ fontSize: 12, color: "#888" }}>📞 {c.phone}</span>}
                    {c.website && c.website !== "N/A" && <span style={{ fontSize: 12, color: ACCENT[activeTrade] }}>{c.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</span>}
                  </div>
                  <div style={{ height: 1, background: "#222", marginBottom: 12 }} />
                  <p style={{ margin: 0, fontSize: 13, color: "#999", lineHeight: 1.65 }}>{c.notes}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {!results && !loading && !globalError && (
          <div style={{ textAlign: "center", padding: "90px 24px" }}>
            <div style={{ fontSize: 60, marginBottom: 18 }}>🏗️</div>
            <p style={{ fontSize: 16, color: "#444" }}>Enter a city above to find local contractors</p>
            <p style={{ fontSize: 13, color: "#333", marginTop: 8 }}>Powered by live web search — results reflect real businesses</p>
          </div>
        )}
      </div>
    </div>
  );
}
