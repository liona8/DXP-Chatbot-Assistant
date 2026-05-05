"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mentorLogin } from "../action";

export default function MentorPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const result = await mentorLogin(email);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
    // on success → server action redirects automatically
    router.replace('/'); //-> replace the page that you want to go
  }

  return (
    <div className="page-root">
      <button className="back-btn" onClick={() => router.push("/login")}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8L10 13" stroke="#3a3a5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to role selection
      </button>

      <main className="main">
        <div className="card">
          <div className="card-bar" />
          <div className="card-body">

            {/* Green mentor icon */}
            <div className="icon-wrap">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <circle cx="11" cy="10" r="4.5" stroke="white" strokeWidth="2" />
                <path d="M3 25c0-4.5 3.5-7.5 8-7.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="21" cy="19" r="6" stroke="white" strokeWidth="2" />
                <path d="M18.5 19h5M21 16.5v5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="title">Mentor Sign In</h1>
            <p className="subtitle">Enter your email to receive a sign-in code</p>

            <form onSubmit={handleSubmit} className="form">
              <div className="field">
                <label className="label">Email address</label>
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`input ${error ? "input-error" : ""}`}
                  disabled={pending}
                  autoFocus
                />
                {error && <p className="hint error">{error}</p>}
              </div>

              <button type="submit" className="btn-submit" disabled={pending || !email}>
                {pending ? "Sending code…" : "Continue with Email"}
              </button>
            </form>

            {/* Divider */}
            <div className="divider">
              <span>NEW MENTOR?</span>
            </div>

            {/* Register button */}
            <button className="btn-register" onClick={() => router.push("/register/mentor")}>
              Register as a mentor
            </button>

          </div>
        </div>

        {/* Bottom note */}
        <p className="bottom-note">
          We&apos;ll send a secure, one-time code to your email.<br />
          No password required.
        </p>
      </main>

      <style jsx>{`
        .page-root { min-height: 100vh; background: linear-gradient(135deg, #eef0f8 0%, #f0f2fa 40%, #e8ecf7 100%); display: flex; flex-direction: column; font-family: 'Geist', 'DM Sans', system-ui, sans-serif; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #3a3a5c; padding: 20px 32px 0; transition: color 0.15s; }
        .back-btn:hover { color: #10b981; }
        .main { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 24px 16px 40px; }
        .card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); width: 100%; max-width: 460px; height: fit-content; }
        .card-bar { height: 4px; background: linear-gradient(90deg, #10b981, #34d399); }
        .card-body { padding: 40px; display: flex; flex-direction: column; align-items: center; }
        .icon-wrap { width: 64px; height: 64px; background: linear-gradient(135deg, #10b981, #059669); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 4px 16px rgba(16,185,129,0.3); }
        .title { font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0 0 6px; letter-spacing: -0.02em; }
        .subtitle { font-size: 14px; color: #6b7194; margin: 0 0 28px; text-align: center; }
        .form { width: 100%; display: flex; flex-direction: column; gap: 16px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .label { font-size: 14px; font-weight: 600; color: #1a1a2e; }
        .input { border: 1.5px solid #d1d5db; border-radius: 10px; padding: 12px 14px; font-size: 15px; color: #1a1a2e; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .input::placeholder { color: #9ca3af; }
        .input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.12); }
        .input:disabled { background: #f9fafb; }
        .input-error { border-color: #ef4444 !important; }
        .hint { font-size: 12px; color: #9ca3af; margin: 0; }
        .error { color: #dc2626 !important; }

        /* Green submit button */
        .btn-submit { width: 100%; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; cursor: pointer; font-size: 15px; font-weight: 700; padding: 14px; border-radius: 12px; transition: opacity 0.15s; }
        .btn-submit:hover:not(:disabled) { opacity: 0.9; }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Divider */
        .divider { display: flex; align-items: center; width: 100%; margin: 24px 0 16px; gap: 12px; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }
        .divider span { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 0.08em; white-space: nowrap; }

        /* Register outline button */
        .btn-register { width: 100%; background: white; border: 1.5px solid #d1d5db; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 600; color: #1a1a2e; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
        .btn-register:hover { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.08); }

        /* Bottom note */
        .bottom-note { font-size: 13px; color: #9ca3af; text-align: center; margin-top: 24px; line-height: 1.6; }

        @media (max-width: 520px) { .card-body { padding: 28px 20px; } .back-btn { padding: 16px 16px 0; } }
      `}</style>
    </div>
  );
}