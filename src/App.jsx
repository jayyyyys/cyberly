import { useState, createContext, useContext, useRef, useEffect } from "react";

// ─── Design tokens (unchanged from original) ──────────────────────
const COLORS = {
  teal:   { bg: "#E1F5EE", mid: "#1D9E75", dark: "#085041" },
  coral:  { bg: "#FAECE7", mid: "#D85A30", dark: "#712B13" },
  purple: { bg: "#EEEDFE", mid: "#7F77DD", dark: "#26215C" },
  gray:   { bg: "#F1EFE8", mid: "#888780", dark: "#2C2C2A" },
};

// ─── Global styles (original + new additions) ────────────────────
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
    --teal:    #1D9E75;
    --teal-lt: #E1F5EE;
    --coral:   #D85A30;
    --coral-lt:#FAECE7;
    --purple:  #7F77DD;
    --purple-lt:#EEEDFE;
    --gray-lt: #F1EFE8;
    --nav-h:   64px;
    --radius:  10px;
    --shadow:  0 2px 12px rgba(0,0,0,0.07);
  }

  a { text-decoration: none; color: inherit; }

  /* ── Navbar ── */
  .navbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: var(--nav-h);
    background: rgba(247,248,245,0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0,0,0,0.07);
    display: flex; align-items: center;
    padding: 0 2rem;
    gap: 2rem;
  }
  .nav-logo {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.15rem; font-weight: 600;
    color: var(--teal);
    margin-right: auto;
    display: flex; align-items: center; gap: 0.5rem;
  }
  .nav-logo span { color: #1a1a18; }
  .nav-link {
    font-size: 0.9rem; font-weight: 500; color: #555;
    padding: 0.4rem 0.75rem; border-radius: 6px;
    cursor: pointer; transition: background 0.15s, color 0.15s;
    border: none; background: none;
  }
  .nav-link:hover  { background: var(--gray-lt); color: #1a1a18; }
  .nav-link.active { background: var(--teal-lt); color: var(--teal); }
  .nav-cta {
    background: var(--teal); color: #fff;
    border: none; border-radius: 8px;
    padding: 0.45rem 1.1rem;
    font-size: 0.875rem; font-weight: 500;
    cursor: pointer; transition: opacity 0.15s;
  }
  .nav-cta:hover { opacity: 0.88; }

  /* ── User badge in navbar ── */
  .nav-user {
    display: flex; align-items: center; gap: 0.5rem;
    font-size: 0.85rem; color: #555;
  }
  .nav-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: var(--teal); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; font-weight: 600;
  }
  .nav-logout {
    font-size: 0.8rem; color: var(--coral); cursor: pointer;
    border: none; background: none; padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }
  .nav-logout:hover { background: var(--coral-lt); }

  /* ── Layout ── */
  .page-wrap {
    margin-top: var(--nav-h);
    min-height: calc(100vh - var(--nav-h));
  }

  /* ── Slot placeholder ── */
  .slot {
    border: 2px dashed rgba(0,0,0,0.12);
    border-radius: var(--radius);
    padding: 3rem 2rem;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.75rem;
    background: repeating-linear-gradient(
      45deg, transparent, transparent 10px,
      rgba(0,0,0,0.018) 10px, rgba(0,0,0,0.018) 20px
    );
    text-align: center;
  }
  .slot-label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #888; }
  .slot-title { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; font-weight: 600; color: #444; }
  .slot-sub { font-size: 0.85rem; color: #888; max-width: 30ch; }

  /* ── Section helpers ── */
  .section { padding: 5rem 2rem; max-width: 1080px; margin: 0 auto; }
  .section-sm { padding: 3rem 2rem; max-width: 1080px; margin: 0 auto; }
  .section-title { font-family: 'Space Grotesk', sans-serif; font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 600; line-height: 1.2; margin-bottom: 0.75rem; }
  .section-sub { color: #666; font-size: 1rem; max-width: 55ch; margin-bottom: 2.5rem; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }

  /* ── Card ── */
  .card { background: #fff; border-radius: var(--radius); border: 1px solid rgba(0,0,0,0.07); padding: 1.5rem; box-shadow: var(--shadow); }
  .card-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-bottom: 1rem; }
  .card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.4rem; }
  .card p  { font-size: 0.875rem; color: #666; line-height: 1.6; }

  /* ── Hero ── */
  .hero { padding: 7rem 2rem 5rem; max-width: 1080px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center; }
  @media (max-width: 680px) {
    .hero { grid-template-columns: 1fr; padding: 4rem 1.5rem 3rem; }
    .hero-visual { display: none; }
    .navbar { padding: 0 1rem; gap: 0.75rem; }
    .section { padding: 3rem 1.5rem; }
  }
  .hero-eyebrow { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--teal); background: var(--teal-lt); display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; margin-bottom: 1.25rem; }
  .hero h1 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(2rem, 4vw, 3rem); font-weight: 600; line-height: 1.15; margin-bottom: 1rem; }
  .hero h1 em { color: var(--teal); font-style: normal; }
  .hero-sub { color: #555; font-size: 1.05rem; line-height: 1.7; margin-bottom: 2rem; }
  .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
  .btn { padding: 0.65rem 1.4rem; border-radius: 8px; font-size: 0.9rem; font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { opacity: 0.88; }
  .btn-outline { background: #fff; color: #333; border: 1px solid rgba(0,0,0,0.15); }
  .btn-outline:hover { border-color: var(--teal); color: var(--teal); }
  .hero-visual { background: var(--teal-lt); border-radius: 16px; padding: 2rem; min-height: 280px; display: flex; flex-direction: column; gap: 1rem; justify-content: center; }
  .badge-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .badge { font-size: 0.78rem; font-weight: 500; padding: 0.3rem 0.8rem; border-radius: 20px; }
  .badge-teal   { background: var(--teal); color: #fff; }
  .badge-coral  { background: var(--coral-lt); color: var(--coral); }
  .badge-purple { background: var(--purple-lt); color: var(--purple); }

  /* ── Footer ── */
  footer { border-top: 1px solid rgba(0,0,0,0.07); padding: 2.5rem 2rem; text-align: center; color: #888; font-size: 0.85rem; }
  footer strong { color: var(--teal); }

  /* ── Chat FAB & Panel ── */
  .chat-fab {
    position: fixed; bottom: 2rem; right: 2rem; z-index: 200;
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--teal); color: #fff;
    border: none; cursor: pointer;
    box-shadow: 0 4px 16px rgba(29,158,117,0.4);
    font-size: 1.5rem; display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s, box-shadow 0.15s;
  }
  .chat-fab:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(29,158,117,0.5); }
  .chat-panel {
    position: fixed; bottom: 5.5rem; right: 2rem; z-index: 200;
    width: 360px; background: #fff;
    border-radius: 14px; border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    display: flex; flex-direction: column; overflow: hidden;
    max-height: 520px;
  }
  .chat-header { background: var(--teal); color: #fff; padding: 1rem 1.25rem; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between; }
  .chat-header-sub { font-size: 0.75rem; font-weight: 400; opacity: 0.85; margin-top: 2px; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; min-height: 200px; max-height: 300px; }
  .chat-bubble { max-width: 82%; padding: 0.6rem 0.9rem; border-radius: 12px; font-size: 0.855rem; line-height: 1.55; }
  .chat-bubble.user { background: var(--teal); color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
  .chat-bubble.ai { background: var(--gray-lt); color: #1a1a18; align-self: flex-start; border-bottom-left-radius: 4px; }
  .chat-bubble.ai.loading { opacity: 0.6; font-style: italic; }
  .chat-input-row { display: flex; gap: 0.5rem; padding: 0.75rem 1rem; border-top: 1px solid rgba(0,0,0,0.07); }
  .chat-input {
    flex: 1; border: 1px solid rgba(0,0,0,0.13); border-radius: 8px;
    padding: 0.5rem 0.75rem; font-size: 0.875rem; font-family: inherit;
    outline: none; resize: none;
  }
  .chat-input:focus { border-color: var(--teal); }
  .chat-send { background: var(--teal); color: #fff; border: none; border-radius: 8px; padding: 0.5rem 0.85rem; cursor: pointer; font-size: 0.85rem; font-weight: 500; }
  .chat-send:hover { opacity: 0.88; }
  .chat-send:disabled { opacity: 0.45; cursor: not-allowed; }
  .chat-login-prompt { padding: 1.25rem; text-align: center; color: #666; font-size: 0.85rem; }
  .chat-login-prompt button { margin-top: 0.75rem; background: var(--teal); color: #fff; border: none; border-radius: 8px; padding: 0.5rem 1.25rem; cursor: pointer; font-size: 0.875rem; }

  /* ── Dashboard ── */
  .dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .stat-card { background: #fff; border-radius: var(--radius); border: 1px solid rgba(0,0,0,0.07); padding: 1.25rem; text-align: center; }
  .stat-num { font-size: 2rem; font-weight: 700; color: var(--teal); }
  .stat-label { font-size: 0.8rem; color: #888; margin-top: 0.25rem; }

  /* ── Agentic AI Panel ── */
  .agent-panel { background: #fff; border-radius: 14px; border: 1px solid rgba(0,0,0,0.08); padding: 1.75rem; box-shadow: var(--shadow); margin-top: 1.5rem; }
  .agent-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; }
  .agent-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--teal-lt); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
  .agent-title { font-family: 'Space Grotesk', sans-serif; font-size: 1.1rem; font-weight: 600; }
  .agent-sub { font-size: 0.82rem; color: #777; margin-top: 2px; }
  .agent-age-badge { display: inline-block; background: var(--purple-lt); color: var(--purple); font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.65rem; border-radius: 20px; margin-left: 0.5rem; }
  .agent-messages { background: var(--gray-lt); border-radius: 10px; padding: 1rem; min-height: 160px; max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem; }
  .agent-bubble { padding: 0.65rem 0.9rem; border-radius: 10px; font-size: 0.875rem; line-height: 1.6; max-width: 88%; }
  .agent-bubble.user { background: var(--teal); color: #fff; align-self: flex-end; }
  .agent-bubble.ai { background: #fff; color: #1a1a18; align-self: flex-start; border: 1px solid rgba(0,0,0,0.08); }
  .agent-bubble.loading { opacity: 0.55; font-style: italic; }
  .agent-input-row { display: flex; gap: 0.75rem; }
  .agent-input { flex: 1; border: 1px solid rgba(0,0,0,0.13); border-radius: 8px; padding: 0.6rem 0.9rem; font-size: 0.9rem; font-family: inherit; outline: none; }
  .agent-input:focus { border-color: var(--teal); }
  .agent-send { background: var(--teal); color: #fff; border: none; border-radius: 8px; padding: 0.6rem 1.1rem; cursor: pointer; font-weight: 500; }
  .agent-send:hover { opacity: 0.88; }
  .agent-send:disabled { opacity: 0.45; cursor: not-allowed; }
  .agent-topics { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
  .agent-topic-btn { background: var(--teal-lt); color: var(--teal); border: none; border-radius: 20px; padding: 0.3rem 0.85rem; font-size: 0.78rem; font-weight: 500; cursor: pointer; }
  .agent-topic-btn:hover { background: var(--teal); color: #fff; }
  .agent-locked { text-align: center; padding: 2rem; color: #888; }
  .agent-locked p { margin-bottom: 1rem; font-size: 0.9rem; }
  .agent-locked button { background: var(--teal); color: #fff; border: none; border-radius: 8px; padding: 0.6rem 1.4rem; cursor: pointer; font-size: 0.9rem; }

  /* ── Resources ── */
  .resource-item { display: flex; gap: 1rem; align-items: flex-start; padding: 1.25rem; background: #fff; border-radius: var(--radius); border: 1px solid rgba(0,0,0,0.07); box-shadow: var(--shadow); }
  .resource-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--teal); flex-shrink: 0; margin-top: 5px; }

  /* ── About ── */
  .team-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1.25rem; }
  .team-card { background: #fff; border-radius: var(--radius); border: 1px solid rgba(0,0,0,0.07); padding: 1.5rem; text-align: center; box-shadow: var(--shadow); }
  .avatar { width: 56px; height: 56px; border-radius: 50%; margin: 0 auto 0.75rem; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.1rem; color: #fff; background: var(--teal); }

  /* ── Login / Auth pages ── */
  .auth-wrap { min-height: calc(100vh - var(--nav-h)); display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .auth-card { background: #fff; border-radius: 16px; border: 1px solid rgba(0,0,0,0.08); padding: 2.5rem; width: 100%; max-width: 400px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .auth-logo { text-align: center; margin-bottom: 1.75rem; }
  .auth-logo-icon { font-size: 2.5rem; }
  .auth-logo-name { font-family: 'Space Grotesk', sans-serif; font-size: 1.4rem; font-weight: 600; color: var(--teal); }
  .auth-title { font-family: 'Space Grotesk', sans-serif; font-size: 1.25rem; font-weight: 600; margin-bottom: 0.4rem; }
  .auth-sub { color: #777; font-size: 0.875rem; margin-bottom: 2rem; }
  .form-group { margin-bottom: 1.1rem; }
  .form-label { display: block; font-size: 0.82rem; font-weight: 500; color: #444; margin-bottom: 0.4rem; }
  .form-input { width: 100%; border: 1px solid rgba(0,0,0,0.15); border-radius: 8px; padding: 0.6rem 0.85rem; font-size: 0.9rem; font-family: inherit; outline: none; transition: border-color 0.15s; }
  .form-input:focus { border-color: var(--teal); box-shadow: 0 0 0 3px rgba(29,158,117,0.1); }
  .form-hint { font-size: 0.75rem; color: #999; margin-top: 0.3rem; }
  .form-error { font-size: 0.8rem; color: var(--coral); margin-top: 0.3rem; }
  .auth-submit { width: 100%; background: var(--teal); color: #fff; border: none; border-radius: 8px; padding: 0.7rem; font-size: 0.95rem; font-weight: 500; cursor: pointer; margin-top: 0.5rem; transition: opacity 0.15s; }
  .auth-submit:hover { opacity: 0.88; }
  .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .auth-switch { text-align: center; margin-top: 1.25rem; font-size: 0.85rem; color: #777; }
  .auth-switch button { color: var(--teal); background: none; border: none; cursor: pointer; font-weight: 500; font-size: 0.85rem; }
  .auth-switch button:hover { text-decoration: underline; }
  .age-group-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.78rem; font-weight: 600; }
  .age-group-child  { background: #E1F5EE; color: #085041; }
  .age-group-teen   { background: #EEEDFE; color: #26215C; }
  .age-group-adult  { background: #FAECE7; color: #712B13; }
`;

// ─── Context: auth + routing ──────────────────────────────────────
const AppCtx = createContext(null);
function useApp() { return useContext(AppCtx); }

// ─── Helpers ──────────────────────────────────────────────────────
function getAgeGroup(age) {
  if (age < 13) return { label: "Child (under 13)", key: "child" };
  if (age < 18) return { label: "Teen (13–17)", key: "teen" };
  if (age < 25) return { label: "Young adult (18–24)", key: "youngAdult" };
  return { label: "Adult (25+)", key: "adult" };
}

// Build the system prompt based on the user's age
function buildSystemPrompt(user) {
  const group = getAgeGroup(user.age);
  const ageInstructions = {
    child: `
      The user is a CHILD aged ${user.age}. Use very simple language (grade 3–4 reading level).
      Avoid technical jargon entirely. Use fun analogies (e.g. "a password is like a secret handshake").
      Keep answers SHORT (2–3 sentences max per point). Add encouraging phrases.
      Never discuss hacking, dark web, or threats in a scary way — focus on staying safe and telling a trusted adult.
    `,
    teen: `
      The user is a TEENAGER aged ${user.age}. Use clear, friendly language without being condescending.
      You can introduce basic technical terms but always explain them simply.
      Teens are social-media savvy — relate examples to apps like Instagram, TikTok, Discord, and online gaming.
      Address topics like cyberbullying, oversharing, and privacy settings.
    `,
    youngAdult: `
      The user is a YOUNG ADULT aged ${user.age}. Use confident, peer-level language.
      You can use intermediate technical concepts. Cover topics like phishing, 2FA, VPNs, password managers,
      data breaches, and social engineering. Relate examples to job searching, online banking, and social media.
    `,
    adult: `
      The user is an ADULT aged ${user.age}. Use professional, clear language.
      Cover advanced topics as needed: threat modelling, zero-trust, endpoint security, enterprise risks,
      protecting family members online, financial fraud prevention, and identity theft recovery.
    `,
  };

  return `You are CyberGuard AI, an expert cybersecurity advisor integrated into the CyberWell platform.
Your mission: teach cybersecurity concepts and practices to ${user.name} in a way that is perfectly matched to their age and experience level.

User profile:
- Name: ${user.name}
- Age: ${user.age} years old
- Age group: ${group.label}

Age-appropriate guidance instructions:
${ageInstructions[group.key]}

Core behaviour rules:
1. Always be helpful, accurate, and encouraging.
2. When explaining a threat, ALWAYS follow with a practical protection tip.
3. Structure longer answers with clear bullet points or numbered steps.
4. If the user seems confused, offer to re-explain in a simpler way.
5. Do not make up statistics — if unsure, say so and suggest a reliable source (e.g. CISA, NCSC, Google Safety Centre).
6. Never help with offensive hacking, creating malware, or any harmful activity.
7. Keep your tone warm and supportive — cybersecurity can feel overwhelming, so be reassuring.

You are an AGENTIC advisor: you proactively suggest next steps, related topics, and follow-up questions at the end of each response to guide the user's learning journey.`;
}

// ─── Claude API call ──────────────────────────────────────────────
async function askCyberGuard(user, conversationHistory, userMessage) {
  const systemPrompt = buildSystemPrompt(user);

const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": "http://localhost:3000", // required by OpenRouter
    "X-Title": "My Nemotron App"
  },
body: JSON.stringify({
  model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  messages: [
    { role: "system", content: systemPrompt},
    ...conversationHistory,
    {role: "user", content: userMessage}
  ],
  max_tokens: 1000,
  extra_body: {
    reasoning: { enabled: true }
  }
})
});

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "API request failed");
  }

  const data = await response.json();
  return data.content?.[0]?.text || "Sorry, I couldn't generate a response. Please try again.";
}

// ─── Login Page ───────────────────────────────────────────────────
function LoginPage({ onSwitch }) {
  const { login } = useApp();
  const [form, setForm] = useState({ name: "", age: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.age || isNaN(form.age) || +form.age < 5 || +form.age > 120)
      e.age = "Please enter a valid age (5–120).";
    if (!form.password || form.password.length < 4)
      e.password = "Password must be at least 4 characters.";
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    // Simulated auth — in production, call your real backend here
    setTimeout(() => {
      login({ name: form.name.trim(), age: +form.age });
      setLoading(false);
    }, 600);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🛡</div>
          <div className="auth-logo-name">CyberWell</div>
        </div>
        <p className="auth-title">Welcome back</p>
        <p className="auth-sub">Sign in to access your personalised AI cybersecurity advisor.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Your name</label>
            <input className="form-input" placeholder="e.g. Alex" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Your age</label>
            <input className="form-input" type="number" placeholder="e.g. 14" value={form.age}
              onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
            <p className="form-hint">Used to tailor AI responses to your level — never shared.</p>
            {errors.age && <p className="form-error">{errors.age}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <div className="auth-switch">
          Don't have an account?{" "}
          <button onClick={onSwitch}>Sign up</button>
        </div>
      </div>
    </div>
  );
}

// ─── Sign Up Page ─────────────────────────────────────────────────
function SignupPage({ onSwitch }) {
  const { login } = useApp();
  const [form, setForm] = useState({ name: "", age: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.age || isNaN(form.age) || +form.age < 5 || +form.age > 120)
      e.age = "Please enter a valid age (5–120).";
    if (!form.password || form.password.length < 4)
      e.password = "Password must be at least 4 characters.";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match.";
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    // Simulated registration — swap with your real backend
    setTimeout(() => {
      login({ name: form.name.trim(), age: +form.age });
      setLoading(false);
    }, 700);
  }

  const group = form.age && !isNaN(form.age) ? getAgeGroup(+form.age) : null;

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🛡</div>
          <div className="auth-logo-name">CyberWell</div>
        </div>
        <p className="auth-title">Create account</p>
        <p className="auth-sub">Join CyberWell for AI-powered cyber education tailored to you.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Your name</label>
            <input className="form-input" placeholder="e.g. Alex" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Your age</label>
            <input className="form-input" type="number" placeholder="e.g. 25" value={form.age}
              onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
            {group && (
              <p className="form-hint">
                AI will adapt for: <span className={`age-group-badge age-group-${group.key === "youngAdult" ? "adult" : group.key}`}>{group.label}</span>
              </p>
            )}
            {errors.age && <p className="form-error">{errors.age}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <input className="form-input" type="password" placeholder="••••••••" value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
            {errors.confirm && <p className="form-error">{errors.confirm}</p>}
          </div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <div className="auth-switch">
          Already have an account?{" "}
          <button onClick={onSwitch}>Sign in</button>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Gate (shows login/signup if not logged in) ──────────────
function AuthGate() {
  const [mode, setMode] = useState("login");
  return mode === "login"
    ? <LoginPage onSwitch={() => setMode("signup")} />
    : <SignupPage onSwitch={() => setMode("login")} />;
}

// ─── Agentic AI Panel (Dashboard) ────────────────────────────────
const QUICK_TOPICS = [
  "What is phishing?",
  "How do I make a strong password?",
  "What is two-factor authentication?",
  "How do I stay safe on social media?",
  "What is a VPN and do I need one?",
  "How can I spot a scam?",
];

function AgentPanel() {
  const { user } = useApp();
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    // Welcome message on first load
    const group = getAgeGroup(user.age);
    const welcome = {
      role: "ai",
      text: `Hi ${user.name}! 👋 I'm CyberGuard AI, your personal cybersecurity advisor. I've tailored my responses for your age group (${group.label}).\n\nAsk me anything about staying safe online — or tap one of the quick topics below to get started!`,
    };
    setMessages([welcome]);
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const aiText = await askCyberGuard(
        user,
        history,
        text
      );
      const aiMsg = { role: "ai", text: aiText };
      setMessages(prev => [...prev, aiMsg]);
      // Update history for multi-turn conversation
      setHistory(prev => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: aiText },
      ]);
    } catch (err) {
      setError("Could not reach CyberGuard AI. Check your API key or try again.");
      setMessages(prev => prev.filter(m => m !== userMsg));
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="agent-panel">
        <div className="agent-locked">
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔒</p>
          <p>Sign in to access your personalised AI cybersecurity advisor.</p>
        </div>
      </div>
    );
  }

  const group = getAgeGroup(user.age);

  return (
    <div className="agent-panel">
      <div className="agent-header">
        <div className="agent-icon">🤖</div>
        <div>
          <div className="agent-title">
            CyberGuard AI
            <span className="agent-age-badge">{group.label}</span>
          </div>
          <div className="agent-sub">Agentic cybersecurity advisor · powered by ILMU</div>
        </div>
      </div>

      {/* Quick topic suggestions */}
      <div className="agent-topics">
        {QUICK_TOPICS.map(t => (
          <button key={t} className="agent-topic-btn" onClick={() => sendMessage(t)} disabled={loading}>
            {t}
          </button>
        ))}
      </div>

      {/* Message thread */}
      <div className="agent-messages">
        {messages.map((m, i) => (
          <div key={i} className={`agent-bubble ${m.role}`} style={{ whiteSpace: "pre-wrap" }}>
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="agent-bubble ai loading">CyberGuard is thinking…</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <p style={{ color: "var(--coral)", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
          ⚠️ {error}
        </p>
      )}

      {/* Input row */}
      <div className="agent-input-row">
        <input
          className="agent-input"
          placeholder="Ask about cybersecurity…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          disabled={loading}
        />
        <button className="agent-send" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}

// ─── Chat Widget (floating bottom-right) ──────────────────────────
function ChatWidget() {
  const { user, go } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user || messages.length > 0) return;
    setMessages([{
      role: "ai",
      text: `Hi ${user.name}! Quick question about cybersecurity? I'm here to help. 🛡`
    }]);
  }, [user, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", text: input };
    setMessages(prev => [...prev, userMsg]);
    const q = input;
    setInput("");
    setLoading(true);
    try {
      const aiText = await askCyberGuard(user, history, q);
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
                {user ? `${user.name} · ${group.label}` : "Guest"}
              </div>
            </div>
          </div>

          <div className="chat-messages">
            {!user ? (
              <div className="chat-login-prompt">
                <p>Sign in to chat with CyberGuard AI — responses are tailored to your age and experience.</p>
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
                <div ref={messagesEndRef} />
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
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                disabled={loading}
              />
              <button className="chat-send" onClick={send} disabled={loading || !input.trim()}>
                {loading ? "…" : "↑"}
              </button>
            </div>
          )}
        </div>
      )}
      <button className="chat-fab" onClick={() => setOpen(o => !o)} title={open ? "Close chat" : "Open wellness chat"}>
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}

// ─── Shared: Slot ─────────────────────────────────────────────────
function Slot({ label, title, sub, height = 220 }) {
  return (
    <div className="slot" style={{ minHeight: height }}>
      <p className="slot-label">🔧 {label}</p>
      <p className="slot-title">{title}</p>
      <p className="slot-sub">{sub}</p>
    </div>
  );
}

// ─── Shared: FeatureCard ──────────────────────────────────────────
function FeatureCard({ icon, bg, title, body }) {
  return (
    <div className="card">
      <div className="card-icon" style={{ background: bg }}>{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

// ─── Page: Home ───────────────────────────────────────────────────
function HomePage() {
  const { go } = useApp();
  return (
    <>
      <div className="hero">
        <div>
          <span className="hero-eyebrow">Cyber Wellness</span>
          <h1>Stay <em>safe</em>,<br />stay connected.</h1>
          <p className="hero-sub">An intelligent platform to guide you through safer online habits — powered by an AI agent and a wellness chatbot.</p>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => go("dashboard")}>Get started</button>
            <button className="btn btn-outline" onClick={() => go("resources")}>Learn more</button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="badge-row">
            <span className="badge badge-teal">🛡 Safe browsing</span>
            <span className="badge badge-coral">🔐 Privacy tips</span>
            <span className="badge badge-purple">🤖 AI guidance</span>
          </div>
          <p style={{ color: "#0F6E56", fontSize: "0.9rem", lineHeight: 1.6 }}>
            Your AI-powered companion for navigating the digital world with confidence.
          </p>
        </div>
      </div>
      <div className="section" style={{ paddingTop: "1rem" }}>
        <p className="section-title">What we offer</p>
        <p className="section-sub">A modular platform covering all dimensions of online safety and digital wellness.</p>
        <div className="grid-3">
          <FeatureCard icon="🤖" bg={COLORS.teal.bg} title="Agentic AI" body="An autonomous AI that adapts to your age and experience — assess, monitor, and improve your online safety posture." />
          <FeatureCard icon="💬" bg={COLORS.coral.bg} title="Wellness Chatbot" body="Ask questions, get instant guidance, and learn about digital wellbeing at your own pace." />
          <FeatureCard icon="📚" bg={COLORS.purple.bg} title="Resource Library" body="Curated articles, checklists, and guides to deepen your understanding of cyber safety." />
        </div>
      </div>
    </>
  );
}

// ─── Page: Dashboard ──────────────────────────────────────────────
function DashboardPage() {
  const { user, go } = useApp();
  return (
    <div className="section">
      <p className="section-title">Your Dashboard</p>
      <p className="section-sub">
        {user
          ? `Welcome back, ${user.name}. Your AI advisor is ready.`
          : "Sign in to unlock your personalised AI cybersecurity advisor."}
      </p>
      <div className="dash-grid">
        {[
          { num: user ? "🟢" : "—", label: "AI Advisor" },
          { num: "—", label: "Checks completed" },
          { num: "—", label: "Alerts resolved" },
          { num: "—", label: "Tips applied" },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-num">{s.num}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      {/* ── Agentic AI Module ── */}
      <AgentPanel />
    </div>
  );
}

// ─── Page: Resources ─────────────────────────────────────────────
function ResourcesPage() {
  const topics = [
    { title: "Understanding phishing attacks",       cat: "Security basics",  color: COLORS.teal },
    { title: "How to create strong passwords",       cat: "Account safety",   color: COLORS.coral },
    { title: "Privacy settings: social media guide", cat: "Privacy",          color: COLORS.purple },
    { title: "Safe shopping online",                 cat: "E-commerce",       color: COLORS.teal },
    { title: "Recognising misinformation",           cat: "Digital literacy", color: COLORS.coral },
    { title: "Protecting children online",           cat: "Family safety",    color: COLORS.purple },
  ];
  return (
    <div className="section">
      <p className="section-title">Resource Library</p>
      <p className="section-sub">Practical guides to help you practise safer, healthier digital habits.</p>
      <div className="grid-2">
        {topics.map(t => (
          <div className="resource-item" key={t.title}>
            <div className="resource-dot" style={{ background: t.color.mid }} />
            <div>
              <p style={{ fontWeight: 500, marginBottom: "0.25rem" }}>{t.title}</p>
              <span style={{ fontSize: "0.75rem", fontWeight: 500, background: t.color.bg, color: t.color.dark, padding: "0.2rem 0.6rem", borderRadius: 20 }}>{t.cat}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page: About ──────────────────────────────────────────────────
function AboutPage() {
  const members = [
    { initials: "YN", name: "You",     role: "Web app & AI module" },
    { initials: "P1", name: "Partner", role: "Chatbot & backend" },
  ];
  return (
    <div className="section">
      <p className="section-title">About this project</p>
      <p className="section-sub" style={{ marginBottom: "1rem" }}>
        A collaborative initiative to make cyber wellness education more accessible through intelligent, conversational AI tools.
      </p>
      <div className="card" style={{ marginBottom: "2.5rem", maxWidth: "60ch" }}>
        <p style={{ lineHeight: 1.75, color: "#555", fontSize: "0.95rem" }}>
          This platform is a modular system — each section is independently developed and composed together. The agentic AI module uses the ILMU-Claw API (claude-sonnet-4-6) with an age-aware system prompt to tailor every response to the logged-in user.
        </p>
      </div>
      <p style={{ fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, marginBottom: "1.25rem" }}>Team</p>
      <div className="team-grid">
        {members.map(m => (
          <div className="team-card" key={m.name}>
            <div className="avatar">{m.initials}</div>
            <p style={{ fontWeight: 600 }}>{m.name}</p>
            <p style={{ fontSize: "0.8rem", color: "#777", marginTop: "0.25rem" }}>{m.role}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home",      label: "Home" },
  { id: "dashboard", label: "Dashboard" },
  { id: "resources", label: "Resources" },
  { id: "about",     label: "About" },
];

function Navbar({ page }) {
  const { go, user, logout } = useApp();
  return (
    <nav className="navbar">
      <div className="nav-logo">🛡 <span>CyberWell</span></div>
      {NAV_ITEMS.map(n => (
        <button key={n.id} className={`nav-link${page === n.id ? " active" : ""}`} onClick={() => go(n.id)}>
          {n.label}
        </button>
      ))}
      {user ? (
        <div className="nav-user">
          <div className="nav-avatar">{user.name[0].toUpperCase()}</div>
          <span>{user.name}</span>
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
      <p>Built with care · <strong>CyberWell</strong> · {new Date().getFullYear()}</p>
      <p style={{ marginTop: "0.4rem", fontSize: "0.78rem" }}>
        Age-aware agentic AI powered by Claude · cybersecurity education for everyone.
      </p>
    </footer>
  );
}

// ─── Root App ─────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null); // { name, age }

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
