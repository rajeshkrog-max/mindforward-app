// src/Polls.jsx
import React, { useEffect, useState, useRef } from "react";

/*
  Polls.jsx
  - Uses a single SheetBest sheet that contains both QUESTION and RESPONSE rows.
  - Expects each row to have columns:
      POLL_ID, QUESTION, OPTION_A, OPTION_B, OPTION_C, OPTION_D, RESULTS_OPEN, ROW_TYPE, UID, CHOICE, TIMESTAMP
  - POLL_SHEET_URL set to the SheetBest URL provided by the user.
  - If you need to include an API key for writes, add it to extraHeaders below.
*/

const POLL_SHEET_URL = "https://api.sheetbest.com/sheets/d76db111-9d02-494f-b6a4-989e6983fe19";
const POLL_POLL_INTERVAL = 8000; // ms - how often to refresh sheet

export default function Polls({ user = {} }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // raw rows from sheetbest
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [currentPollIndex, setCurrentPollIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [localAnswered, setLocalAnswered] = useState({}); // { pollId: true }
  const [showResultsFor, setShowResultsFor] = useState(null); // pollId to show results
  const pollingRef = useRef(null);

  // optional: extra headers (e.g. API key). DON'T commit keys to git.
  const extraHeaders = {
    // "X-Api-Key": "YOUR_API_KEY_IF_NEEDED"
  };

  useEffect(() => {
    fetchSheetAndSplit().then(() => setLoading(false));
    // start periodic refresh
    pollingRef.current = setInterval(() => {
      fetchSheetAndSplit();
    }, POLL_POLL_INTERVAL);
    return () => clearInterval(pollingRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSheetAndSplit() {
    try {
      const res = await fetch(POLL_SHEET_URL);
      if (!res.ok) {
        console.error("Failed to fetch polls sheet:", res.status);
        return;
      }
      const data = await res.json();
      // SheetBest returns array of rows where keys are column headers
      setRows(data || []);
      const q = (data || []).filter(r => (r.ROW_TYPE || "").toUpperCase() === "QUESTION");
      const resp = (data || []).filter(r => (r.ROW_TYPE || "").toUpperCase() === "RESPONSE");
      setQuestions(q);
      setResponses(resp);
      // find current poll to show (first question not answered by this user)
      const unansweredIndex = q.findIndex(p => !hasUserAnswered(p.POLL_ID, resp));
      setCurrentPollIndex(unansweredIndex >= 0 ? unansweredIndex : 0);

      // If admin opened results for any poll, show it
      const open = q.find(p => (String(p.RESULTS_OPEN||"").toUpperCase() === "TRUE"));
      if (open) {
        setShowResultsFor(open.POLL_ID);
      } else {
        setShowResultsFor(null);
      }
    } catch (e) {
      console.error("Error loading sheet:", e);
    }
  }

  function hasUserAnswered(pollId, respRows = responses) {
    // if user is logged in, check by UID; otherwise check localAnswered
    if (user && user.uid) {
      return (respRows || []).some(r => String(r.POLL_ID || "") === String(pollId) && String(r.UID || "") === String(user.uid));
    }
    return !!localAnswered[pollId];
  }

  function getCurrentQuestion() {
    if (!questions || questions.length === 0) return null;
    if (currentPollIndex < 0 || currentPollIndex >= questions.length) return questions[0];
    return questions[currentPollIndex];
  }

  async function submitChoice(pollId, choiceText) {
    if (!POLL_SHEET_URL || POLL_SHEET_URL.includes("REPLACE_WITH")) {
      alert("POLL_SHEET_URL not configured in Polls.jsx — replace the placeholder with your SheetBest URL.");
      return;
    }
    setSubmitting(true);
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
        headers: {
          "Content-Type": "application/json",
          ...extraHeaders
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=>"");
        throw new Error("Failed to submit: " + res.status + " " + txt);
      }
      // optimistic local mark
      setLocalAnswered(prev => ({ ...prev, [pollId]: true }));
      // refresh sheet to pick up response
      await fetchSheetAndSplit();
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to submit your response — check console.");
    } finally {
      setSubmitting(false);
    }
  }

  // aggregation helper
  function aggregateResponsesFor(poll) {
    if (!poll) return { total: 0, items: [] };
    const opts = [
      poll.OPTION_A,
      poll.OPTION_B,
      poll.OPTION_C,
      poll.OPTION_D
    ].filter(Boolean);
    const pollResponses = (responses || []).filter(r => String(r.POLL_ID || "") === String(poll.POLL_ID));
    const counts = opts.map(opt => pollResponses.filter(r => r.CHOICE === opt).length);
    const total = counts.reduce((s,n) => s + n, 0);
    const map = opts.map((label,i) => ({
      label,
      count: counts[i],
      pct: total ? Math.round((counts[i]/total)*100) : 0,
      colorIndex: i
    }));
    return { total, items: map };
  }

  // UI small components/styles:
  const containerStyle = { width: "100%", maxWidth: 980, margin: "18px auto", padding: 12 };
  const cardStyle = { background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 12px 40px rgba(12,30,40,0.06)" };
  const questionStyle = { fontSize: 22, fontWeight: 800, marginBottom: 14, color: "#0f2136" };
  const optionBtnBase = { display: "block", width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 12, border: "1px solid #e6e6e6", background: "#fff", cursor: "pointer", fontSize: 15, marginBottom: 12, transition: "transform .18s, box-shadow .18s" };

  function chakraColor(i) {
    const list = ["#E53935","#FB8C00","#FDD835","#43A047","#1E88E5","#5E35B1","#7B3FE4"];
    return list[i % list.length];
  }

  // Render
  if (loading) return <div style={{ padding: 24 }}>Loading polls…</div>;

  const current = getCurrentQuestion();
  if (!current) return <div style={{ padding: 24 }}>No polls available.</div>;

  const alreadyAnswered = hasUserAnswered(current.POLL_ID);
  const agg = aggregateResponsesFor(current);

  // If admin has opened results for ANY poll, show that poll's results instead
  if (showResultsFor) {
    const pollToShow = questions.find(q => String(q.POLL_ID || "") === String(showResultsFor));
    const aggregated = aggregateResponsesFor(pollToShow);
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{pollToShow?.QUESTION}</div>
            <div style={{ fontSize: 13, color: "#666" }}>Responses: {aggregated.total}</div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {aggregated.items.map((it, idx) => {
              const color = chakraColor(it.colorIndex);
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{it.label}</div>
                    <div style={{ width: "100%", height: 18, background: "#f1f5f7", borderRadius: 12, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${it.pct}%`,
                          height: "100%",
                          borderRadius: 12,
                          transition: "width 800ms ease",
                          background: `linear-gradient(90deg, ${color}, ${color}88)`
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ minWidth: 80, textAlign: "right", fontWeight: 800 }}>{it.pct}% ({it.count})</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 18, fontSize: 13, color: "#666" }}>
            Results are opened by admin. They will update when more responses arrive.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={questionStyle}>{current.QUESTION}</div>

        <div>
          {["OPTION_A","OPTION_B","OPTION_C","OPTION_D"].map((key, idx) => {
            const opt = current[key];
            if (!opt) return null;
            const selected = responses.some(r => String(r.POLL_ID || "") === String(current.POLL_ID) && r.CHOICE === opt && String(r.UID || "") === String(user?.uid || ""));
            return (
              <button
                key={key}
                disabled={submitting || alreadyAnswered}
                onClick={() => submitChoice(current.POLL_ID, opt)}
                style={{
                  ...optionBtnBase,
                  border: selected ? `2px solid ${chakraColor(idx)}` : optionBtnBase.border,
                  background: selected ? `${chakraColor(idx)}22` : optionBtnBase.background,
                  boxShadow: submitting ? "none" : "0 8px 20px rgba(10,20,30,0.04)"
                }}
              >
                <span style={{ fontSize: 18, marginRight: 12 }}>{/* emoji often part of text */}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: alreadyAnswered ? "#008000" : "#666", fontWeight: 700 }}>
            {alreadyAnswered ? "Answer recorded ✅" : "Tap an option to vote"}
          </div>

          <div>
            <button
              onClick={() => {
                // move to next question artificially
                setCurrentPollIndex(i => Math.min(i + 1, Math.max(questions.length - 1, 0)));
              }}
              style={{ marginRight: 8, padding: "8px 12px", borderRadius: 10, border: "1px solid #eee", background: "#fff", cursor: "pointer" }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
