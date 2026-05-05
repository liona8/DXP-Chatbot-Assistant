"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { candidateLogin } from "../action";

export default function CandidatePage() {
 const router = useRouter();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || locked) return;

    setPending(true);
    setLocked(true);
    setError(null);

    try {
      const result = await candidateLogin(email);

      if (result?.error) {
        setError(result.error);
        setPending(false);
        setLocked(false);
        return;
      }
      // router.push(
      //   `/login/candidate/check-email?email=${encodeURIComponent(email)}`
      // );
      router.replace("/");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setPending(false);
      setLocked(false);
    }
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
            <div className="icon-wrap">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
                <circle cx="15" cy="10" r="5.5" stroke="white" strokeWidth="2" />
                <path d="M5 26c0-5.5 4.5-9 10-9s10 3.5 10 9" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 6l2.5 2.5-5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="title">Candidate Sign In</h1>
            <p className="subtitle">Enter your email to continue</p>

            <div className="info-box">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="8" cy="8" r="7" stroke="#5b5ef4" strokeWidth="1.5" />
                <path d="M8 7v4M8 5.5v.5" stroke="#5b5ef4" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="info-text">
                <strong>Why a Kabel account? </strong> DXP is Kabel&apos;s Digital Acceleration Program.
                Your Kabel profile is your identity across both platforms, so you&apos;ll sign in with
                the same email you use on Kabel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div className="field">
                <label className="label">Email address</label>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`input ${error ? "input-error" : ""}`}
                  disabled={pending}
                  autoFocus
                />
                {error
                  ? <p className="hint error">{error}</p>
                  : <p className="hint">Use the same email as your Kabel account</p>
                }
              </div>

              <button type="submit" className="btn-submit" disabled={pending || !email}>
                {pending ? "Checking…" : "Continue"}
              </button>
            </form>
          </div>
        </div>
      </main>

      <style jsx>{`
        .page-root { min-height: 100vh; background: linear-gradient(135deg, #eef0f8 0%, #f0f2fa 40%, #e8ecf7 100%); display: flex; flex-direction: column; font-family: 'Geist', 'DM Sans', system-ui, sans-serif; }
        .back-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 500; color: #3a3a5c; padding: 20px 32px 0; transition: color 0.15s; }
        .back-btn:hover { color: #5b5ef4; }
        .main { flex: 1; display: flex; justify-content: center; padding: 24px 16px; }
        .card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); width: 100%; max-width: 460px; height: fit-content; }
        .card-bar { height: 4px; background: linear-gradient(90deg, #5b5ef4, #7c3aed); }
        .card-body { padding: 40px; display: flex; flex-direction: column; align-items: center; }
        .icon-wrap { width: 64px; height: 64px; background: linear-gradient(135deg, #5b5ef4, #7c3aed); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 4px 16px rgba(91,94,244,0.3); }
        .title { font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0 0 6px; letter-spacing: -0.02em; }
        .subtitle { font-size: 14px; color: #6b7194; margin: 0 0 24px; }
        .info-box { display: flex; gap: 10px; background: #f5f5ff; border: 1px solid #e0e0ff; border-radius: 12px; padding: 14px 16px; margin-bottom: 28px; width: 100%; }
        .info-text { font-size: 13px; color: #4a4a6a; line-height: 1.55; margin: 0; }
        .info-text strong { color: #1a1a2e; }
        .form { width: 100%; display: flex; flex-direction: column; gap: 20px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .label { font-size: 14px; font-weight: 600; color: #1a1a2e; }
        .input { border: 1.5px solid #d1d5db; border-radius: 10px; padding: 12px 14px; font-size: 15px; color: #1a1a2e; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .input::placeholder { color: #9ca3af; }
        .input:focus { border-color: #5b5ef4; box-shadow: 0 0 0 3px rgba(91,94,244,0.12); }
        .input:disabled { background: #f9fafb; }
        .input-error { border-color: #ef4444 !important; }
        .hint { font-size: 12px; color: #9ca3af; margin: 0; }
        .error { color: #dc2626 !important; }
        .btn-submit { width: 100%; background: linear-gradient(135deg, #5b5ef4, #7c3aed); color: white; border: none; cursor: pointer; font-size: 15px; font-weight: 700; padding: 14px; border-radius: 12px; transition: opacity 0.15s; }
        .btn-submit:hover:not(:disabled) { opacity: 0.9; }
        .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        @media (max-width: 520px) { .card-body { padding: 28px 20px; } .back-btn { padding: 16px 16px 0; } }
      `}</style>
    </div>
  );
}