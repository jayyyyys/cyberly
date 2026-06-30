import { useState, createContext, useContext, useRef, useEffect } from "react";

// ─── Design tokens ────────────────────────────────────────────────
/*const COLORS = {
  teal:   { bg: "#E1F5EE", mid: "#1D9E75", dark: "#085041" },
  coral:  { bg: "#FAECE7", mid: "#D85A30", dark: "#712B13" },
  purple: { bg: "#EEEDFE", mid: "#7F77DD", dark: "#26215C" },
  gray:   { bg: "#F1EFE8", mid: "#888780", dark: "#2C2C2A" },
};
*/

// ─── Global styles ────────────────────────────────────────────────
const globalStyle = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;1,9..40,300&family=Space+Grotesk:wght@400;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'DM Sans', sans-serif;
  background: #f7f8f5;
  color: #1a1a18;
  min-height: 100vh;
}
:root {
  --teal:     #1D9E75;
  --teal-lt:  #E1F5EE;
  --coral:    #D85A30;
  --coral-lt: #FAECE7;
  --purple:   #7F77DD;
  --purple-lt:#EEEDFE;
  --gray:     #888780;
  --gray-lt:  #F1EFE8;
  --nav-h:    60px;
}

/* ── Navbar ── */
.navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: var(--nav-h);
  background: #fff;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  display: flex; align-items: center; gap: 0.25rem;
  padding: 0 1.5rem;
}
.nav-logo {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.1rem; font-weight: 600; color: var(--teal);
  margin-right: auto; display: flex; align-items: center; gap: 0.4rem;
}
.nav-link {
  background: none; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
  color: #555; padding: 0.4rem 0.75rem; border-radius: 8px;
}
.nav-link:hover { background: var(--gray-lt); }
.nav-link.active { color: var(--teal); font-weight: 600; background: var(--teal-lt); }
.nav-cta {
  background: var(--teal); color: #fff; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 500;
  padding: 0.45rem 1.1rem; border-radius: 20px; margin-left: 0.5rem;
}
.nav-cta:hover { opacity: 0.88; }
.nav-user { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #555; }
.nav-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--teal); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 600;
}
.nav-logout {
  font-size: 0.8rem; color: var(--coral); cursor: pointer;
  border: none; background: none; padding: 0.2rem 0.5rem; border-radius: 4px;
}
.nav-logout:hover { background: var(--coral-lt); }

/* ── Layout ── */
.page-wrap { margin-top: var(--nav-h); min-height: calc(100vh - var(--nav-h)); }

/* ── Sections ── */
.section { max-width: 1000px; margin: 0 auto; padding: 3rem 1.5rem; }
.section-title {
  font-family: 'Space Grotesk', sans-serif; font-size: 1.75rem; font-weight: 600;
  margin-bottom: 0.5rem;
}
.section-sub { color: #666; font-size: 1rem; margin-bottom: 2rem; }

/* ── Cards ── */
.card {
  background: #fff; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07);
  padding: 1.5rem; box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }

/* ── Hero ── */
.hero {
  background: linear-gradient(135deg, var(--teal-lt) 0%, #f7f8f5 60%);
  padding: 5rem 1.5rem 4rem; text-align: center;
}
.hero h1 {
  font-family: 'Space Grotesk', sans-serif; font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 600; margin-bottom: 1rem; color: var(--teal);
}
.hero p { color: #555; font-size: 1.1rem; max-width: 55ch; margin: 0 auto 2rem; }
.hero-cta {
  background: var(--teal); color: #fff; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 500;
  padding: 0.8rem 2rem; border-radius: 24px;
}
.hero-cta:hover { opacity: 0.88; }

/* ── Stat chips ── */
.stat-row { display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; margin-top: 2rem; }
.stat-chip {
  background: #fff; border-radius: 50px; padding: 0.6rem 1.4rem;
  font-size: 0.875rem; color: #444; box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  display: flex; align-items: center; gap: 0.4rem;
}

/* ── Dashboard ── */
.dash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
.dash-card {
  background: #fff; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07);
  padding: 1.5rem; cursor: pointer; transition: box-shadow .2s, transform .2s;
}
.dash-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.1); transform: translateY(-2px); }
.dash-icon { font-size: 1.8rem; margin-bottom: 0.75rem; }
.dash-label { font-family: 'Space Grotesk', sans-serif; font-weight: 600; margin-bottom: 0.3rem; }
.dash-desc { color: #777; font-size: 0.875rem; line-height: 1.5; }

/* ── Agent panel ── */
.agent-wrap { max-width: 760px; margin: 0 auto; padding: 2rem 1.5rem; }
.agent-panel { background: #fff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.08); overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.07); }
.agent-header { background: var(--teal); color: #fff; padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.6rem; font-weight: 600; }
.agent-messages { height: 380px; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.agent-bubble { max-width: 80%; padding: 0.65rem 1rem; border-radius: 14px; font-size: 0.875rem; line-height: 1.55; }
.agent-bubble.user { align-self: flex-end; background: var(--teal); color: #fff; border-bottom-right-radius: 4px; }
.agent-bubble.ai { align-self: flex-start; background: var(--gray-lt); color: #1a1a18; border-bottom-left-radius: 4px; }
.agent-bubble.ai.loading { opacity: 0.6; font-style: italic; }
.agent-input-row { display: flex; gap: 0.5rem; padding: 0.75rem 1rem; border-top: 1px solid rgba(0,0,0,0.07); }
.agent-input { flex: 1; border: 1px solid rgba(0,0,0,0.12); border-radius: 10px; padding: 0.55rem 0.85rem; font-family: 'DM Sans', sans-serif; font-size: 0.875rem; outline: none; }
.agent-input:focus { border-color: var(--teal); }
.agent-send { background: var(--teal); color: #fff; border: none; border-radius: 8px; padding: 0.5rem 0.85rem; cursor: pointer; font-size: 0.85rem; font-weight: 500; }
.agent-send:hover { opacity: 0.88; }
.agent-send:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Auth / Login ── */
.auth-wrap {
  min-height: calc(100vh - var(--nav-h));
  display: flex; align-items: center; justify-content: center;
  padding: 2rem;
  background: linear-gradient(135deg, var(--teal-lt) 0%, #f7f8f5 70%);
}
.auth-card {
  background: #fff; border-radius: 20px;
  border: 1px solid rgba(0,0,0,0.08);
  padding: 2.5rem; width: 100%; max-width: 460px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}
.auth-logo { text-align: center; margin-bottom: 1.75rem; }
.auth-logo-icon { font-size: 2.5rem; }
.auth-logo-name {
  font-family: 'Space Grotesk', sans-serif; font-size: 1.4rem;
  font-weight: 600; color: var(--teal);
}
.auth-title {
  font-family: 'Space Grotesk', sans-serif; font-size: 1.2rem;
  font-weight: 600; margin-bottom: 0.35rem;
}
.auth-sub { color: #777; font-size: 0.875rem; margin-bottom: 1.75rem; }

/* Progress bar */
.auth-progress { margin-bottom: 1.75rem; }
.auth-progress-track {
  background: var(--gray-lt); border-radius: 99px; height: 6px; overflow: hidden;
}
.auth-progress-fill {
  height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, var(--teal), #34c490);
  transition: width 0.4s ease;
}
.auth-progress-label {
  display: flex; justify-content: space-between;
  font-size: 0.75rem; color: #999; margin-top: 0.4rem;
}

/* Form fields */
.field { margin-bottom: 1.1rem; }
.field label { display: block; font-size: 0.82rem; font-weight: 500; color: #444; margin-bottom: 0.35rem; }
.field input {
  width: 100%; border: 1.5px solid rgba(0,0,0,0.13); border-radius: 10px;
  padding: 0.65rem 0.9rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; outline: none;
}
.field input:focus { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(29,158,117,0.12); }
.field-error { color: var(--coral); font-size: 0.78rem; margin-top: 0.3rem; }

/* Question label (onboarding steps) */
.q-label {
  font-family: 'Space Grotesk', sans-serif; font-size: 1rem;
  font-weight: 600; margin-bottom: 1rem; color: #1a1a18; line-height: 1.4;
}
.q-hint { font-size: 0.78rem; color: #999; font-weight: 400; margin-top: 0.2rem; }

/* Option chips */
.opt-grid { display: flex; flex-direction: column; gap: 0.55rem; }
.opt-row { display: flex; flex-wrap: wrap; gap: 0.55rem; }
.opt-btn {
  border: 1.5px solid rgba(0,0,0,0.13); border-radius: 10px;
  background: #fff; padding: 0.6rem 1rem;
  font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
  cursor: pointer; transition: all .18s; text-align: left;
  color: #333;
}
.opt-btn:hover { border-color: var(--teal); background: var(--teal-lt); color: var(--teal); }
.opt-btn.selected {
  border-color: var(--teal); background: var(--teal-lt);
  color: var(--teal); font-weight: 600;
}
.opt-btn.full-width { width: 100%; }

/* Multi-select chip row */
.chip-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.chip-btn {
  border: 1.5px solid rgba(0,0,0,0.13); border-radius: 99px;
  background: #fff; padding: 0.45rem 1rem;
  font-family: 'DM Sans', sans-serif; font-size: 0.82rem;
  cursor: pointer; transition: all .18s; color: #444;
}
.chip-btn:hover { border-color: var(--teal); background: var(--teal-lt); color: var(--teal); }
.chip-btn.selected {
  border-color: var(--teal); background: var(--teal); color: #fff; font-weight: 600;
}
.chip-limit-note { font-size: 0.75rem; color: #aaa; margin-top: 0.5rem; }

/* Nav buttons */
.auth-nav { display: flex; gap: 0.75rem; margin-top: 1.75rem; }
.btn-primary {
  flex: 1; background: var(--teal); color: #fff; border: none;
  border-radius: 10px; padding: 0.75rem; font-family: 'DM Sans', sans-serif;
  font-size: 0.9rem; font-weight: 600; cursor: pointer;
}
.btn-primary:hover { opacity: 0.88; }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-ghost {
  flex: 0 0 auto; background: none; border: 1.5px solid rgba(0,0,0,0.13);
  border-radius: 10px; padding: 0.75rem 1.1rem;
  font-family: 'DM Sans', sans-serif; font-size: 0.9rem; cursor: pointer;
  color: #555;
}
.btn-ghost:hover { background: var(--gray-lt); }

/* Auth switch link */
.auth-switch { text-align: center; margin-top: 1.25rem; font-size: 0.83rem; color: #888; }
.auth-switch button { background: none; border: none; color: var(--teal); cursor: pointer; font-weight: 600; font-size: 0.83rem; }

/* Avatar row */
.avatar { width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 0.75rem; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.1rem; color: #fff; background: var(--teal); }

/* ── Team card ── */
.team-grid { display: flex; gap: 1rem; flex-wrap: wrap; }
.team-card { background: #fff; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07); padding: 1.5rem; text-align: center; flex: 1; min-width: 160px; }
.team-card .avatar { margin-bottom: 0.75rem; }

/* ── Chat Widget ── */
.chat-fab {
  position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 200;
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--teal); color: #fff; border: none; cursor: pointer;
  font-size: 1.4rem; box-shadow: 0 4px 16px rgba(29,158,117,0.4);
  display: flex; align-items: center; justify-content: center;
}
.chat-fab:hover { opacity: 0.88; }
.chat-panel {
  position: fixed; bottom: 4.5rem; right: 1.5rem; z-index: 199;
  width: 340px; background: #fff; border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 8px 32px rgba(0,0,0,0.14);
  display: flex; flex-direction: column; overflow: hidden;
}
.chat-header {
  background: var(--teal); color: #fff;
  padding: 0.75rem 1rem; font-weight: 600; font-size: 0.875rem;
  display: flex; align-items: center; justify-content: space-between;
}
.chat-header-sub { font-size: 0.75rem; font-weight: 400; opacity: 0.8; }
.chat-messages { height: 280px; overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; }
.chat-bubble { max-width: 85%; padding: 0.55rem 0.85rem; border-radius: 12px; font-size: 0.82rem; line-height: 1.5; }
.chat-bubble.user { align-self: flex-end; background: var(--teal); color: #fff; border-bottom-right-radius: 3px; }
.chat-bubble.ai { align-self: flex-start; background: var(--gray-lt); border-bottom-left-radius: 3px; }
.chat-bubble.ai.loading { opacity: 0.6; font-style: italic; }
.chat-input-row { display: flex; gap: 0.5rem; padding: 0.6rem 0.75rem; border-top: 1px solid rgba(0,0,0,0.07); }
.chat-input { flex: 1; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; padding: 0.45rem 0.7rem; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; outline: none; resize: none; }
.chat-input:focus { border-color: var(--teal); }
.chat-send { background: var(--teal); color: #fff; border: none; border-radius: 8px; padding: 0.5rem 0.85rem; cursor: pointer; font-size: 0.85rem; font-weight: 500; }
.chat-send:hover { opacity: 0.88; }
.chat-send:disabled { opacity: 0.45; cursor: not-allowed; }
.chat-login-prompt { padding: 1.25rem; text-align: center; color: #666; font-size: 0.85rem; }
.chat-login-prompt button { margin-top: 0.75rem; background: var(--teal); color: #fff; border: none; border-radius: 8px; padding: 0.5rem 1.25rem; cursor: pointer; font-size: 0.875rem; }

/* ── Resources ── */
.res-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 1rem; }
.res-card { background: #fff; border-radius: 14px; border: 1px solid rgba(0,0,0,0.07); padding: 1.25rem; }
.res-tag { display: inline-block; font-size: 0.72rem; font-weight: 600; border-radius: 99px; padding: 0.2rem 0.65rem; margin-bottom: 0.6rem; background: var(--teal-lt); color: var(--teal); }
.res-title { font-weight: 600; margin-bottom: 0.35rem; font-size: 0.95rem; }
.res-desc { color: #666; font-size: 0.82rem; line-height: 1.5; }

/* ── Footer ── */
footer { background: #1a1a18; color: #aaa; text-align: center; padding: 1.75rem 1rem; font-size: 0.85rem; }
footer strong { color: #fff; }
`;

// ─── Context ──────────────────────────────────────────────────────
const AppCtx = createContext(null);
function useApp() { return useContext(AppCtx); }

// ─── Auth Database (in-memory, session-scoped) ────────────────────
// Stores: { [username_lower]: { passwordHash, salt, profile } }
// In production, replace with your backend API calls.
const _db = {};

async function _hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100_000, hash: "SHA-256" },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Returns { ok: true } or { ok: false, error: string }
async function dbRegister(profile) {
  try {
    // 1. Send the user's profile data to your secure Node.js backend
    // (Make sure the URL matches the port your backend is running on)
    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // We send the whole profile (name, age, password, etc.) as a JSON string
      body: JSON.stringify(profile) 
    });

    // 2. Wait for the backend to reply
    const data = await response.json();

    // 3. If the backend rejected it (e.g., username taken, database error)
    if (!response.ok) {
      // It passes the backend's specific error message directly to your UI
      return { ok: false, error: data.message || "Failed to register. Please try again." };
    }

    // 4. Success! The backend saved the user and sent back the safe profile data
    return { ok: true, user: data.user };

  } catch (error) {
    // This catches issues like the backend server being turned off
    console.error("Registration error:", error);
    return { ok: false, error: "Network error. Could not connect to the server." };
  }
}

// Returns { ok: true, user } or { ok: false, error: string }
async function dbLogin(name, password) {
  const key = name.trim().toLowerCase();
  const record = _db[key];
  if (!record) return { ok: false, error: "No account found with that name. Check your spelling or sign up." };
  const hash = await _hashPassword(password, record.salt);
  if (hash !== record.passwordHash) return { ok: false, error: "Incorrect password. Please try again." };
  return { ok: true, user: record.profile };
}

// ─── Helpers ──────────────────────────────────────────────────────
function getAgeGroup(age) {
  if (age < 13) return { label: "Child (under 13)", key: "child" };
  if (age < 18) return { label: "Teen (13–17)", key: "teen" };
  if (age < 25) return { label: "Young adult (18–24)", key: "youngAdult" };
  return { label: "Adult (25+)", key: "adult" };
}

const SCHOOL_YEARS = ["Form 1", "Form 2", "Form 3", "Form 4", "Form 5"];
const LANGUAGES = ["English", "Bahasa Melayu", "中文", "Mixed"];
const FAMILIARITY = ["Beginner", "Intermediate", "Advanced"];
const HELP_OPTIONS = [
  "Staying safe online",
  "Learning cybersecurity",
  "Avoiding scams",
  "Protecting privacy",
  "Understanding cyber threats",
  "Exploring cybersecurity careers",
];
const LEARNING_STYLES = [
  "Step-by-step guidance",
  "Short explanations",
  "Quizzes & challenges",
];

// ─── AI helper ────────────────────────────────────────────────────
async function askClaude(messages, systemPrompt) {
  const response = await fetch("https://agentic.ilmu.my/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "API request failed");
  }
  const data = await response.json();
  return data.content?.[0]?.text || "Sorry, I couldn't generate a response. Please try again.";
}

// ─────────────────────────────────────────────────────────────────
// STEP 1 — Account credentials (name, age, password)  [ORIGINAL]
// ─────────────────────────────────────────────────────────────────
function StepCredentials({ data, onChange, errors }) {
  return (
    <>
      <div className="auth-title">Create your account</div>
      <div className="auth-sub">Let's start with the basics.</div>

      <div className="field">
        <label>Name</label>
        <input
          placeholder="Your name"
          value={data.name}
          onChange={e => onChange("name", e.target.value)}
        />
        {errors.name && <div className="field-error">{errors.name}</div>}
      </div>

      <div className="field">
        <label>Age</label>
        <input
          type="number"
          placeholder="e.g. 16"
          value={data.age}
          onChange={e => onChange("age", e.target.value)}
        />
        {errors.age && <div className="field-error">{errors.age}</div>}
      </div>

      <div className="field">
        <label>Password</label>
        <input
          type="password"
          placeholder="At least 4 characters"
          value={data.password}
          onChange={e => onChange("password", e.target.value)}
        />
        {errors.password && <div className="field-error">{errors.password}</div>}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// STEP 2 — AI nickname
// ─────────────────────────────────────────────────────────────────
function StepNickname({ data, onChange, errors }) {
  return (
    <>
      <div className="q-label">
        1. What should the AI call you?
        <div className="q-hint">This can be a nickname or alias — it's just for CyberGuard.</div>
      </div>
      <div className="field">
        <input
          placeholder="e.g. Alex, Koko, ZK…"
          value={data.aiNickname}
          onChange={e => onChange("aiNickname", e.target.value)}
        />
        {errors.aiNickname && <div className="field-error">{errors.aiNickname}</div>}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// STEP 3 — School year
// ─────────────────────────────────────────────────────────────────
function StepSchoolYear({ data, onChange }) {
  return (
    <>
      <div className="q-label">2. What school year are you in?</div>
      <div className="opt-grid">
        {SCHOOL_YEARS.map(yr => (
          <button
            key={yr}
            className={`opt-btn full-width ${data.schoolYear === yr ? "selected" : ""}`}
            onClick={() => onChange("schoolYear", yr)}
          >
            {yr}
          </button>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// STEP 4 — Language preference
// ─────────────────────────────────────────────────────────────────
function StepLanguage({ data, onChange }) {
  return (
    <>
      <div className="q-label">3. Which language do you prefer?</div>
      <div className="opt-grid">
        {LANGUAGES.map(lang => (
          <button
            key={lang}
            className={`opt-btn full-width ${data.language === lang ? "selected" : ""}`}
            onClick={() => onChange("language", lang)}
          >
            {lang}
          </button>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// STEP 5 — Cybersecurity familiarity
// ─────────────────────────────────────────────────────────────────
function StepFamiliarity({ data, onChange }) {
  const descriptions = {
    Beginner:     "I'm just getting started — the basics are new to me.",
    Intermediate: "I know the fundamentals and want to go deeper.",
    Advanced:     "I'm confident and looking for advanced challenges.",
  };
  return (
    <>
      <div className="q-label">4. How familiar are you with cybersecurity?</div>
      <div className="opt-grid">
        {FAMILIARITY.map(lvl => (
          <button
            key={lvl}
            className={`opt-btn full-width ${data.familiarity === lvl ? "selected" : ""}`}
            onClick={() => onChange("familiarity", lvl)}
          >
            <strong>{lvl}</strong>
            <div style={{ fontSize: "0.78rem", color: data.familiarity === lvl ? "inherit" : "#888", marginTop: "0.2rem", fontWeight: 400 }}>
              {descriptions[lvl]}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// STEP 6 — Help topics (multi-select, up to 3)
// ─────────────────────────────────────────────────────────────────
function StepHelpTopics({ data, onChange }) {
  const selected = data.helpTopics || [];
  function toggle(topic) {
    if (selected.includes(topic)) {
      onChange("helpTopics", selected.filter(t => t !== topic));
    } else if (selected.length < 3) {
      onChange("helpTopics", [...selected, topic]);
    }
  }
  return (
    <>
      <div className="q-label">
        5. What would you like help with?
        <div className="q-hint">Choose up to 3 topics.</div>
      </div>
      <div className="chip-grid">
        {HELP_OPTIONS.map(topic => (
          <button
            key={topic}
            className={`chip-btn ${selected.includes(topic) ? "selected" : ""}`}
            onClick={() => toggle(topic)}
            disabled={selected.length >= 3 && !selected.includes(topic)}
          >
            {topic}
          </button>
        ))}
      </div>
      <div className="chip-limit-note">
        {selected.length}/3 selected
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// STEP 7 — Learning style
// ─────────────────────────────────────────────────────────────────
function StepLearningStyle({ data, onChange }) {
  const icons = {
    "Step-by-step guidance": "🗺️",
    "Short explanations":    "⚡",
    "Quizzes & challenges":  "🎯",
  };
  return (
    <>
      <div className="q-label">6. How do you prefer learning?</div>
      <div className="opt-grid">
        {LEARNING_STYLES.map(style => (
          <button
            key={style}
            className={`opt-btn full-width ${data.learningStyle === style ? "selected" : ""}`}
            onClick={() => onChange("learningStyle", style)}
          >
            {icons[style]} {style}
          </button>
        ))}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// MULTI-STEP REGISTER FORM
// ─────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 7;
const STEP_LABELS = [
  "Account",
  "Nickname",
  "School Year",
  "Language",
  "Experience",
  "Goals",
  "Learning Style",
];

function RegisterPage({ onSwitch }) {
  const { login } = useApp();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    // Step 1 — credentials (original fields)
    name: "", age: "", password: "",
    // Step 2–7 — onboarding
    aiNickname: "",
    schoolYear: "",
    language: "",
    familiarity: "",
    helpTopics: [],
    learningStyle: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  // Per-step validation
  function validate() {
    const e = {};
    if (step === 1) {
      if (!form.name.trim()) e.name = "Name is required.";
      if (!form.age || isNaN(form.age) || +form.age < 5 || +form.age > 120)
        e.age = "Please enter a valid age (5–120).";
      if (!form.password || form.password.length < 4)
        e.password = "Password must be at least 4 characters.";
    }
    if (step === 2) {
      if (!form.aiNickname.trim()) e.aiNickname = "Please enter a nickname for the AI to use.";
    }
    if (step === 3 && !form.schoolYear) e.schoolYear = "Please pick a school year.";
    if (step === 4 && !form.language)   e.language   = "Please pick a language.";
    if (step === 5 && !form.familiarity) e.familiarity = "Please pick your level.";
    if (step === 6 && form.helpTopics.length === 0) e.helpTopics = "Pick at least one topic.";
    if (step === 7 && !form.learningStyle) e.learningStyle = "Please pick a learning style.";
    return e;
  }

  function next() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (step < TOTAL_STEPS) { setStep(s => s + 1); return; }
    // Final step — submit
    handleSubmit();
  }

  function back() { setStep(s => s - 1); }

  async function handleSubmit() {
    setLoading(true);
    try {
      const result = await dbRegister({
        name:          form.name,
        age:           +form.age,
        password:      form.password,
        aiNickname:    form.aiNickname,
        schoolYear:    form.schoolYear,
        language:      form.language,
        familiarity:   form.familiarity,
        helpTopics:    form.helpTopics,
        learningStyle: form.learningStyle,
      });
      if (!result.ok) {
        setErrors({ form: result.error });
      } else {
        login(result.user);
      }
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const progress = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">🛡</div>
          <div className="auth-logo-name">Cyberly</div>
        </div>

        {/* Progress */}
        <div className="auth-progress">
          <div className="auth-progress-track">
            <div className="auth-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="auth-progress-label">
            <span>Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Step content */}
        {step === 1 && <StepCredentials data={form} onChange={set} errors={errors} />}
        {step === 2 && <StepNickname    data={form} onChange={set} errors={errors} />}
        {step === 3 && <StepSchoolYear  data={form} onChange={set} errors={errors} />}
        {step === 4 && <StepLanguage    data={form} onChange={set} errors={errors} />}
        {step === 5 && <StepFamiliarity data={form} onChange={set} errors={errors} />}
        {step === 6 && <StepHelpTopics  data={form} onChange={set} errors={errors} />}
        {step === 7 && <StepLearningStyle data={form} onChange={set} errors={errors} />}

        {errors.form && <div className="field-error" style={{ marginTop: "0.5rem" }}>{errors.form}</div>}

        {/* Navigation */}
        <div className="auth-nav">
          {step > 1 && (
            <button className="btn-ghost" onClick={back}>← Back</button>
          )}
          <button
            className="btn-primary"
            onClick={next}
            disabled={loading}
          >
            {loading
              ? "Setting up…"
              : step === TOTAL_STEPS
                ? "🚀 Let's go!"
                : "Continue →"}
          </button>
        </div>

        {/* Switch to login */}
        <div className="auth-switch">
          Already have an account?{" "}
          <button onClick={onSwitch}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LOGIN PAGE  [ORIGINAL — unchanged logic]
// ─────────────────────────────────────────────────────────────────
function LoginPage({ onSwitch }) {
  const { login } = useApp();
  const [form, setForm] = useState({ name: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.password)    e.password = "Password is required.";
    return e;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const result = await dbLogin(form.name, form.password);
      if (!result.ok) {
        setErrors({ form: result.error });
      } else {
        login(result.user);
      }
    } catch {
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🛡</div>
          <div className="auth-logo-name">Cyberly</div>
        </div>
        <div className="auth-title">Welcome back</div>
        <div className="auth-sub">Sign in to continue your cyber learning journey.</div>

        <div className="field">
          <label>Name</label>
          <input
            placeholder="Your name"
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors({}); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          {errors.name && <div className="field-error">{errors.name}</div>}
        </div>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            placeholder="Your password"
            value={form.password}
            onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors({}); }}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
          {errors.password && <div className="field-error">{errors.password}</div>}
        </div>

        {errors.form && <div className="field-error" style={{ marginTop: "0.5rem" }}>{errors.form}</div>}

        <div className="auth-nav" style={{ marginTop: "1.5rem" }}>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>

        <div className="auth-switch">
          New here?{" "}
          <button onClick={onSwitch}>Create an account</button>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Gate (toggles between Login & Register) ─────────────────
function AuthGate() {
  const { go } = useApp();
  const [mode, setMode] = useState("login");
  return (
    <div>
      <button
        onClick={() => go("home")}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          background: "none", border: "none", cursor: "pointer",
          color: "#555", fontSize: "0.875rem", fontWeight: 500,
          padding: "1rem 1.5rem",
          transition: "color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.color = "var(--teal)"}
        onMouseLeave={e => e.currentTarget.style.color = "#555"}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        Back to Home
      </button>
      {mode === "login"
        ? <LoginPage    onSwitch={() => setMode("register")} />
        : <RegisterPage onSwitch={() => setMode("login")}    />
      }
    </div>
  );
}

// ─── Build AI system prompt from user profile ─────────────────────
function buildSystemPrompt(user) {
  const group = getAgeGroup(user.age);
  const topics = user.helpTopics?.join(", ") || "general cybersecurity";
  const lang   = user.language      || "English";
  const level  = user.familiarity   || "Beginner";
  const style  = user.learningStyle || "Short explanations";
  const nick   = user.aiNickname    || user.name;
  const year   = user.schoolYear    || "";

  return `You are CyberGuard, a friendly cybersecurity AI assistant for Malaysian students on the Cyberly platform.

User profile:
- Call them: ${nick}
- Age group: ${group.label}${year ? ` (${year})` : ""}
- Language preference: ${lang}
- Cybersecurity level: ${level}
- Topics of interest: ${topics}
- Learning style: ${style}

Adapt every response to match their level, preferred language, and learning style.
For Beginners: use simple analogies and avoid jargon.
For Intermediate: explain concepts with some technical depth.
For Advanced: engage with technical precision and real-world examples.
If their language is Bahasa Melayu or 中文, respond in that language unless they write in English first.
If Mixed, blend languages naturally.
Keep responses concise and encouraging. Use their nickname when appropriate.`;
}

// ─── Page: Home ───────────────────────────────────────────────────
function HomePage() {
  const { go } = useApp();

  const threatStats = [
    { emoji: "😨", value: "11%", desc: "of Malaysian teens have fallen victim to an online scam" },
    { emoji: "📧", value: "50%", desc: "of students have received scam-related emails or SMS" },
    { emoji: "🎓", value: "84.6%", desc: "of students never attended a scam awareness workshop" },
    { emoji: "📱", value: "96%", desc: "of Malaysian teens aged 12–17 go online every single day" },
  ];

  const topics = [
    { emoji: "🎣", label: "Phishing" },
    { emoji: "💸", label: "Online Scams" },
    { emoji: "📰", label: "Fake News" },
    { emoji: "🤖", label: "AI & Deepfakes" },
    { emoji: "🔐", label: "Passwords" },
    { emoji: "🕵️", label: "Privacy" },
  ];

  const steps = [
    { num: "01", icon: "✍️", title: "Sign up free", desc: "Create your profile in under a minute — tell us your age, language, and what you want to learn." },
    { num: "02", icon: "🤖", title: "Meet your AI tutor", desc: "CyberGuard AI adapts to your level and chats with you in English, BM, or Chinese." },
    { num: "03", icon: "🚀", title: "Learn & level up", desc: "Explore guides, beat simulations, and track your progress as your cyber skills grow." },
  ];

  return (
    <>
      {/* ── Hero ── */}
      <div className="hero">
        <h1>Stay Safe in the Digital World 🛡</h1>
        <p>
          Cyberly is your personal cybersecurity guide — powered by AI that adapts to your level,
          language, and learning style.
        </p>
        <button className="hero-cta" onClick={() => go("login")}>
          Get started free →
        </button>
        <div className="stat-row">
          <div className="stat-chip">🎓 Built for Malaysian students</div>
          <div className="stat-chip">🌐 Supports 3 languages</div>
          <div className="stat-chip">🤖 AI-personalised</div>
        </div>
      </div>

      {/* ── Threat Stats Strip ── */}
      <div style={{ background: "#1a2e1a", padding: "2.5rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5rem" }}>
            Did you know? — Cyber threats facing Malaysian teens right now
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            {threatStats.map(s => (
              <div key={s.value} style={{
                background: "rgba(255,255,255,0.06)", borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "1.25rem", textAlign: "center",
              }}>
                <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>{s.emoji}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2rem", fontWeight: 700, color: "var(--teal)", marginBottom: "0.35rem" }}>{s.value}</div>
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Why Cyberly ── */}
      <div className="section">
        <p className="section-title">Why Cyberly?</p>
        <p className="section-sub">Cybersecurity education that meets you where you are.</p>
        <div className="card-grid">
          {[
            { icon: "🧠", title: "Adaptive AI", desc: "Our AI adjusts explanations based on your experience level and preferred language." },
            { icon: "🔒", title: "Real Skills", desc: "Learn practical skills — spotting scams, protecting accounts, and browsing safely." },
            { icon: "🎯", title: "Focused Topics", desc: "Choose what matters to you — from online safety to cybersecurity careers." },
          ].map(c => (
            <div className="card" key={c.title}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.6rem" }}>{c.icon}</div>
              <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>{c.title}</div>
              <div style={{ color: "#666", fontSize: "0.875rem", lineHeight: 1.55 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cyber Threat of the Week ── */}
      <div className="section" style={{ paddingTop: 0 }}>
        <div style={{
          background: "linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%)",
          border: "1px solid #ffe082", borderRadius: 16,
          padding: "1.75rem 2rem", display: "flex", gap: "1.5rem",
          alignItems: "flex-start", flexWrap: "wrap",
        }}>
          <div style={{ fontSize: "2.5rem", flexShrink: 0 }}>⚠️</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <span style={{ background: "#ff9800", color: "#fff", fontSize: "0.7rem", fontWeight: 700, borderRadius: 99, padding: "0.2rem 0.65rem", letterSpacing: "0.05em" }}>
                THREAT OF THE WEEK
              </span>
            </div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.4rem", color: "#1a1a18" }}>
              AI Voice & Video Scams (Deepfakes)
            </div>
            <div style={{ fontSize: "0.875rem", color: "#555", lineHeight: 1.65 }}>
              Scammers in Malaysia are now using AI to clone the voices and faces of celebrities and family members to trick people into sending money. If you get an unexpected video call or voice message asking for money — even if it looks real — always verify through another channel before acting.
            </div>
          </div>
          <button
            onClick={() => go("resources")}
            style={{
              background: "#ff9800", color: "#fff", border: "none",
              borderRadius: 10, padding: "0.65rem 1.25rem",
              fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
              flexShrink: 0, alignSelf: "center",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#e65100"}
            onMouseLeave={e => e.currentTarget.style.background = "#ff9800"}
          >
            Learn more →
          </button>
        </div>
      </div>

      {/* ── Quick Topic Cards ── */}
      <div className="section" style={{ paddingTop: 0 }}>
        <p className="section-title">What do you want to learn today?</p>
        <p className="section-sub">Pick a topic and jump straight in.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          {topics.map(t => (
            <button
              key={t.label}
              onClick={() => go("resources")}
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                background: "#fff", border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 99, padding: "0.55rem 1.1rem",
                fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                color: "#333", transition: "all 0.15s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--teal-lt)";
                e.currentTarget.style.borderColor = "var(--teal)";
                e.currentTarget.style.color = "var(--teal)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.borderColor = "rgba(0,0,0,0.08)";
                e.currentTarget.style.color = "#333";
              }}
            >
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <div style={{ background: "var(--teal-lt)", borderTop: "1px solid rgba(29,158,117,0.12)", borderBottom: "1px solid rgba(29,158,117,0.12)", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <p className="section-title" style={{ textAlign: "center" }}>How Cyberly works</p>
          <p className="section-sub" style={{ textAlign: "center", marginBottom: "2rem" }}>Up and running in three simple steps.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem" }}>
            {steps.map((s, i) => (
              <div key={s.num} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "var(--teal)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
                  fontSize: "0.85rem", flexShrink: 0,
                }}>
                  {s.num}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.3rem" }}>
                    {s.icon} {s.title}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#555", lineHeight: 1.65 }}>{s.desc}</div>
                </div>
                {i < steps.length - 1 && (
                  <div style={{ display: "none" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom CTA ── */}
      <div style={{ background: "#1a2e1a", padding: "4rem 1.5rem", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>🚀</div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 600, color: "#fff", marginBottom: "0.75rem" }}>
            Ready to level up your cyber skills?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "2rem" }}>
            Join thousands of Malaysian teens learning how to stay safe online — for free, in your language, at your pace.
          </p>
          <button
            className="hero-cta"
            onClick={() => go("login")}
            style={{ fontSize: "1rem", padding: "0.85rem 2.5rem" }}
          >
            Get started free →
          </button>
          <div style={{ marginTop: "1.25rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>
            No credit card needed · Available in English, BM & 中文
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page: Dashboard ──────────────────────────────────────────────
function DashboardPage() {
  const { user, go } = useApp();
  const [tipIndex] = useState(() => Math.floor(Math.random() * 4));

  if (!user) { go("login"); return null; }

  const nick  = user.aiNickname || user.name;
  const group = getAgeGroup(user.age);

  const quickActions = [
    { icon: "📚", label: "Browse Resources",  desc: "Guides on scams, privacy & more", page: "resources", color: "#E3F2FD", accent: "#1E88E5" },
    { icon: "ℹ️",  label: "About the Project", desc: "Meet the team behind Cyberly",  page: "about",     color: "#F3E5F5", accent: "#8E24AA" },
    { icon: "📊", label: "My Progress",        desc: "See your learning stats & topics", page: "progress",  color: "#FFF8E1", accent: "#F59E0B" },
    { icon: "🏠",  label: "Back to Home",      desc: "Return to the landing page",      page: "home",      color: "#E8F5E9", accent: "#43A047" },
  ];

  const tips = [
    { emoji: "🎣", tip: "Never click links in unexpected emails or SMS — go directly to the official website instead." },
    { emoji: "🔐", tip: "Use a different password for every account. A password manager makes this easy." },
    { emoji: "🤔", tip: "Before sharing news online, verify it on Sebenarnya.my — Malaysia's official fact-check site." },
    { emoji: "📵", tip: "If someone calls claiming to be from a bank or government, hang up and call the official number." },
  ];

  const todayTip = tips[tipIndex];

  return (
    <div>
      {/* Welcome hero */}
      <div style={{
        background: "linear-gradient(135deg, var(--teal) 0%, #1a5c4a 100%)",
        padding: "2.5rem 1.5rem", color: "#fff",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              Your Dashboard
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 600, marginBottom: "0.35rem" }}>
              Welcome back, {nick} 👋
            </h1>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
              {group.label} · {user.familiarity || "Beginner"} level{user.schoolYear ? ` · ${user.schoolYear}` : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {[
              { val: "9", label: "Topics" },
              { val: "3", label: "Languages" },
              { val: "AI", label: "Powered" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "0.75rem 1rem", textAlign: "center", minWidth: 64 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.2rem" }}>{s.val}</div>
                <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.6)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">

        {/* Profile summary */}
        {user.helpTopics?.length > 0 && (
          <div className="card" style={{ marginBottom: "2rem", background: "var(--teal-lt)", border: "1px solid rgba(29,158,117,0.2)", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontWeight: 600, marginBottom: "0.4rem", color: "var(--teal)" }}>🎯 Your learning profile</div>
              <div style={{ fontSize: "0.85rem", color: "#333", lineHeight: 1.7 }}>
                <span>🌐 {user.language || "English"}</span>
                <span style={{ margin: "0 0.5rem" }}>·</span>
                <span>📖 {user.learningStyle}</span>
                <span style={{ margin: "0 0.5rem" }}>·</span>
                <span>🎯 {user.helpTopics.join(", ")}</span>
              </div>
            </div>
            <button onClick={() => go("resources")} style={{ background: "var(--teal)", color: "#fff", border: "none", borderRadius: 10, padding: "0.55rem 1.1rem", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
              Explore resources →
            </button>
          </div>
        )}

        {/* Daily tip */}
        <div style={{
          background: "#fffde7", border: "1px solid #ffe082", borderRadius: 14,
          padding: "1.1rem 1.4rem", display: "flex", gap: "0.85rem",
          alignItems: "flex-start", marginBottom: "2rem",
        }}>
          <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{todayTip.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#e65100", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>Daily Cyber Tip</div>
            <div style={{ fontSize: "0.88rem", color: "#444", lineHeight: 1.6 }}>{todayTip.tip}</div>
          </div>
        </div>

        {/* Quick actions */}
        <p className="section-title" style={{ fontSize: "1.1rem", marginBottom: "0.4rem" }}>Quick actions</p>
        <p className="section-sub" style={{ marginBottom: "1.25rem" }}>Jump to what you need.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {quickActions.map(a => (
            <button
              key={a.label}
              onClick={() => go(a.page)}
              style={{
                background: a.color, border: `1px solid ${a.accent}22`,
                borderRadius: 14, padding: "1.25rem", textAlign: "left",
                cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}
            >
              <div style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>{a.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: a.accent, marginBottom: "0.2rem" }}>{a.label}</div>
              <div style={{ fontSize: "0.8rem", color: "#666" }}>{a.desc}</div>
            </button>
          ))}
        </div>

        {/* CyberGuard AI */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <div>
            <p className="section-title" style={{ fontSize: "1.1rem", margin: 0 }}>🛡 CyberGuard AI</p>
            <p className="section-sub" style={{ margin: "0.25rem 0 0" }}>Ask anything about staying safe online.</p>
          </div>
          <span style={{ background: "var(--teal-lt)", color: "var(--teal)", fontSize: "0.72rem", fontWeight: 600, borderRadius: 99, padding: "0.25rem 0.75rem" }}>
            Personalised to your profile
          </span>
        </div>
        <AgentPanel />
      </div>
    </div>
  );
}

// ─── Agent Panel ──────────────────────────────────────────────────
function AgentPanel() {
  const { user } = useApp();
  const [messages, setMessages] = useState([]);
  const [history,  setHistory]  = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const endRef = useRef(null);

  const nick = user?.aiNickname || user?.name || "there";

  useEffect(() => {
    setMessages([{
      role: "ai",
      text: `Hi ${nick}! I'm CyberGuard — your personal cybersecurity guide. What would you like to learn today? 🛡`,
    }]);
  }, [nick]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(q) {
    if (!q.trim() || loading) return;
    setInput("");
    setError(null);
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const systemPrompt = buildSystemPrompt(user);
      const aiText = await askClaude(
        [...history, { role: "user", content: q }],
        systemPrompt
      );
      setMessages(prev => [...prev, { role: "ai", text: aiText }]);
      setHistory(prev => [
        ...prev,
        { role: "user", content: q },
        { role: "assistant", content: aiText },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="agent-panel">
      <div className="agent-header">🛡 CyberGuard AI</div>
      <div className="agent-messages">
        {messages.map((m, i) => (
          <div key={i} className={`agent-bubble ${m.role}`} style={{ whiteSpace: "pre-wrap" }}>
            {m.text}
          </div>
        ))}
        {loading && <div className="agent-bubble ai loading">CyberGuard is thinking…</div>}
        {error && <p style={{ color: "var(--coral)", fontSize: "0.82rem" }}>⚠️ {error}</p>}
        <div ref={endRef} />
      </div>
      <div className="agent-input-row">
        <input
          className="agent-input"
          placeholder="Ask about cybersecurity…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          disabled={loading}
        />
        <button
          className="agent-send"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ─── Page: Resources ──────────────────────────────────────────────
const TOPICS = [
  {
    id: 1, category: "Scams", title: "Phishing",
    summary: "Recognise the bait before you take it.",
    content: [
      "Phishing is a type of cyber attack where criminals impersonate legitimate organisations — banks, delivery services, or even government agencies — through emails, SMS messages, or fake websites. The goal is to trick you into handing over sensitive information like passwords, credit card numbers, or one-time PINs. These messages often create a false sense of urgency, warning you that your account will be suspended or that a parcel is waiting unless you act immediately.",
      "Modern phishing attacks have become highly sophisticated. Spear phishing targets specific individuals using personal details gathered from social media, making the message feel genuine. Smishing uses SMS, while vishing is conducted over phone calls. Even tech-savvy users fall victim because attackers study their targets carefully and craft believable scenarios tailored to their situation.",
      "To protect yourself, always verify the sender's email address carefully — look for subtle misspellings like 'paypa1.com' instead of 'paypal.com'. Never click links in unsolicited messages; instead, navigate directly to the official website. Enable multi-factor authentication on your accounts so that even if your password is stolen, attackers cannot easily access your data.",
    ],
    source: "https://www.csa.gov.sg/our-programmes/cybersecurity-outreach/cybersecurity-awareness/resources/phishing",
    sourceLabel: "Cyber Security Agency of Singapore",
  },
  {
    id: 2, category: "Scams", title: "Online Scams",
    summary: "Know the tricks fraudsters use to steal your money.",
    content: [
      "Online scams encompass a wide range of fraudulent schemes designed to deceive people into sending money or revealing personal information. Common types include e-commerce scams (fake online shops that take payment but never deliver), investment scams promising unrealistically high returns, love scams where criminals build fake romantic relationships over weeks or months before requesting money, and job scams offering easy income for minimal work.",
      "Malaysia consistently ranks among the countries with high rates of online fraud. The Royal Malaysia Police (PDRM) reported billions in losses annually, with Macau scams, phone scams, and investment fraud being the most prevalent. Victims often feel embarrassed to report these crimes, which allows scammers to continue operating and targeting others.",
      "The best defence is healthy scepticism. If an offer sounds too good to be true, it almost certainly is. Always verify the legitimacy of websites, sellers, and investment platforms before transferring any money. Use secure payment methods with buyer protection, and report suspected scams to the National Scam Response Centre (NSRC) hotline at 997.",
    ],
    source: "https://www.nsrc.my/",
    sourceLabel: "National Scam Response Centre (NSRC) Malaysia",
  },
  {
    id: 3, category: "Misinformation", title: "Misinformation & Fake News",
    summary: "Stop false information from spreading through your network.",
    content: [
      "Misinformation refers to false or inaccurate information spread regardless of intent, while disinformation is deliberately fabricated to deceive. In the social media era, both travel at extraordinary speed. A single misleading post can reach thousands of people within hours, shaping opinions on health, elections, and public safety before any correction can catch up.",
      "Malaysia introduced the Anti-Fake News Act in 2018, reflecting how seriously governments treat this issue. False information about health treatments, political figures, and natural disasters has caused real-world harm — from people refusing vaccines to mob violence triggered by rumours. The viral nature of social media platforms incentivises outrage and novelty over accuracy, making misinformation particularly potent.",
      "Before sharing anything, apply the SIFT method: Stop before reacting, Investigate the source, Find better coverage from credible outlets, and Trace claims back to their origin. Fact-checking websites like Sebenarnya.my (Malaysia's official fact-check portal) and AFP Fact Check provide verified information on viral claims. Remember that sharing false information, even unintentionally, makes you part of the problem.",
    ],
    source: "https://sebenarnya.my/",
    sourceLabel: "Sebenarnya.my — Malaysia's Official Fact Check Portal",
  },
  {
    id: 4, category: "AI & Technology", title: "AI-Generated Content",
    summary: "Understand what machines can create — and why it matters.",
    content: [
      "Artificial intelligence can now generate text, images, audio, and video that are virtually indistinguishable from human-created content. Tools like large language models (LLMs) can write convincing articles, product reviews, and social media posts at scale. AI image generators can produce photorealistic pictures of events that never happened. This capability has enormous legitimate uses — from design and accessibility to education — but also serious risks.",
      "AI-generated content becomes dangerous when it is used without disclosure to deceive. Fake reviews manipulate purchasing decisions. AI-written propaganda floods information ecosystems. Synthetic media is used in scams where criminals impersonate executives or family members in audio or video calls. As these tools become cheaper and easier to use, the volume of synthetic content online is growing rapidly.",
      "Critical evaluation is essential. Look for unnatural repetition, overly formal language, or images with subtle errors (distorted hands, inconsistent backgrounds). Many AI tools now embed watermarks or metadata, and AI-detection platforms are improving. When consuming content on important topics, prioritise established news organisations and primary sources over viral social media posts, regardless of how polished they appear.",
    ],
    source: "https://www.mcmc.gov.my/en/media/press-clippings/understanding-ai-generated-content",
    sourceLabel: "Malaysian Communications and Multimedia Commission (MCMC)",
  },
  {
    id: 5, category: "AI & Technology", title: "Deepfakes",
    summary: "AI-manipulated media and how to spot it.",
    content: [
      "Deepfakes are synthetic media — most commonly videos or audio recordings — in which a person's likeness, voice, or words are digitally replaced or manipulated using artificial intelligence. The technology has advanced so rapidly that high-quality deepfakes can now be created by anyone with a consumer-grade computer and freely available software. While deepfakes have legitimate creative applications in film and entertainment, they are increasingly weaponised for harm.",
      "The threats posed by deepfakes are serious and varied. Politicians and public figures have been targeted with fabricated videos that misrepresent their statements. Revenge porn deepfakes — non-consensual synthetic intimate images — cause devastating psychological harm, particularly to women. Business email compromise scams now use deepfake audio to impersonate CEOs and authorise fraudulent wire transfers. In Malaysia, deepfake scam videos impersonating celebrities and public figures to promote fake investment schemes have become a serious problem.",
      "Detecting deepfakes requires careful observation: look for unnatural blinking patterns, inconsistent lighting on the face, blurry or morphing edges around the hairline, and audio that does not quite match lip movements. Reverse image searches and tools like Microsoft's Video Authenticator can help verify media authenticity. If you receive an unexpected request via video or audio — especially involving money — verify it through an independent channel before acting.",
    ],
    source: "https://www.interpol.int/en/Crimes/Cybercrime/Deepfakes",
    sourceLabel: "INTERPOL — Deepfakes Resource",
  },
  {
    id: 6, category: "Privacy", title: "Privacy & Personal Data",
    summary: "Take control of who knows what about you online.",
    content: [
      "Every time you use an app, browse a website, or make an online purchase, you generate data. This data — your location, browsing habits, purchase history, health information, and more — is collected, analysed, and often sold by companies to advertisers and data brokers. Malaysia's Personal Data Protection Act (PDPA) 2010 provides some legal safeguards, but individuals must also take proactive steps to protect their own privacy.",
      "Data breaches are a constant risk. When companies that hold your information are hacked, your personal details can end up on the dark web, sold to fraudsters, or used for identity theft. Large-scale breaches affecting millions of Malaysians have been reported involving telecommunications companies, financial institutions, and government databases. Once your data is out, it is very difficult to contain.",
      "Minimise your digital footprint by only providing necessary information to online services. Read privacy policies and adjust app permissions — does a flashlight app really need access to your contacts? Use a different strong password for every service (a password manager makes this easy), enable two-factor authentication, and regularly check whether your email appears in known data breaches at HaveIBeenPwned.com.",
    ],
    source: "https://www.pdp.gov.my/jpdpv2/",
    sourceLabel: "Department of Personal Data Protection Malaysia (JPDP)",
  },
  {
    id: 7, category: "Safety", title: "Cyberbullying",
    summary: "Recognise, respond to, and prevent online harassment.",
    content: [
      "Cyberbullying is the use of digital technology — social media, messaging apps, gaming platforms, or email — to repeatedly harass, threaten, humiliate, or target another person. Unlike traditional bullying, it can occur 24 hours a day, reach a vast audience instantly, and follow victims wherever they go. Screenshots and viral sharing mean hurtful content can be nearly impossible to completely remove. Young people are disproportionately affected, but adults experience cyberbullying too, particularly in the form of workplace harassment and coordinated online pile-ons.",
      "The psychological impact of cyberbullying is severe and well-documented: victims commonly experience anxiety, depression, low self-esteem, and in serious cases, suicidal ideation. In Malaysia, cyberbullying is addressed under Section 233 of the Communications and Multimedia Act 1998, which makes it illegal to transmit offensive or menacing content online. Penalties can include fines and imprisonment.",
      "If you or someone you know is being cyberbullied: do not respond to the bully, document everything with screenshots, block and report the user on the platform, and — critically — tell a trusted adult, school counsellor, or contact Talian Kasih at 15999 for support. Bystanders play a powerful role: refusing to share or engage with bullying content and offering support to victims can significantly reduce harm.",
    ],
    source: "https://www.unicef.org/malaysia/what-is-cyberbullying",
    sourceLabel: "UNICEF Malaysia — Cyberbullying Resources",
  },
  {
    id: 8, category: "Passwords", title: "Password Security",
    summary: "Why length beats complexity — and how to remember them.",
    content: [
      "Weak passwords remain the single most common way accounts are compromised. Attackers use automated tools that can try billions of password combinations per second, meaning a short password — even one with numbers and symbols — can be cracked in minutes. The most effective passwords are long passphrases: a string of four or more random words is far harder to crack than a short complex password, and much easier for a human to remember.",
      "Password reuse is equally dangerous. When one website suffers a data breach, attackers take the stolen username-password combinations and automatically try them on hundreds of other sites (a technique called credential stuffing). If you use the same password everywhere, a breach at one obscure forum can lead to your bank account being compromised. Each account you own should have a unique password.",
      "A password manager — such as Bitwarden (free and open source), 1Password, or the password manager built into your browser — solves both problems. It generates and stores long, random, unique passwords for every site, so you only need to remember one master password. Pair this with two-factor authentication (2FA) on all important accounts: even if your password is stolen, an attacker cannot log in without access to your phone or authenticator app.",
    ],
    source: "https://www.cisa.gov/secure-our-world/use-strong-passwords",
    sourceLabel: "CISA — Use Strong Passwords",
  },
  {
    id: 9, category: "Beginner", title: "Digital Citizenship",
    summary: "Be responsible, respectful, and rights-aware online.",
    content: [
      "Digital citizenship refers to the responsible and ethical use of technology and the internet. Just as physical citizenship carries rights and responsibilities, being active online means participating in a shared space that is shaped by how all of us behave. Good digital citizens think critically about the content they consume and share, respect others' privacy and dignity, and contribute constructively to online communities.",
      "The digital world carries real legal responsibilities. Sharing someone else's copyrighted content, posting defamatory statements, distributing intimate images without consent, and inciting hatred online are all illegal in Malaysia under various laws including the Communications and Multimedia Act, the Defamation Act, and the Penal Code. The anonymity of the internet is increasingly illusory — authorities regularly identify and prosecute individuals for online offences.",
      "Practising good digital citizenship starts with small habits: pause before posting to consider how your words might affect others; verify information before sharing it; protect your personal information and respect others'; speak up when you witness online abuse. Digital literacy education is expanding in Malaysian schools, but everyone — regardless of age — benefits from regularly reflecting on how they show up in digital spaces.",
    ],
    source: "https://www.digitalcitizenship.net/",
    sourceLabel: "DigitalCitizenship.net",
  },
];

const TOPIC_COLORS = {
  Scams:             { bg: "#FFF3E0", text: "#E65100", dot: "#FF9800" },
  Misinformation:    { bg: "#F3E5F5", text: "#6A1B9A", dot: "#AB47BC" },
  "AI & Technology": { bg: "#E8F5E9", text: "#1B5E20", dot: "#43A047" },
  Privacy:           { bg: "#E3F2FD", text: "#0D47A1", dot: "#1E88E5" },
  Safety:            { bg: "#FCE4EC", text: "#880E4F", dot: "#E91E63" },
  Passwords:         { bg: "#E0F7FA", text: "#006064", dot: "#00ACC1" },
  Beginner:          { bg: "#E8F5E9", text: "#2E7D32", dot: "#66BB6A" },
};

function ResourcesPage() {
  const { go } = useApp();
  const [selected, setSelected]   = useState(null);
  const [filter,   setFilter]     = useState("All");
  const topic = TOPICS.find(t => t.id === selected);

  const categories = ["All", ...Array.from(new Set(TOPICS.map(t => t.category)))];
  const filtered   = filter === "All" ? TOPICS : TOPICS.filter(t => t.category === filter);

  const BackBtn = () => (
    <button
      onClick={() => go("home")}
      style={{
        display: "inline-flex", alignItems: "center", gap: "0.4rem",
        background: "none", border: "none", cursor: "pointer",
        color: "#555", fontSize: "0.875rem", fontWeight: 500,
        padding: "0", marginBottom: "1.5rem", transition: "color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.color = "var(--teal)"}
      onMouseLeave={e => e.currentTarget.style.color = "#555"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 5l-7 7 7 7"/>
      </svg>
      Back to Home
    </button>
  );

  return (
    <div>
      {/* Hero banner */}
      <div style={{
        background: "linear-gradient(135deg, #1a2e1a 0%, #2d4a2d 100%)",
        padding: "3rem 1.5rem 2.5rem", color: "#fff", textAlign: "center",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📚</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 600, marginBottom: "0.75rem" }}>
            Cyber Wellness Resources
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            Curated guides on the cyber threats that matter most to Malaysian teens. Click any card to read the full guide.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { val: "9", label: "Topics covered" },
              { val: "100%", label: "Free to read" },
              { val: "MY", label: "Malaysia focused" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "0.6rem 1.2rem", textAlign: "center" }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.2rem", color: "var(--teal)" }}>{s.val}</div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="section">
        <BackBtn />

        {/* Category filter pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.75rem" }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                background: filter === cat ? "var(--teal)" : "#fff",
                color: filter === cat ? "#fff" : "#555",
                border: filter === cat ? "1px solid var(--teal)" : "1px solid rgba(0,0,0,0.1)",
                borderRadius: 99, padding: "0.4rem 1rem",
                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {cat}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#999", alignSelf: "center" }}>
            {filtered.length} guide{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Cards grid */}
        <div className="res-grid">
          {filtered.map(t => {
            const cat = TOPIC_COLORS[t.category] || { bg: "#E8EDE8", text: "#1D9E75", dot: "#1D9E75" };
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                style={{
                  background: "#fff", border: "1px solid rgba(0,0,0,0.07)",
                  borderRadius: 14, padding: "1.25rem", textAlign: "left",
                  cursor: "pointer", transition: "box-shadow .2s, transform .2s, border-color .2s",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  display: "flex", flexDirection: "column", gap: "0.6rem",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(29,158,117,0.13)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "var(--teal)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)";
                }}
              >
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: cat.bg, color: cat.text,
                  borderRadius: 99, padding: "0.2rem 0.65rem",
                  fontSize: "0.72rem", fontWeight: 600, alignSelf: "flex-start",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.dot, display: "inline-block" }} />
                  {t.category}
                </span>
                <div className="res-title">{t.title}</div>
                <div className="res-desc">{t.summary}</div>
                <span style={{ fontSize: "0.78rem", color: "var(--teal)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: "auto" }}>
                  Read guide →
                </span>
              </button>
            );
          })}
        </div>

        {/* Safety tip banner */}
        <div style={{
          marginTop: "2.5rem", background: "var(--teal-lt)",
          border: "1px solid rgba(29,158,117,0.2)", borderRadius: 14,
          padding: "1.25rem 1.5rem", display: "flex", gap: "1rem", alignItems: "center",
        }}>
          <span style={{ fontSize: "1.5rem", flexShrink: 0 }}>💡</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--teal)", marginBottom: "0.2rem" }}>Pro tip</div>
            <div style={{ fontSize: "0.85rem", color: "#444", lineHeight: 1.6 }}>
              Not sure where to start? Try <strong>Phishing</strong> or <strong>Password Security</strong> — they are the most common threats facing Malaysian teens right now.
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {topic && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(10,20,10,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 300, padding: "1.5rem",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 18, maxWidth: 660, width: "100%",
              maxHeight: "85vh", overflowY: "auto", padding: "2.5rem",
              boxShadow: "0 24px 64px rgba(0,0,0,0.22)", position: "relative",
            }}
          >
            <button
              onClick={() => setSelected(null)}
              style={{
                position: "absolute", top: 16, right: 16,
                background: "#F1EFE8", border: "none", borderRadius: "50%",
                width: 34, height: 34, cursor: "pointer", fontSize: 16, color: "#555",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >✕</button>

            {(() => {
              const cat = TOPIC_COLORS[topic.category] || { bg: "#E8EDE8", text: "#1D9E75", dot: "#1D9E75" };
              return (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: cat.bg, color: cat.text,
                  borderRadius: 99, padding: "0.2rem 0.65rem",
                  fontSize: "0.72rem", fontWeight: 600, marginBottom: "0.9rem",
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.dot, display: "inline-block" }} />
                  {topic.category}
                </span>
              );
            })()}

            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.4rem", fontWeight: 600, marginBottom: "1.25rem", color: "#1a1a18" }}>
              {topic.title}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {topic.content.map((para, i) => (
                <p key={i} style={{ margin: 0, fontSize: "0.9rem", color: "#374237", lineHeight: 1.75 }}>{para}</p>
              ))}
            </div>

            <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", margin: "1.75rem 0 1.25rem" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.78rem", color: "#aaa" }}>Source: <em>{topic.sourceLabel}</em></span>
              <a
                href={topic.source} target="_blank" rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "var(--teal)", color: "#fff",
                  borderRadius: 10, padding: "0.6rem 1.25rem",
                  fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
                }}
              >Learn more ↗</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page: About ──────────────────────────────────────────────────
function AboutPage() {
  const { go } = useApp();

  const members = [
    { initials: "JJ",  name: "Jayron Poi",     role: "Web Developer",                   desc: "Ensures logic and webpage usability are functional, and leads implementation of Agentic AI features and adaptive learning tools." },
    { initials: "JH",  name: "Chung Jin Hong", role: "UI/UX Designer",                  desc: "Develops the core wireframe and low-fidelity prototype design, ensuring the interface is tailored to our teenage target demographic." },
    { initials: "EC",  name: "Edward Chang",   role: "System Architect & Chatbot Lead", desc: "Handles backend architecture and AI workflow planning, ensuring components are streamlined for adaptive learning features." },
    { initials: "AB",  name: "Arman",          role: "Agentic AI Personalisation",      desc: "Builds Agentic AI analytics for personalised features and adaptive learning, focusing on user behaviour analysis." },
    { initials: "PW",  name: "Puah Wen Zhen",  role: "Agentic AI Module Lead",          desc: "Leads the implementation of system architecture and the Agentic AI module, with support in chatbot functionalities." },
  ];

  const features = [
    { icon: "🤖", title: "Agentic AI Guidance",      desc: "Autonomous, goal-oriented learning support with scenario-based decision assistance and real-time personalised recommendations." },
    { icon: "💬", title: "Cyber Wellness Chatbot",    desc: "Real-time conversational support that answers cybersecurity questions through natural language interaction." },
    { icon: "🎯", title: "Adaptive Difficulty",       desc: "Auto-selects difficulty based on the user's knowledge and progress for a more effective lesson experience." },
    { icon: "🛡",  title: "Cyber Threat Simulations", desc: "Simulate phishing, scams, and misinformation scenarios to sharpen critical thinking and cybersecurity decisions." },
    { icon: "📊", title: "Progress Tracking",         desc: "Monitors learning progress and engagement patterns to assess effectiveness and drive adaptive recommendations." },
    { icon: "🎮", title: "Gamified Challenges",       desc: "Optional quizzes, achievements, and interactive activities to boost motivation, engagement, and knowledge retention." },
  ];

  const stats = [
    { value: "56%",   label: "of Malaysian teens say they can identify scams" },
    { value: "11%",   label: "have already fallen victim to an online scam" },
    { value: "84.6%", label: "of students never attended a scam awareness workshop" },
    { value: "96%",   label: "of teens aged 12–17 go online daily" },
  ];

  const objectives = [
    "Design and develop an AI-driven Cyber Wellness Toolkit that enhances cybersecurity awareness among Malaysian teenagers aged 13–17.",
    "Create an intelligent cybersecurity chatbot for real-time conversational learning in multiple languages.",
    "Build an Agentic AI module for personalised learning recommendations and adaptive difficulty adjustment.",
    "Incorporate optional gamified learning areas — quizzes, simulations, and real-life cyber threat scenarios.",
    "Evaluate the system through user interaction analysis, pre/post assessments, and feedback collection.",
  ];

  return (
    <div>
      {/* Hero banner */}
      <div style={{
        background: "linear-gradient(135deg, #1a2e1a 0%, #2d4a2d 100%)",
        padding: "3.5rem 1.5rem 3rem", textAlign: "center", color: "#fff",
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Capstone Project · Group 20 · Taylor's University
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 600, marginBottom: "0.85rem", lineHeight: 1.3 }}>
            Interactive Cyber Wellness Toolkit for Teens
          </h1>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.95rem", lineHeight: 1.7, marginBottom: "1.5rem" }}>
            An AI-driven platform built to enhance cybersecurity awareness and promote safer digital behaviour among Malaysian teenagers aged 13–17.
          </p>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 99, padding: "0.45rem 1rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.65)" }}>
            🏫 In collaboration with Cybersecurity Hub DISS – Impact Lab
          </div>
        </div>
      </div>

      <div className="section">

        {/* Back button */}
        <button
          onClick={() => go("home")}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            background: "none", border: "none", cursor: "pointer",
            color: "#555", fontSize: "0.875rem", fontWeight: 500,
            padding: "0", marginBottom: "2rem", transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--teal)"}
          onMouseLeave={e => e.currentTarget.style.color = "#555"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back to Home
        </button>

        {/* Stats */}
        <div style={{ marginBottom: "3rem" }}>
          <p className="section-title" style={{ fontSize: "1.3rem" }}>Why this matters</p>
          <p className="section-sub">The cyber threat landscape facing Malaysian teenagers is serious and growing.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            {stats.map(s => (
              <div key={s.value} className="card" style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "2rem", fontWeight: 700, color: "var(--teal)", marginBottom: "0.4rem" }}>{s.value}</div>
                <div style={{ fontSize: "0.82rem", color: "#666", lineHeight: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div style={{ marginBottom: "3rem" }}>
          <p className="section-title" style={{ fontSize: "1.3rem" }}>What we built</p>
          <p className="section-sub">A modular, AI-powered toolkit with six core capabilities.</p>
          <div className="card-grid">
            {features.map(f => (
              <div key={f.title} className="card" style={{ padding: "1.25rem" }}>
                <div style={{ fontSize: "1.6rem", marginBottom: "0.6rem" }}>{f.icon}</div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.35rem" }}>{f.title}</div>
                <div style={{ color: "#666", fontSize: "0.82rem", lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: "3rem" }}>
          <p className="section-title" style={{ fontSize: "1.3rem" }}>How it works</p>
          <p className="section-sub">Every experience is shaped around the individual learner.</p>
          <div className="card" style={{ background: "var(--teal-lt)", border: "1px solid rgba(29,158,117,0.2)", padding: "1.75rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.25rem" }}>
              {[
                { step: "01", title: "You sign up",         desc: "Complete a short onboarding profile — your age, language, familiarity, and learning goals." },
                { step: "02", title: "AI builds your path", desc: "The Agentic AI module constructs a personalised learning path based on your responses." },
                { step: "03", title: "Learn your way",      desc: "Chat with CyberGuard AI, explore resources, and tackle simulations — all adapted to your level." },
                { step: "04", title: "Track your growth",   desc: "Your progress is tracked to continuously refine recommendations over time." },
              ].map(s => (
                <div key={s.step} style={{ display: "flex", gap: "0.85rem" }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", fontWeight: 700, color: "var(--teal)", opacity: 0.5, flexShrink: 0 }}>{s.step}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{s.title}</div>
                    <div style={{ fontSize: "0.82rem", color: "#555", lineHeight: 1.6 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Objectives */}
        <div style={{ marginBottom: "3rem" }}>
          <p className="section-title" style={{ fontSize: "1.3rem" }}>Project objectives</p>
          <p className="section-sub">Five goals that guide everything we build.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {objectives.map((obj, i) => (
              <div key={i} className="card" style={{ display: "flex", gap: "1rem", alignItems: "flex-start", padding: "1rem 1.25rem" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", background: "var(--teal-lt)",
                  color: "var(--teal)", fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700, fontSize: "0.78rem", display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}>{i + 1}</div>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#444", lineHeight: 1.65 }}>{obj}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div>
          <p className="section-title" style={{ fontSize: "1.3rem" }}>Meet the team</p>
          <p className="section-sub">Group 20 — Taylor's University Capstone Project</p>

          {/* Supervisor */}
          <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", background: "var(--teal-lt)", border: "1px solid rgba(29,158,117,0.2)", padding: "1.25rem 1.5rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--teal)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "1rem", flexShrink: 0 }}>SZ</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Dr Siti Zainab Ibrahim</div>
              <div style={{ fontSize: "0.8rem", color: "var(--teal)", fontWeight: 600, marginBottom: "0.2rem" }}>Project Supervisor · Cybersecurity Hub DISS – Impact Lab</div>
              <div style={{ fontSize: "0.8rem", color: "#555" }}>Provides guidance, professional oversight, and industry client direction throughout the project.</div>
            </div>
          </div>

          <div className="team-grid">
            {members.map(m => (
              <div className="team-card" key={m.name} style={{ padding: "1.5rem 1.25rem" }}>
                <div className="avatar">{m.initials}</div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{m.name}</div>
                <div style={{ color: "var(--teal)", fontSize: "0.75rem", fontWeight: 600, margin: "0.2rem 0 0.5rem" }}>{m.role}</div>
                <div style={{ color: "#777", fontSize: "0.78rem", lineHeight: 1.55 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}


// ─── Page: Progress ──────────────────────────────────────────────
function ProgressPage() {
  const { user, go } = useApp();
  if (!user) { go("login"); return null; }

  const nick  = user.aiNickname || user.name;
  const topics = user.helpTopics || [];
  const level  = user.familiarity || "Beginner";
  const lang   = user.language    || "English";
  const style  = user.learningStyle || "Not set";

  const allTopics = ["Phishing", "Online Scams", "Misinformation & Fake News", "AI-Generated Content", "Deepfakes", "Privacy & Personal Data", "Cyberbullying", "Password Security", "Digital Citizenship"];

  const levelMap = { Beginner: 1, Intermediate: 2, Advanced: 3 };
  const levelVal = levelMap[level] || 1;

  const badges = [
    { icon: "🛡", label: "Joined Cyberly",     earned: true  },
    { icon: "💬", label: "First AI Chat",         earned: true  },
    { icon: "📚", label: "Explored Resources",    earned: topics.length > 0 },
    { icon: "🎯", label: "Set Learning Goals",    earned: topics.length > 0 },
    { icon: "🌐", label: "Multilingual Learner",  earned: lang !== "English" },
    { icon: "🏆", label: "Intermediate Achiever", earned: levelVal >= 2 },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #2d4a2d 100%)", padding: "2.5rem 1.5rem", color: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" }}>My Progress</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 600, marginBottom: "0.3rem" }}>
            {nick}'s Learning Journey 📊
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>{level} level · {lang} · {style}</p>
        </div>
      </div>

      <div className="section">
        {/* Back button */}
        <button
          onClick={() => go("dashboard")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: "0.875rem", fontWeight: 500, padding: "0", marginBottom: "2rem", transition: "color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--teal)"}
          onMouseLeave={e => e.currentTarget.style.color = "#555"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Dashboard
        </button>

        {/* Profile snapshot */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          {[
            { icon: "🎓", label: "Level",    value: level },
            { icon: "🌐", label: "Language", value: lang },
            { icon: "📖", label: "Style",    value: style },
            { icon: "🎯", label: "Topics",   value: `${topics.length} selected` },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: "center", padding: "1.25rem 1rem" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.35rem" }}>{s.icon}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1rem", color: "var(--teal)", marginBottom: "0.2rem" }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#888" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Skill level bar */}
        <div style={{ marginBottom: "2.5rem" }}>
          <p className="section-title" style={{ fontSize: "1.1rem" }}>Skill Level</p>
          <p className="section-sub" style={{ marginBottom: "1rem" }}>Your current cybersecurity knowledge level.</p>
          <div className="card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{level}</span>
              <span style={{ fontSize: "0.85rem", color: "#888" }}>{levelVal}/3</span>
            </div>
            <div style={{ background: "#eee", borderRadius: 99, height: 10, overflow: "hidden" }}>
              <div style={{ background: "var(--teal)", width: `${(levelVal / 3) * 100}%`, height: "100%", borderRadius: 99, transition: "width 0.6s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
              {["Beginner", "Intermediate", "Advanced"].map((l, i) => (
                <span key={l} style={{ fontSize: "0.72rem", color: i + 1 <= levelVal ? "var(--teal)" : "#bbb", fontWeight: i + 1 <= levelVal ? 600 : 400 }}>{l}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Topics of interest */}
        <div style={{ marginBottom: "2.5rem" }}>
          <p className="section-title" style={{ fontSize: "1.1rem" }}>Topics You're Learning</p>
          <p className="section-sub" style={{ marginBottom: "1rem" }}>Based on your profile — explore guides for each one.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
            {allTopics.map(t => {
              const active = topics.includes(t);
              return (
                <div key={t} style={{
                  background: active ? "var(--teal-lt)" : "#f9f9f9",
                  border: active ? "1px solid rgba(29,158,117,0.3)" : "1px solid rgba(0,0,0,0.07)",
                  borderRadius: 10, padding: "0.75rem 1rem",
                  display: "flex", alignItems: "center", gap: "0.6rem",
                }}>
                  <span style={{ fontSize: "1rem" }}>{active ? "✅" : "⬜"}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: active ? 600 : 400, color: active ? "var(--teal)" : "#888" }}>{t}</span>
                </div>
              );
            })}
          </div>
          <button onClick={() => go("resources")} style={{ marginTop: "1rem", background: "var(--teal)", color: "#fff", border: "none", borderRadius: 10, padding: "0.6rem 1.25rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
            Explore all guides →
          </button>
        </div>

        {/* Badges */}
        <div>
          <p className="section-title" style={{ fontSize: "1.1rem" }}>Badges</p>
          <p className="section-sub" style={{ marginBottom: "1rem" }}>Achievements unlocked from your activity.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "1rem" }}>
            {badges.map(b => (
              <div key={b.label} className="card" style={{
                textAlign: "center", padding: "1.25rem 0.75rem",
                opacity: b.earned ? 1 : 0.4,
                filter: b.earned ? "none" : "grayscale(1)",
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>{b.icon}</div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: b.earned ? "#1a1a18" : "#aaa" }}>{b.label}</div>
                {b.earned && <div style={{ fontSize: "0.68rem", color: "var(--teal)", marginTop: "0.25rem", fontWeight: 600 }}>Earned ✓</div>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Chat Widget (floating) ────────────────────────────────────────
function ChatWidget() {
  const { user, go } = useApp();
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [history,  setHistory]  = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const endRef = useRef(null);

  const nick = user?.aiNickname || user?.name;

  useEffect(() => {
    if (!user || messages.length > 0) return;
    setMessages([{
      role: "ai",
      text: `Hi ${nick}! Quick question about cybersecurity? I'm here to help. 🛡`,
    }]);
  }, [user, open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const q = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const aiText = await askClaude(
        [...history, { role: "user", content: q }],
        buildSystemPrompt(user)
      );
      setMessages(prev => [...prev, { role: "ai", text: aiText }]);
      setHistory(prev => [
        ...prev,
        { role: "user", content: q },
        { role: "assistant", content: aiText },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const group = user ? getAgeGroup(user.age) : null;

  return (
    <>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <div>
              💬 Cyber Wellness Assistant
              <div className="chat-header-sub">
                {user ? `${nick} · ${group.label}` : "Guest"}
              </div>
            </div>
          </div>
          <div className="chat-messages">
            {!user ? (
              <div className="chat-login-prompt">
                <p>Sign in to chat with CyberGuard AI — responses are personalised to your profile.</p>
                <button onClick={() => { setOpen(false); go("login"); }}>Sign in / Sign up</button>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`chat-bubble ${m.role}`} style={{ whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </div>
                ))}
                {loading && <div className="chat-bubble ai loading">Thinking…</div>}
                <div ref={endRef} />
              </>
            )}
          </div>
          {user && (
            <div className="chat-input-row">
              <textarea
                className="chat-input"
                rows={1}
                placeholder="Type a question…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
              <button className="chat-send" onClick={send} disabled={loading || !input.trim()}>
                {loading ? "…" : "↑"}
              </button>
            </div>
          )}
        </div>
      )}
      <button className="chat-fab" onClick={() => setOpen(o => !o)}>
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home",      label: "Home"      },
  { id: "dashboard", label: "Dashboard" },
  { id: "resources", label: "Resources" },
  { id: "about",     label: "About"     },
];

function Navbar({ page }) {
  const { go, user, logout } = useApp();
  const nick = user?.aiNickname || user?.name;
  return (
    <nav className="navbar">
      <div className="nav-logo" onClick={() => go("home")} style={{ cursor: "pointer" }}>🛡 <span>Cyberly</span></div>
      {NAV_ITEMS.map(n => (
        <button key={n.id} className={`nav-link${page === n.id ? " active" : ""}`} onClick={() => go(n.id)}>
          {n.label}
        </button>
      ))}
      {user ? (
        <div className="nav-user">
          <div className="nav-avatar">{(nick || "U")[0].toUpperCase()}</div>
          <span>{nick}</span>
          <button className="nav-logout" onClick={logout}>Sign out</button>
        </div>
      ) : (
        <button className="nav-cta" onClick={() => go("login")}>Sign in</button>
      )}
    </nav>
  );
}

// ─── Footer ───────────────────────────────────────────────────────
function Footer() {
  return (
    <footer>
      <p>Built with care · <strong>Cyberly</strong> · {new Date().getFullYear()}</p>
      <p style={{ marginTop: "0.4rem", fontSize: "0.78rem" }}>
        Age-aware agentic AI powered by Claude · cybersecurity education for everyone.
      </p>
    </footer>
  );
}

// ─── Root App ─────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);

  function login(userData) {
    setUser(userData);
    setPage("dashboard");
  }
  function logout() {
    setUser(null);
    setPage("home");
  }

  const ctx = { page, go: setPage, user, login, logout };

  const PAGES = {
    home:      <HomePage />,
    dashboard: <DashboardPage />,
    resources: <ResourcesPage />,
    about:     <AboutPage />,
    progress:  <ProgressPage />,
    login:     <AuthGate />,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <style>{globalStyle}</style>
      <Navbar page={page} />
      <main className="page-wrap">
        {PAGES[page] ?? <HomePage />}
      </main>
      <Footer />
      <ChatWidget />
    </AppCtx.Provider>
  );
}

// --------------------- MYSQL 

