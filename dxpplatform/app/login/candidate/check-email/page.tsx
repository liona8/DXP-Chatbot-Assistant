"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense } from "react";

function CheckEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") ?? "your email";

  return (
    <div className="page-root">
      <div className="back-bar">
        <button className="back-btn" onClick={() => router.push("/login/candidate")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="#3a3a5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      </div>

      <main className="main">
        <div className="card">
          <div className="card-bar" />
          <div className="card-body">
            <div className="icon-wrap">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="8" width="24" height="18" rx="3" stroke="white" strokeWidth="2" />
                <path d="M4 12l12 8 12-8" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <h1 className="title">Check your email</h1>
            <p className="subtitle">
              We sent a sign-in link to<br />
              <strong>{email}</strong>
            </p>

            <div className="info-box">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{flexShrink: 0, marginTop: 1}}>
                <circle cx="9" cy="9" r="8" stroke="#5b5ef4" strokeWidth="1.5" />
                <path d="M9 8v5M9 6v.5" stroke="#5b5ef4" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="info-text">
                Click the link in the email to sign in. The link expires in <strong>10 minutes</strong>.
                If you don&apos;t see it, check your spam folder.
              </p>
            </div>

            <button className="btn-back" onClick={() => router.push("/login/candidate")}>
              Use a different email
            </button>
          </div>
        </div>
      </main>

      <style jsx>{`
        .page-root {
          min-height: 100vh;
          background: linear-gradient(135deg, #eef0f8 0%, #f0f2fa 40%, #e8ecf7 100%);
          display: flex; flex-direction: column;
          font-family: 'Geist', 'DM Sans', system-ui, sans-serif;
        }
        .back-bar { padding: 20px 32px 0; }
        .back-btn {
          display: inline-flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer;
          font-size: 14px; font-weight: 500; color: #3a3a5c;
          padding: 6px 0; transition: color 0.15s;
        }
        .back-btn:hover { color: #5b5ef4; }
        .main {
          flex: 1; display: flex; align-items: flex-start; justify-content: center;
          padding: 24px 16px 40px;
        }
        .card {
          background: white; border-radius: 20px; overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          width: 100%; max-width: 460px;
        }
        .card-bar {
          height: 4px;
          background: linear-gradient(90deg, #5b5ef4, #818cf8, #7c3aed);
        }
        .card-body {
          padding: 40px 40px 36px;
          display: flex; flex-direction: column; align-items: center;
        }
        .icon-wrap {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, #5b5ef4, #7c3aed);
          border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 4px 16px rgba(91,94,244,0.3);
        }
        .title {
          font-size: 24px; font-weight: 800; color: #1a1a2e;
          margin: 0 0 8px; letter-spacing: -0.02em;
        }
        .subtitle {
          font-size: 14px; color: #6b7194; text-align: center;
          margin: 0 0 24px; line-height: 1.6;
        }
        .subtitle strong { color: #1a1a2e; }
        .info-box {
          display: flex; gap: 10px; align-items: flex-start;
          background: #f5f5ff; border: 1px solid #e0e0ff;
          border-radius: 12px; padding: 14px 16px;
          margin-bottom: 28px; width: 100%;
        }
        .info-text { font-size: 13px; color: #4a4a6a; line-height: 1.55; margin: 0; }
        .info-text strong { color: #1a1a2e; }
        .btn-back {
          background: none; border: 1.5px solid #d1d5db;
          border-radius: 10px; padding: 11px 24px;
          font-size: 14px; font-weight: 600; color: #3a3a5c;
          cursor: pointer; transition: border-color 0.15s, color 0.15s;
        }
        .btn-back:hover { border-color: #5b5ef4; color: #5b5ef4; }
      `}</style>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}