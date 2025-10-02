// src/Polls.jsx
import React, { useEffect, useState, useRef } from "react";

/*
  Polls.jsx - single-sheet approach with local queue fallback
  - Fetches all rows from the SheetBest connection (questions + responses).
  - Expects columns: POLL_ID, QUESTION, OPTION_A..D, RESULTS_OPEN, ROW_TYPE, UID, CHOICE, TIMESTAMP
  - When user votes we POST a RESPONSE row to the same SheetBest URL.
  - If POST fails (403/CORS), vote is saved to localStorage queue "mf_polls_queue".
  - A small "Retry queued submissions" control is provided to attempt flushes.
  - POLL_SHEET_URL: replace with your connection if different.
*/

const POLL_SHEET_URL = "https://api.sheetbest.com/sheets/d76db111-9d02-494f-b6a4-989e6983fe19";
const POLL_REFRESH_MS = 8000;
const LOCAL_QUEUE_KEY = "mf_polls_queue";

export default function Polls({ user = {} }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [queued, setQueued] = useState(getLocalQueue());
  const pollingRef = useRef(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    loadSheet().then(() => setLoading(false));
    pollingRef.current = setInterval(() => loadSheet(), POLL_REFRESH_MS);
    return () => clearInterval(pollingRef.current);
  }, []);

  async function loadSheet() {
    try {
      const r = await fetch(POLL_SHEET_URL);
      if (!r.ok) {
        console.error("Failed to fetch sheet:", r.status);
        setErrorMsg(`Failed to load polls (${r.status})`);
        return;
      }
      const data = await r.json();
      setRows(data || []);
      const q = (data || []).filter(x => String((x.ROW_TYPE||"").toUpperCase()) === "QUESTION");
      const resp = (data || []).filter(x => String((x.ROW_TYPE||"").toUpperCase()) === "RESPONSE");
      setQuestions(q);
      setResponses(resp);
      // ensure currentIndex points to existing question
      if (q.length > 0) {
        setCurrentIndex(i => (i < 0 || i >= q.length) ? 0 : i);
      }
      setErrorMsg("");
    } catch (e) {
      console.error("Error loading sheet:", e);
      setErrorMsg("Network error loading polls");
    }
  }

  function getLocalQueue() {
    try {
      const raw = localStorage.getItem(LOCAL_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalQueue(arr) {
    localStorage.setItem(LOCAL_QUEUE_KEY, JSON.stringify(arr));
    setQueued(arr);
  }

  function hasAnswered(pollId) {
    if (user && user.uid) {
      return responses.some(r => String(r.POLL_ID) === String(pollId) && String(r.UID) === String(user.uid));
    }
    // anonymous: check local queue or previously stored marker
    const q = queued || [];
    return q.some(it => String(it.POLL_ID) === String(pollId));
  }

  async function submitVote(pollId, choiceText) {
    setSubmitting(true);
    setErrorMsg("");
    const payload = {
      POLL_ID: pollId,
      ROW_TYPE: "RESPONSE",
      UID: user?.uid || "ANON",
      CHOICE: choiceText,
      TIMESTAMP: new Date().toISOString()
    };

    try {
      const res = await fetch(POLL_SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // server rejected — queue locally
        console.warn("POST rejected:", res.status);
        queueLocally(payload);
        setErrorMsg("Your vote was queued locally (server rejected). Admin will see once flushed.");
      } else {
        // success — refresh sheet to pick up new response
        await loadSheet();
      }
    } catch (err) {
      console.error("Submit error (network):", err);
      queueLocally(payload);
      setErrorMsg("Network error — vote queued locally.");
    } finally {
      setSubmitting(false);
    }
  }

  function queueLocally(payload) {
    const q = getLocalQueue();
    q.push(payload);
    saveLocalQueue(q);
  }

  // manual flush queued items
  async function flushQueue() {
    const q = getLocalQueue();
    if (!q || q.length === 0) {
      alert("Nothing queued.");
      return;
    }
    setSubmitting(true);
    let successCount = 0, failCount = 0;
    const remaining = [];
    for (const item of q) {
      try {
        const res = await fetch(POLL_SHEET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        if (!res.ok) {
          console.warn("Flush item failed:", res.status);
          remaining.push(item);
          failCount++;
        } else {
          successCount++;
        }
      } catch (e) {
        console.error("Flush network error:", e);
        remaining.push(item);
        failCount++;
      }
    }
    saveLocalQueue(remaining);
    await loadSheet();
    setSubmitting(false);
    alert(`Flush done — success: ${successCount}, failed: ${failCount}.`);
  }

  // aggregate responses for a poll
  function aggregate(poll) {
    const opts = ["OPTION_A","OPTION_B","OPTION_C","OPTION_D"].map(k => poll[k]).filter(Boolean);
    const pollResp = responses.filter(r => String(r.POLL_ID) === String(poll.POLL_ID));
    const counts = opts.map(opt => pollResp.filter(r => r.CHOICE === opt).length);
    const total = counts.reduce((s,n)=>s+n,0);
    return { opts, counts, total };
  }

  if (loading) return <div style={{ padding: 24 }}>Loading polls…</div>;
  if (!questions || questions.length === 0) return <div style={{ padding: 24 }}>No polls found.</div>;

  const current = questions[currentIndex] || questions[0];
  const isOpenResults = String((current.RESULTS_OPEN||"")).toUpperCase() === "TRUE";
  const already = hasAnswered(current.POLL_ID);
  const ag = aggregate(current);

  // styling small helpers
  const container = { maxWidth: 980, margin: "18px auto", padding: 12 };
  const card = { background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 12px 36px rgba(12,30,40,0.06)" };
  const questionStyle = { fontSize: 22, fontWeight: 800, marginBottom: 12, color: "#0f2136" };

  return (
    <div style={container}>
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", gap:12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setCurrentIndex(i => Math.max(0, i-1))} style={{ padding: "8px 12px"}}>← Prev</button>
          <button onClick={() => setCurrentIndex(i => Math.min(questions.length-1, i+1))} style={{ padding: "8px 12px"}}>Next →</button>
          <div style={{ fontWeight:700, marginLeft: 8 }}>{`Question ${currentIndex+1}/${questions.length}`}</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { navigator.clipboard?.writeText(POLL_SHEET_URL); alert("SheetBest URL copied"); }} style={{ padding: "8px 12px"}}>Copy sheet URL</button>
          <button onClick={flushQueue} style={{ padding: "8px 12px" }} disabled={submitting || (queued && queued.length===0)}>Retry queued ({queued.length})</button>
        </div>
      </div>

      <div style={card}>
        <div style={questionStyle}>{current.QUESTION}</div>

        {/* If admin has opened results, show results */}
        {isOpenResults ? (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8, color: "#666" }}>Responses: {ag.total}</div>
            <div style={{ display: "grid", gap:12 }}>
              {ag.opts.map((label,i) => {
                const count = ag.counts[i] || 0;
                const pct = ag.total ? Math.round((count / ag.total) * 100) : 0;
                const colorList = ["#E53935","#FB8C00","#FDD835","#43A047","#1E88E5","#5E35B1","#7B3FE4"];
                const color = colorList[i % colorList.length];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight:700, marginBottom: 8 }}>{label}</div>
                      <div style={{ width: "100%", height: 18, background: "#f1f5f7", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 12, transition: "width 700ms" }} />
                      </div>
                    </div>
                    <div style={{ width: 90, textAlign: "right", fontWeight:800 }}>{pct}% ({count})</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, color: "#666" }}>
              Results were opened by admin.
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "grid", gap: 10 }}>
              {["OPTION_A","OPTION_B","OPTION_C","OPTION_D"].map((k, idx) => {
                const label = current[k];
                if (!label) return null;
                return (
                  <button
                    key={k}
                    disabled={submitting || already}
                    onClick={() => submitVote(current.POLL_ID, label)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1px solid #e6e6e6",
                      background: already ? "#f8f9fa" : "#fff",
                      boxShadow: "0 6px 18px rgba(10,20,30,0.04)",
                      cursor: submitting || already ? "default" : "pointer",
                      fontWeight: 700
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: already ? "#0a774d" : "#666", fontWeight: 700 }}>
                {already ? "Answer recorded / queued ✅" : "Tap an option to vote"}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setCurrentIndex(i => Math.min(questions.length-1, i+1))} style={{ padding: "8px 12px" }}>Skip →</button>
              </div>
            </div>
          </div>
        )}

        {errorMsg && <div style={{ marginTop: 12, color: "crimson" }}>{errorMsg}</div>}

        <div style={{ marginTop: 14, fontSize: 13, color: "#666" }}>
          (Votes are recorded as ROW_TYPE = RESPONSE in the same sheet.)
        </div>
      </div>

      {/* queued items preview (small) */}
      <div style={{ maxWidth: 980, margin: "12px auto 60px", textAlign: "center" }}>
        <div style={{ fontSize: 13, color: "#666" }}>
          Queued (unsent) votes: <strong>{queued.length}</strong>. Use "Retry queued" to attempt sending to SheetBest.
        </div>
      </div>
    </div>
  );
}
