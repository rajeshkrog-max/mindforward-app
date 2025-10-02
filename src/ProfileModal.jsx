// src/ProfileModal.jsx
import React, { useState } from "react";

/**
 * Simple profile modal. Caller provides:
 *   - user: firebase user object
 *   - onClose(): close modal
 *   - onSave(profileData): async saver (App will call Firestore)
 */
export default function ProfileModal({ user = {}, onClose = () => {}, onSave = async () => {} }) {
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!age || isNaN(age) || Number(age) < 13) {
      setErr("Please enter a valid age (13+).");
      return;
    }
    if (!phone || !/^\+?\d{7,15}$/.test(phone.replace(/\s+/g, ""))) {
      setErr("Please enter a valid contact number (include country code, e.g. +91...).");
      return;
    }
    if (!college) {
      setErr("Please enter your college name.");
      return;
    }
    if (!consent) {
      setErr("Please accept the consent to proceed.");
      return;
    }

    setLoading(true);
    try {
      const profileData = {
        uid: user.uid || "",
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        age: String(age),
        phone: String(phone),
        college,
        consentGiven: true,
      };
      // delegate saving to parent (App)
      await onSave(profileData);
      onClose();
    } catch (e) {
      console.error("profile save err", e);
      setErr("Failed to save profile — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Welcome 🎉</div>
          <div style={{ color: "#666", fontSize: 13 }}>Tell us a little about yourself</div>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <div style={styles.row}>
            <label style={styles.label}>Age</label>
            <input style={styles.input} value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 20" />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>Contact number</label>
            <input style={styles.input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
          </div>

          <div style={styles.row}>
            <label style={styles.label}>College / Institute</label>
            <input style={styles.input} value={college} onChange={(e) => setCollege(e.target.value)} placeholder="Your college name" />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <label htmlFor="consent" style={{ fontSize: 13, color: "#444" }}>
              I agree my data (answers & profile) will be stored for this program.
            </label>
          </div>

          {err && <div style={{ color: "#b91c1c", marginTop: 10 }}>{err}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="button" onClick={onClose} style={styles.ghostBtn}>Maybe later</button>
            <button type="submit" disabled={loading} style={styles.primaryBtn}>{loading ? "Saving..." : "Save & Continue"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(7,11,20,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 60
  },
  modal: {
    width: 520,
    borderRadius: 16,
    padding: 22,
    background: "linear-gradient(180deg, #fff 0%, #fbfbff 100%)",
    boxShadow: "0 20px 60px rgba(10,10,30,0.45)",
    color: "#0b1220"
  },
  header: { marginBottom: 6 },
  label: { fontSize: 13, marginBottom: 6, color: "#2b3440" },
  input: { width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e6e9ef", outline: "none" },
  row: { marginTop: 12 },
  primaryBtn: { background: "linear-gradient(90deg,#7b3fe4,#ff6b6b)", color: "white", border: "none", padding: "10px 14px", borderRadius: 10, cursor: "pointer" },
  ghostBtn: { background: "transparent", color: "#444", border: "1px solid #ddd", padding: "10px 14px", borderRadius: 10, cursor: "pointer" }
};
