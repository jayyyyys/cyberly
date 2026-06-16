import { useState, createContext, useContext } from "react";

// ─── Design tokens ────────────────────────────────────────────────
const COLORS = {
  teal:   { bg: "#E1F5EE", mid: "#1D9E75", dark: "#085041" },
  coral:  { bg: "#FAECE7", mid: "#D85A30", dark: "#712B13" },
  purple: { bg: "#EEEDFE", mid: "#7F77DD", dark: "#26215C" },
  gray:   { bg: "#F1EFE8", mid: "#888780", dark: "#2C2C2A" },
};

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

  /* ── Layout ── */
  .page-wrap {
    margin-top: var(--nav-h);
    min-height: calc(100vh - var(--nav-h));
  }

  /* ── Placeholder slot ── */
  .slot {
    border: 2px dashed rgba(0,0,0,0.12);
    border-radius: var(--radius);
    padding: 3rem 2rem;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0.75rem;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(0,0,0,0.018) 10px,
      rgba(0,0,0,0.018) 20px
    );
    text-align: center;
  }
  .slot-label {
    font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: #888;
  }
  .slot-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 1.1rem; font-weight: 600; color: #444;
  }
  .slot-sub { font-size: 0.85rem; color: #888; max-width: 30ch; }

  /* ── Section helpers ── */
  .section { padding: 5rem 2rem; max-width: 1080px; margin: 0 auto; }
  .section-sm { padding: 3rem 2rem; max-width: 1080px; margin: 0 auto; }
  .section-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(1.6rem, 3vw, 2.2rem);
    font-weight: 600; line-height: 1.2;
    margin-bottom: 0.75rem;
  }
  .section-sub { color: #666; font-size: 1rem; max-width: 55ch; margin-bottom: 2.5rem; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; }
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }

  /* ── Card ── */
  .card {
    background: #fff; border-radius: var(--radius);
    border: 1px solid rgba(0,0,0,0.07);
    padding: 1.5rem;
    box-shadow: var(--shadow);
  }
  .card-icon {
    width: 44px; height: 44px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem; margin-bottom: 1rem;
  }
  .card h3 { font-size: 1rem; font-weight: 600; margin-bottom: 0.4rem; }
  .card p  { font-size: 0.875rem; color: #666; line-height: 1.6; }

  /* ── Hero ── */
  .hero {
    padding: 7rem 2rem 5rem;
    max-width: 1080px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 3rem; align-items: center;
  }
  @media (max-width: 680px) {
    .hero { grid-template-columns: 1fr; padding: 4rem 1.5rem 3rem; }
    .hero-visual { display: none; }
    .navbar { padding: 0 1rem; gap: 0.75rem; }
    .section { padding: 3rem 1.5rem; }
  }
  .hero-eyebrow {
    font-size: 0.75rem; font-weight: 600; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--teal);
    background: var(--teal-lt); display: inline-block;
    padding: 0.25rem 0.75rem; border-radius: 20px; margin-bottom: 1.25rem;
  }
  .hero h1 {
    font-family: 'Space Grotesk', sans-serif;
    font-size: clamp(2rem, 4vw, 3rem);
    font-weight: 600; line-height: 1.15;
    margin-bottom: 1rem;
  }
  .hero h1 em { color: var(--teal); font-style: normal; }
  .hero-sub { color: #555; font-size: 1.05rem; line-height: 1.7; margin-bottom: 2rem; }
  .hero-actions { display: flex; gap: 1rem; flex-wrap: wrap; }
  .btn {
    padding: 0.65rem 1.4rem; border-radius: 8px;
    font-size: 0.9rem; font-weight: 500; cursor: pointer;
    border: none; transition: all 0.15s;
  }
  .btn-primary { background: var(--teal); color: #fff; }
  .btn-primary:hover { opacity: 0.88; }
  .btn-outline { background: #fff; color: #333; border: 1px solid rgba(0,0,0,0.15); }
  .btn-outline:hover { border-color: var(--teal); color: var(--teal); }
  .hero-visual {
    background: var(--teal-lt); border-radius: 16px;
    padding: 2rem; min-height: 280px;
    display: flex; flex-direction: column; gap: 1rem; justify-content: center;
  }
  .badge-row { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .badge {
    font-size: 0.78rem; font-weight: 500;
    padding: 0.3rem 0.8rem; border-radius: 20px;
  }
  .badge-teal   { background: var(--teal); color: #fff; }
  .badge-coral  { background: var(--coral-lt); color: var(--coral); }
  .badge-purple { background: var(--purple-lt); color: var(--purple); }

  /* ── Footer ── */
  footer {
    border-top: 1px solid rgba(0,0,0,0.07);
    padding: 2.5rem 2rem;
    text-align: center;
    color: #888; font-size: 0.85rem;
  }
  footer strong { color: var(--teal); }

  /* ── Chatbot floating button ── */
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
    width: 340px; background: #fff;
    border-radius: 14px; border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    overflow: hidden;
  }
  .chat-header {
    background: var(--teal); color: #fff;
    padding: 1rem 1.25rem;
    font-weight: 600; font-size: 0.95rem;
  }
  .chat-body {
    height: 220px; padding: 1.25rem;
    display: flex; align-items: center; justify-content: center;
  }

  /* ── Dashboard ── */
  .dash-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem; margin-bottom: 2rem;
  }
  .stat-card {
    background: #fff; border-radius: var(--radius);
    border: 1px solid rgba(0,0,0,0.07);
    padding: 1.25rem; text-align: center;
  }
  .stat-num { font-size: 2rem; font-weight: 700; color: var(--teal); }
  .stat-label { font-size: 0.8rem; color: #888; margin-top: 0.25rem; }

  /* ── Resources ── */
  .resource-item {
    display: flex; gap: 1rem; align-items: flex-start;
    padding: 1.25rem;
    background: #fff; border-radius: var(--radius);
    border: 1px solid rgba(0,0,0,0.07);
    box-shadow: var(--shadow);
  }
  .resource-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: var(--teal); flex-shrink: 0; margin-top: 5px;
  }

  /* ── About ── */
  .team-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1.25rem;
  }
  .team-card {
    background: #fff; border-radius: var(--radius);
    border: 1px solid rgba(0,0,0,0.07);
    padding: 1.5rem; text-align: center;
    box-shadow: var(--shadow);
  }
  .avatar {
    width: 56px; height: 56px; border-radius: 50%;
    margin: 0 auto 0.75rem;
    display: flex; align-items: center; justify-content: center;
    font-weight: 600; font-size: 1.1rem; color: #fff;
    background: var(--teal);
  }
`;

// ─── Context: routing ─────────────────────────────────────────────
const NavCtx = createContext(null);
function useNav() { return useContext(NavCtx); }

// ─── Shared: Slot placeholder ─────────────────────────────────────
function Slot({ label, title, sub, height = 220 }) {
  return (
    <div className="slot" style={{ minHeight: height }}>
      <p className="slot-label">🔧 {label}</p>
      <p className="slot-title">{title}</p>
      <p className="slot-sub">{sub}</p>
    </div>
  );
}

// ─── Shared: Card ─────────────────────────────────────────────────
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
  const { go } = useNav();
  return (
    <>
      <div className="hero">
        <div>
          <span className="hero-eyebrow">Cyber Wellness</span>
          <h1>Stay <em>safe</em>,<br/>stay connected.</h1>
          <p className="hero-sub">
            An intelligent platform to guide you through safer online habits —
            powered by an AI agent and a wellness chatbot.
          </p>
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
        <p className="section-sub">
          A modular platform covering all dimensions of online safety and digital wellness.
        </p>
        <div className="grid-3">
          <FeatureCard icon="🤖" bg={COLORS.teal.bg}   title="Agentic AI"      body="An autonomous AI module that helps you assess, monitor, and improve your online safety posture." />
          <FeatureCard icon="💬" bg={COLORS.coral.bg}  title="Wellness Chatbot" body="Ask questions, get instant guidance, and learn about digital wellbeing at your own pace." />
          <FeatureCard icon="📚" bg={COLORS.purple.bg} title="Resource Library"  body="Curated articles, checklists, and guides to deepen your understanding of cyber safety." />
        </div>
      </div>
    </>
  );
}

// ─── Page: Dashboard ──────────────────────────────────────────────
function DashboardPage() {
  return (
    <div className="section">
      <p className="section-title">Your Dashboard</p>
      <p className="section-sub">A central hub for your cyber wellness activity and AI-driven insights.</p>

      <div className="dash-grid">
        {[
          { num: "—", label: "Safety score" },
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

      {/* ↓ Partner drops the agentic AI module here */}
      <Slot
        label="Agentic AI Module — partner completes"
        title="AI Agent goes here"
        sub="Drop in the agentic component. It will render inside this container and have access to the user's session context via props."
        height={340}
      />
    </div>
  );
}

// ─── Page: Resources ─────────────────────────────────────────────
function ResourcesPage() {
  const topics = [
    { title: "Understanding phishing attacks",      cat: "Security basics",   color: COLORS.teal },
    { title: "How to create strong passwords",      cat: "Account safety",    color: COLORS.coral },
    { title: "Privacy settings: social media guide",cat: "Privacy",           color: COLORS.purple },
    { title: "Safe shopping online",                cat: "E-commerce",        color: COLORS.teal },
    { title: "Recognising misinformation",          cat: "Digital literacy",  color: COLORS.coral },
    { title: "Protecting children online",          cat: "Family safety",     color: COLORS.purple },
  ];
  return (
    <div className="section">
      <p className="section-title">Resource Library</p>
      <p className="section-sub">Practical guides to help you practise safer, healthier digital habits.</p>
      <div className="grid-2">
        {topics.map(t => (
          <div className="resource-item" key={t.title}>
            <div className="resource-dot" style={{ background: t.color.mid }}/>
            <div>
              <p style={{ fontWeight: 500, marginBottom: "0.25rem" }}>{t.title}</p>
              <span style={{
                fontSize: "0.75rem", fontWeight: 500,
                background: t.color.bg, color: t.color.dark,
                padding: "0.2rem 0.6rem", borderRadius: 20
              }}>{t.cat}</span>
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
          This platform is being built as a modular system — each section is independently developed and composed together. The agentic AI module and the chatbot widget are partner-owned components that slot into defined integration points.
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

// ─── Chatbot widget (slot) ────────────────────────────────────────
function ChatWidget() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">💬 Cyber Wellness Assistant</div>
          <div className="chat-body">
            <Slot
              label="Chatbot Widget — partner completes"
              title="Chatbot UI goes here"
              sub="Render the chatbot component inside this panel."
              height={160}
            />
          </div>
        </div>
      )}
      <button
        className="chat-fab"
        onClick={() => setOpen(o => !o)}
        title={open ? "Close chat" : "Open wellness chat"}
      >
        {open ? "✕" : "💬"}
      </button>
    </>
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
  const { go } = useNav();
  return (
    <nav className="navbar">
      <div className="nav-logo">🛡 <span>CyberWell</span></div>
      {NAV_ITEMS.map(n => (
        <button
          key={n.id}
          className={`nav-link${page === n.id ? " active" : ""}`}
          onClick={() => go(n.id)}
        >{n.label}</button>
      ))}
      <button className="nav-cta" onClick={() => go("dashboard")}>Get started</button>
    </nav>
  );
}

// ─── Footer ───────────────────────────────────────────────────────
function Footer() {
  return (
    <footer>
      <p>Built with care · <strong>CyberWell</strong> · {new Date().getFullYear()}</p>
      <p style={{ marginTop: "0.4rem", fontSize: "0.78rem" }}>
        Modular scaffold — agentic AI &amp; chatbot slots ready for partner integration.
      </p>
    </footer>
  );
}

// ─── Router ──────────────────────────────────────────────────────
const PAGES = {
  home:      <HomePage />,
  dashboard: <DashboardPage />,
  resources: <ResourcesPage />,
  about:     <AboutPage />,
};

// ─── Root app ─────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("home");
  const ctx = { page, go: setPage };

  return (
    <NavCtx.Provider value={ctx}>
      <style>{globalStyle}</style>
      <Navbar page={page} />
      <main className="page-wrap">
        {PAGES[page] ?? <HomePage />}
      </main>
      <Footer />
      {/* Floating chatbot — visible on every page */}
      <ChatWidget />
    </NavCtx.Provider>
  );
}
