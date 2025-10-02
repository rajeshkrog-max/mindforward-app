// src/App.jsx
import React, { useEffect, useState } from "react";
import "./App.css";
import Assessment from "./Assessment";
import Polls from "./Polls"; // ✅ new import
import { auth } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";

import bgVideo from "./assets/bgvideo.mov";
import bgMusic from "./assets/music.mp3";

// Lottie assets
const DOG_LOTTIE = "/src/assets/Happy%20Dog.json";
const CUP_LOTTIE = "/src/assets/Cup.json";

// fallback avatar
import fallbackAvatar from "./assets/react.svg"; // replace with avatar.png if you add

// Sheet endpoint for assessment save (Assessment only)
const SHEET_ENDPOINT_URL =
  "https://api.sheetbest.com/sheets/43d1ccf2-ceee-4732-b78e-bc024713f58a";

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(null); // null until user chooses
  const [showCongrats, setShowCongrats] = useState(false);
  const [submittingRemote, setSubmittingRemote] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  async function handleSignIn() {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setActiveTab(null);
    } catch (e) {
      console.error("Sign in failed", e);
      alert("Sign in failed — check console.");
    }
  }

  async function handleSignOut() {
    try {
      await firebaseSignOut(auth);
      setShowCongrats(false);
      setSubmittingRemote(false);
      setActiveTab(null);
    } catch (e) {
      console.error("Sign out failed", e);
    }
  }

  function toggleMusic() {
    const audio = document.getElementById("bg-music");
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  async function handleDone(payload) {
    if (!SHEET_ENDPOINT_URL) {
      alert("Missing sheet endpoint URL in App.jsx.");
      return;
    }

    setSubmittingRemote(true);
    try {
      const res = await fetch(SHEET_ENDPOINT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Save failed", res.status, text);
        alert("Saving failed — check console.");
        setSubmittingRemote(false);
        return;
      }

      setShowCongrats(true);
      setTimeout(async () => {
        setShowCongrats(false);
        setSubmittingRemote(false);
        await handleSignOut();
      }, 2200);
    } catch (err) {
      console.error("Error saving to sheet:", err);
      alert("Network error saving results — check console.");
      setSubmittingRemote(false);
    }
  }

  return (
    <div className="app-root">
      {bgVideo && (
        <video
          className="bg-video"
          src={bgVideo}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      )}

      <audio id="bg-music" loop src={bgMusic} />

      <div className="overlay">
        <header className="brand-header">
          <div className="brand-inner">MIND FORWARD GURUKUL</div>
        </header>

        {/* LOGIN SCREEN */}
        {!user && (
          <main className="center-wrap">
            <div className="glass-card">
              <lottie-player
                src={DOG_LOTTIE}
                background="transparent"
                speed="1"
                style={{ width: 120, height: 120 }}
                loop
                autoplay
              />
              <h2 className="glass-title">Welcome</h2>
              <p className="glass-sub">Sign in with Google to continue</p>

              <button className="google-btn" onClick={handleSignIn}>
                <span className="g-letter">G</span> Sign in with Google
              </button>

              <p className="small-note">
                By signing in you agree to store minimal profile data for the program.
              </p>
            </div>
          </main>
        )}

        {/* AFTER LOGIN */}
        {user && (
          <main className="signed-main" style={{ padding: 20 }}>
            {/* Profile bar */}
            <div className="profile-card">
              <div className="profile-info">
                <div className="profile-avatar">
                  <img
                    src={user.photoURL || fallbackAvatar}
                    alt={user.displayName || "avatar"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
                <div className="profile-meta">
                  <h4>{user.displayName}</h4>
                  <p>{user.email}</p>
                  <p style={{ fontSize: 11, color: "#888" }}>UID: {user.uid}</p>
                </div>
              </div>

              {/* Nav + controls */}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {/* Tabs always visible */}
                <button
                  className={`tab ${activeTab === "assessment" ? "active" : ""}`}
                  disabled={activeTab === "assessment"}
                  onClick={() => setActiveTab("assessment")}
                >
                  Self Assessment
                </button>
                <button
                  className={`tab ${activeTab === "polls" ? "active" : ""}`}
                  disabled={activeTab === "polls"}
                  onClick={() => setActiveTab("polls")}
                >
                  Polls
                </button>

                {/* Utility buttons */}
                <button onClick={toggleMusic} className="glass-btn">
                  🎵 Music
                </button>
                <button onClick={handleSignOut} className="glass-btn danger">
                  Sign out
                </button>
              </div>
            </div>

            {/* If no tab selected yet, show big buttons */}
            {!activeTab && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 20,
                  marginBottom: 30,
                }}
              >
                <button
                  className="glass-big-btn btn-assessment"
                  onClick={() => setActiveTab("assessment")}
                >
                  Self Assessment
                </button>
                <button
                  className="glass-big-btn btn-polls"
                  onClick={() => setActiveTab("polls")}
                >
                  Polls
                </button>
              </div>
            )}

            {/* Show selected tab content */}
            <div style={{ maxWidth: 980, margin: "0 auto" }}>
              {activeTab === "assessment" && (
                <Assessment user={user} onDone={handleDone} />
              )}

              {activeTab === "polls" && (
                // ✅ Now using the Polls component
                <Polls user={user} />
              )}
            </div>
          </main>
        )}

        {showCongrats && (
          <div className="congrats-overlay">
            <div className="congrats-card">
              <lottie-player
                src={CUP_LOTTIE}
                background="transparent"
                speed="1"
                style={{ width: 180, height: 180 }}
                loop={false}
                autoplay
              />
              <h3>Successful — Congratulations!</h3>
              <p>You’re one step away from joining the DhiRISE family.</p>
            </div>
          </div>
        )}
      </div>

      {submittingRemote && (
        <div className="submitting-toast">Saving your responses — please wait…</div>
      )}
    </div>
  );
}
