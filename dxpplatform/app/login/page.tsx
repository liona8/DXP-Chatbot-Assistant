"use client";

import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="page-root">
      {/* Navbar */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <polygon points="5,3 17,10 5,17" fill="white" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">Kabel</span>
            <span className="brand-sub">DXP PLATFORM</span>
          </div>
        </div>
        <div className="nav-actions">
          <button className="btn-ghost">Sign in</button>
          <button className="btn-primary">Get Started</button>
        </div>
      </nav>

      <main className="main">
        <div className="hero">
          <h1 className="hero-title">Welcome to DXP</h1>
          <p className="hero-sub">Select your role to sign in</p>
        </div>

        <div className="cards">
          {/* Candidate Card */}
          <div className="card" onClick={() => router.push("/login/candidate")}>
            <div className="card-bar bar-blue" />
            <div className="card-body">
              <div className="icon-wrap icon-blue">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="10" r="5" stroke="white" strokeWidth="2" />
                  <path d="M5 24c0-5 4-8 9-8s9 3 9 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <path d="M19 6l2 2-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="card-title">Candidate</h2>
              <p className="card-desc">Students and graduates participating in digitalization projects</p>
              <span className="badge">Requires Kabel account</span>
              <span className="card-link">Sign in →</span>
            </div>
          </div>

          {/* Mentor Card */}
          <div className="card" onClick={() => router.push("/login/mentor")}>
            <div className="card-bar bar-green" />
            <div className="card-body">
              <div className="icon-wrap icon-green">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="11" cy="9" r="4" stroke="white" strokeWidth="2" />
                  <path d="M3 23c0-4 3.5-7 8-7" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="20" cy="18" r="5" stroke="white" strokeWidth="2" />
                  <path d="M18 18h4M20 16v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <h2 className="card-title">Mentor</h2>
              <p className="card-desc">Industry professionals guiding candidates through projects</p>
              <span className="card-link">Sign in →</span>
            </div>
          </div>
        </div>

        <p className="footer-note">
          Don&apos;t have an account?{" "}
          <a href="/register" className="footer-link">Create one here</a>
        </p>
      </main>

      <div className="whatsapp-bar">
        <button className="whatsapp-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.52 3.66 1.42 5.18L2 22l4.95-1.38A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm5.07 14.11c-.21.59-1.23 1.12-1.69 1.19-.46.07-1.04.1-1.68-.11-.39-.13-.89-.3-1.53-.59-2.69-1.16-4.44-3.87-4.57-4.05-.13-.18-1.09-1.45-1.09-2.77 0-1.32.69-1.97.94-2.24.25-.27.54-.34.72-.34h.51c.16 0 .38-.06.59.45.21.51.72 1.76.78 1.89.06.13.1.28.02.45-.08.17-.12.27-.24.42-.12.15-.25.33-.36.44-.12.12-.24.25-.1.49.14.24.62 1.02 1.33 1.65.91.81 1.68 1.06 1.92 1.18.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.39.66 1.63.78.24.12.4.18.46.28.06.1.06.57-.15 1.1z" />
          </svg>
          Need help? Chat with us on WhatsApp
        </button>
      </div>
      <footer className="site-footer">© 2026 Kabel. All rights reserved.</footer>

      <style jsx>{`
        .page-root { min-height: 100vh; background: linear-gradient(135deg, #eef0f8 0%, #f0f2fa 40%, #e8ecf7 100%); display: flex; flex-direction: column; font-family: 'Geist', 'DM Sans', system-ui, sans-serif; }
        .navbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.06); position: sticky; top: 0; z-index: 10; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-icon { width: 36px; height: 36px; background: linear-gradient(135deg, #5b5ef4, #7c3aed); border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .brand-text { display: flex; flex-direction: column; line-height: 1.1; }
        .brand-name { font-weight: 700; font-size: 15px; color: #1a1a2e; }
        .brand-sub { font-size: 9px; font-weight: 600; letter-spacing: 0.12em; color: #8b8fa8; }
        .nav-actions { display: flex; align-items: center; gap: 10px; }
        .btn-ghost { background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #3a3a5c; padding: 8px 16px; border-radius: 8px; }
        .btn-ghost:hover { background: rgba(91,94,244,0.07); }
        .btn-primary { background: linear-gradient(135deg, #5b5ef4, #7c3aed); color: white; border: none; cursor: pointer; font-size: 14px; font-weight: 600; padding: 9px 20px; border-radius: 10px; }
        .btn-primary:hover { opacity: 0.9; }
        .main { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 60px 24px 40px; }
        .hero { text-align: center; margin-bottom: 40px; }
        .hero-title { font-size: clamp(28px, 5vw, 42px); font-weight: 800; color: #1a1a2e; margin: 0 0 10px; letter-spacing: -0.02em; }
        .hero-sub { font-size: 16px; color: #6b7194; margin: 0; }
        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; width: 100%; max-width: 720px; margin-bottom: 32px; }
        .card { background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.07); cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
        .card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(0,0,0,0.11); }
        .card-bar { height: 4px; }
        .bar-blue { background: linear-gradient(90deg, #5b5ef4, #818cf8); }
        .bar-green { background: linear-gradient(90deg, #10b981, #34d399); }
        .card-body { padding: 28px; }
        .icon-wrap { width: 54px; height: 54px; border-radius: 14px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
        .icon-blue { background: linear-gradient(135deg, #5b5ef4, #818cf8); }
        .icon-green { background: linear-gradient(135deg, #10b981, #34d399); }
        .card-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px; }
        .card-desc { font-size: 14px; color: #6b7194; line-height: 1.55; margin: 0 0 16px; }
        .badge { display: inline-block; font-size: 11px; font-weight: 600; color: #d97706; background: #fef3c7; border: 1px solid #fde68a; border-radius: 20px; padding: 3px 10px; margin-bottom: 20px; }
        .card-link { display: block; color: #5b5ef4; font-size: 14px; font-weight: 600; margin-top: 8px; }
        .footer-note { font-size: 14px; color: #6b7194; }
        .footer-link { color: #5b5ef4; font-weight: 600; text-decoration: none; }
        .whatsapp-bar { display: flex; justify-content: center; padding: 12px 24px 4px; }
        .whatsapp-btn { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #e5e7eb; border-radius: 50px; padding: 10px 20px; font-size: 13px; font-weight: 500; color: #3a3a5c; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .whatsapp-btn:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
        .site-footer { text-align: center; font-size: 12px; color: #9ca3af; padding: 16px 24px 24px; }
      `}</style>
    </div>
  );
}