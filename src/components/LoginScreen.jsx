// src/components/LoginScreen.jsx
import React, { useRef } from "react";
import Lottie from "lottie-react";
import puppyAnim from "../assets/puppy.json";
import mandalaImg from "../assets/mandala.png";

export default function LoginScreen({ onSignIn }) {
  const audioRef = useRef(null);

  function handlePlayPreview() {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.25;
    audioRef.current.play().catch((e) => {
      // autoplay might be blocked — user gesture required
      console.debug("preview play blocked", e);
    });
  }

  return (
    <div style={styles.root}>
      <img src={mandalaImg} alt="" style={styles.mandala} />

      <div style={styles.card}>
        <div style={{ width: 260 }}>
          <Lottie animationData={puppyAnim} loop={true} />
        </div>

        <h1 style={styles.title}>MindForward</h1>
        <p style={styles.subtitle}>A short, soothing start — EQ over IQ</p>

        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button style={styles.actionBtn} onClick={onSignIn}>
            Sign in with Google
          </button>

          <button style={styles.ghostBtn} onClick={handlePlayPreview}>
            ▶ Play music preview
          </button>
        </div>
      </div>

      <audio ref={audioRef} src="/bg-music.mp3" loop />
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    background: "linear-gradient(180deg, #fffaf6 0%, #fffefc 100%)",
    overflow: "hidden",
  },
  mandala: {
    position: "absolute",
    right: "-10%",
    top: "-10%",
    width: "60%",
    opacity: 0.12,
    pointerEvents: "none",
    filter: "blur(6px)",
  },
  card: {
    zIndex: 20,
    width: 520,
    maxWidth: "92%",
    background: "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(250,250,255,0.9))",
    borderRadius: 18,
    padding: 28,
    boxShadow: "0 20px 60px rgba(10,10,30,0.12)",
    textAlign: "center"
  },
  title: {
    margin: "10px 0 0 0",
    fontSize: 28,
    color: "#102A43",
  },
  subtitle: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 14,
  },
  actionBtn: {
    background: "linear-gradient(90deg,#7b3fe4,#ff6b6b)",
    border: "none",
    color: "white",
    padding: "10px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  ghostBtn: {
    border: "1px solid #e6e9ef",
    background: "transparent",
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
  },
};
