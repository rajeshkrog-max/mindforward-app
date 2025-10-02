// src/Assessment.jsx
import React, { useEffect, useState } from "react";
import { auth } from "./firebase";
import { signOut as firebaseSignOut } from "firebase/auth";

const CHAKRA_COLORS = [
  "#E53935", "#FB8C00", "#FDD835",
  "#43A047", "#1E88E5", "#5E35B1", "#7B3FE4"
];

const QUESTIONS = [
  { id: "q1", text: "1. Mornings feel like.", type: "mcq",
    choices: ["🌅 Fresh start, ready to roll", "🛏 Why is my bed so magnetic?", "🤯 Brain already overloaded with thoughts", "🔄 Another day, same loop"] },
  { id: "q2", text: "2. When I scroll through social media, I mostly feel…", type: "mcq",
    choices: ["✨ Inspired", "😂 Distracted but entertained", "😔 Everyone’s doing better than me", "😶 Numb, just killing time"] },
  { id: "q3", text: "3. If my mind had a background soundtrack, it would be…", type: "mcq",
    choices: ["🎧 Calm lo-fi beats", "🤘 Heavy metal chaos", "🎭 A drama playlist (ups and downs non-stop)", "🤐 Silent but stressful"] },
  { id: "q4", text: "4. The last time I truly laughed from the heart was…", type: "mcq",
    choices: ["😂 Yesterday", "😆 Last week", "🤷‍♂️ Can’t remember", "✍️ (Open box: Describe the moment)"] },
  { id: "q5", text: "5. I usually share my real feelings with…", type: "mcq",
    choices: ["🧑‍🤝‍🧑 A close friend", "👪 Family", "🤐 Nobody, I keep it to myself", "📓 My notes / journals"] },
  { id: "q6", text: "6. When things go wrong, my first reaction is…", type: "mcq",
    choices: ["🛠 “Okay, let’s fix this”", "😭 Panic or cry", "🌀 Avoid and distract myself", "🤷 “What’s the point?”"] },
  { id: "q7", text: "7. The scariest thought that pops into my mind sometimes is…", type: "text", minChars: 369, placeholder: "Write at least 369 characters..." },
  { id: "q8", text: "8. If my stress was a cartoon character, it would be…", type: "mcq",
    choices: ["🐒 A monkey jumping around", "🐍 A snake whispering doubts", "🐘 An elephant sitting on my chest", "👻 A ghost that won’t leave"] },
  { id: "q9", text: "9. At family gatherings, I usually…", type: "mcq",
    choices: ["❤️ Feel warm and connected", "😐 Just sit and pass time", "🏃 Wish I could escape", "⚡ End up in arguments / discomfort"] },
  { id: "q10", text: "10. The phrase that secretly describes my life is…", type: "mcq",
    choices: ["🎢 Rollercoaster", "🔁 Same old loop", "🧭 Going somewhere, but not sure where", "🌊 Just floating and surviving"] },
  { id: "q11", text: "11. When I think about my future…", type: "mcq",
    choices: ["😃 Excited", "😰 Nervous", "😕 Confused", "😨 Afraid of failing"] },
  { id: "q12", text: "12. The biggest pressure I feel is from…", type: "mcq",
    choices: ["📚 Studies / grades", "👪 Family expectations", "💔 Relationships / friendships", "🧠 My own thoughts / self-doubt"] },
  { id: "q13", text: "13. If my brain had tabs open like Chrome, how many would be running right now?", type: "mcq",
    choices: ["3–4 (manageable)", "🔟+ (help)", "💻 50 (burning CPU)", "♾️ Infinity loop"] },
  { id: "q14", text: "14. Sometimes I feel “helpless” when…", type: "text", minChars: 369, placeholder: "Write at least 369 characters..." },
  { id: "q15", text: "15. When I feel lonely, I usually…", type: "mcq",
    choices: ["📱 Scroll endlessly", "🎮 Play games / music", "😴 Sleep it off", "🪑 Just sit with it, nothing helps"] },
  { id: "q16", text: "16. Which secret thought do you relate to the most?", type: "mcq",
    choices: ["💭 “I wish someone understood me.”", "🤔 “What if I’m not enough?”", "🌫 “If I disappear, will it matter?”", "🌈 “Maybe one day, I’ll find my tribe.”"] },
  { id: "q17", text: "17. The habit that drains me the most but I can’t stop is…", type: "mcq",
    choices: ["📱 Phone scrolling", "🛌 Over-sleeping", "🍔 Eating junk", "💭 Overthinking"] },
  { id: "q18", text: "18. I feel most alive when…", type: "text", minChars: 369, placeholder: "Write at least 369 characters..." },
  { id: "q19", text: "19. If I could send one anonymous text to the world, it would say…", type: "text", minChars: 369, placeholder: "Write at least 369 characters..." },
  { id: "q20", text: "20. My inner critic often says…", type: "mcq",
    choices: ["😴 “You’re too lazy.”", "🙈 “You’ll mess it up.”", "🙃 “Nobody cares.”", "🤷 “Why even try?”"] },
  { id: "q21", text: "21. Deep down, what I really want is…", type: "text", minChars: 369, placeholder: "Write at least 369 characters..." }
];

export default function Assessment({ user = {}, onDone = async () => {} }) {
  const total = QUESTIONS.length;
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem("assessmentAnswers");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    const base = {};
    QUESTIONS.forEach(q => base[q.id] = "");
    return base;
  });

  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);

  const current = QUESTIONS[index];
  const chakraIndex = Math.min(Math.floor(index / 3), CHAKRA_COLORS.length - 1);
  const bgColor = CHAKRA_COLORS[chakraIndex];
  const progressPct = Math.round((index / Math.max(1,total - 1)) * 100);

  useEffect(() => {
    localStorage.setItem("assessmentAnswers", JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    let audio = document.getElementById("bg-music");
    if (!audio) {
      audio = document.createElement("audio");
      audio.id = "bg-music";
      audio.src = "/src/assets/music.mp3";
      audio.loop = true;
      audio.preload = "auto";
      document.body.appendChild(audio);
    }
    const onPlay = () => setMusicPlaying(true);
    const onPause = () => setMusicPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  function chooseAnswer(id, val) {
    setAnswers(prev => ({ ...prev, [id]: val }));
    setError("");
  }

  function canProceedForCurrent() {
    if (!current) return true;
    if (current.type === "mcq") return !!answers[current.id];
    if (current.type === "text") {
      const required = current.minChars || 0;
      return (answers[current.id] || "").trim().length >= required;
    }
    return false;
  }

  function handleNext() {
    setError("");
    if (!canProceedForCurrent()) {
      if (current.type === "text" && (current.minChars || 0) > 0) {
        setError(`Please write at least ${current.minChars} characters.`);
      } else {
        setError("Please answer to continue.");
      }
      return;
    }
    if (index < total - 1) setIndex(i => i + 1);
    else finishAssessment();
  }

  function handleBack() {
    if (index > 0) setIndex(i => i - 1);
  }

  function toggleMusic() {
    const audio = document.getElementById("bg-music");
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  async function finishAssessment() {
    for (const q of QUESTIONS) {
      if (q.type === "text" && (q.minChars || 0) > 0) {
        if ((answers[q.id] || "").trim().length < q.minChars) {
          setIndex(QUESTIONS.findIndex(x => x.id === q.id));
          setError(`Please complete "${q.text}" with at least ${q.minChars} characters.`);
          return;
        }
      }
    }
    setSubmitting(true);
    const payload = {
      UID: user?.uid || "",
      NAME: user?.displayName || "",
      EMAIL: user?.email || "",
      TIMESTAMP: new Date().toISOString()
    };
    QUESTIONS.forEach((q,i) => {
      payload[`Q${i+1}`] = answers[q.id] || "";
    });
    try {
      await onDone(payload);
      localStorage.removeItem("assessmentAnswers");
      setSavedOk(true);
      setSubmitting(false);
    } catch (e) {
      console.error("Save failed", e);
      setError("Failed to save — try again.");
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    try { await firebaseSignOut(auth); window.location.reload(); }
    catch (e) { console.error("Sign out error", e); }
  }

  return (
    <div style={{ width:"100%", maxWidth: 900, margin:"26px auto", padding: 12 }}>
      {/* Chakra + progress */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ display:"flex", gap:8 }}>
          {CHAKRA_COLORS.map((c,i)=>(
            <div key={i} style={{ width:14, height:14, borderRadius:"50%", background:c, boxShadow:i===chakraIndex?`0 0 10px ${c}`:"none" }} />
          ))}
          <div style={{ marginLeft:8, fontWeight:600 }}>Question {index+1}/{total}</div>
        </div>
        <div style={{ width:260, height:10, background:"#eee", borderRadius:8 }}>
          <div style={{ width:`${progressPct}%`, height:"100%", background:bgColor, transition:"width 300ms" }} />
        </div>
      </div>

      {/* Question card */}
      <div style={{ background:"#fff", borderRadius:14, padding:20, boxShadow:"0 8px 24px rgba(0,0,0,0.1)" }}>
        <h2>{current.text}</h2>
        {current.type==="mcq" && (
          <div style={{ display:"grid", gap:12 }}>
            {current.choices.map((c,i)=>(
              <button key={i} onClick={()=>chooseAnswer(current.id,c)}
                style={{ padding:"12px 14px", borderRadius:10, border:answers[current.id]===c?`2px solid ${bgColor}`:"1px solid #ddd",
                  background:answers[current.id]===c?`${bgColor}22`:"#fff", textAlign:"left" }}>
                {c}
              </button>
            ))}
          </div>
        )}
        {current.type==="text" && (
          <div>
            <textarea value={answers[current.id]} onChange={e=>chooseAnswer(current.id,e.target.value)} placeholder={current.placeholder}
              style={{ width:"100%", minHeight:160, borderRadius:10, padding:12, border:"1px solid #ddd" }} />
            <div style={{ fontSize:13, color:"#666", marginTop:6 }}>
              {(answers[current.id]||"").length} / {current.minChars||0}
            </div>
          </div>
        )}
        {error && <div style={{ color:"red", marginTop:10 }}>{error}</div>}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:18 }}>
          <button onClick={handleBack} disabled={index===0}>← Back</button>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handleNext} disabled={submitting||savedOk}>
              {index===total-1 ? (savedOk?"Saved":(submitting?"Saving...":"Finish")):"Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
