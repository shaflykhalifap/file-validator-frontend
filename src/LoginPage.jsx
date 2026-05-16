import { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";

const GOOGLE_FONTS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
`;

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --white: #ffffff;
    --off-white: #f7f6f3;
    --stone-100: #f0ede8;
    --stone-200: #e4dfd7;
    --stone-400: #a89f94;
    --stone-600: #6b6259;
    --stone-900: #1c1917;
    --accent: #2d5a3d;
    --accent-light: #e8f0eb;
    --error: #c0392b;
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background-color: var(--off-white);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .login-root {
    width: 100vw;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--off-white);
    font-family: 'DM Sans', sans-serif;
    position: relative;
  }

  .login-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 20%, rgba(45,90,61,0.07) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 80%, rgba(45,90,61,0.05) 0%, transparent 50%);
    pointer-events: none;
  }

  /* ── CARD ── */
  .right-panel {
    background-color: var(--white);
    border-radius: 20px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.08);
    padding: 52px 56px;
    width: 100%;
    max-width: 440px;
    margin: 24px;
    position: relative;
    z-index: 1;
  }

  .right-panel::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    background: radial-gradient(ellipse at 90% 5%, var(--accent-light) 0%, transparent 55%);
    pointer-events: none;
    opacity: 0.6;
  }

  .logo-mark {
    width: 36px;
    height: 36px;
    background: var(--accent);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-mark svg { display: block; }

  .logo-name {
    font-family: 'DM Sans', sans-serif;
    font-weight: 500;
    font-size: 15px;
    color: var(--stone-900);
    letter-spacing: 0.02em;
  }

  .left-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
    opacity: 0;
    transform: translateY(12px);
    animation: fadeUp 0.7s ease forwards 0.1s;
  }

  .form-header {
    margin-bottom: 40px;
    opacity: 0;
    transform: translateY(14px);
    animation: fadeUp 0.7s ease forwards 0.2s;
  }

  .form-greeting {
    font-size: 13px;
    font-weight: 400;
    color: var(--stone-400);
    margin-bottom: 8px;
    letter-spacing: 0.01em;
  }

  .form-title {
    font-family: 'DM Serif Display', serif;
    font-size: 32px;
    color: var(--stone-900);
    line-height: 1.2;
  }

  .form-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
    opacity: 0;
    transform: translateY(14px);
    animation: fadeUp 0.7s ease forwards 0.35s;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .field-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--stone-600);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .field-input-wrap {
    position: relative;
  }

  .field-input {
    width: 100%;
    padding: 13px 16px 13px 44px;
    border: 1.5px solid var(--stone-200);
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 400;
    color: var(--stone-900);
    background: var(--off-white);
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
    -webkit-appearance: none;
  }

  .field-input::placeholder { color: var(--stone-400); }

  .field-input:focus {
    border-color: var(--accent);
    background: var(--white);
    box-shadow: 0 0 0 3px rgba(45,90,61,0.08);
  }

  .field-input.has-error {
    border-color: var(--error);
    background: #fff8f8;
  }

  .field-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--stone-400);
    pointer-events: none;
    transition: color 0.2s;
  }

  .field-input:focus + .field-icon,
  .field-input-wrap:focus-within .field-icon {
    color: var(--accent);
  }

  .field-icon svg { display: block; }

  .pass-toggle {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    color: var(--stone-400);
    padding: 2px;
    display: flex;
    align-items: center;
    transition: color 0.2s;
  }
  .pass-toggle:hover { color: var(--stone-600); }

  .field-error {
    font-size: 12px;
    color: var(--error);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .form-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .remember-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .remember-check {
    width: 16px;
    height: 16px;
    border: 1.5px solid var(--stone-200);
    border-radius: 4px;
    background: var(--off-white);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .remember-check.checked {
    background: var(--accent);
    border-color: var(--accent);
  }

  .remember-label {
    font-size: 13px;
    color: var(--stone-600);
    user-select: none;
  }

  .forgot-link {
    font-size: 13px;
    color: var(--accent);
    font-weight: 500;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-decoration: none;
  }
  .forgot-link:hover { text-decoration: underline; }

  .submit-btn {
    width: 100%;
    padding: 14px;
    background: var(--accent);
    color: var(--white);
    border: none;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.03em;
    cursor: pointer;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }

  .submit-btn:hover:not(:disabled) {
    background: #234a31;
    box-shadow: 0 6px 20px rgba(45,90,61,0.3);
    transform: translateY(-1px);
  }

  .submit-btn:active:not(:disabled) { transform: translateY(0); }

  .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

  .submit-btn-inner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .form-footer {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--stone-100);
    text-align: center;
    opacity: 0;
    animation: fadeUp 0.7s ease forwards 0.5s;
  }

  .footer-text {
    font-size: 12px;
    color: var(--stone-400);
    line-height: 1.6;
  }

  .global-error {
    background: #fff0f0;
    border: 1px solid #fcd5d5;
    border-radius: 8px;
    padding: 11px 14px;
    font-size: 13px;
    color: var(--error);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── ANIMATIONS ── */
  @keyframes fadeUp {
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 520px) {
    .right-panel { padding: 40px 28px; margin: 16px; }
  }
`;

// ── Icons ──
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconEye = ({ off }) => off ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconCheck = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2,6 5,9 10,3"/>
  </svg>
);

const IconShield = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

// ── Component ──
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [fontsReady, setFontsReady] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GOOGLE_FONTS + styles;
    document.head.appendChild(style);
    setTimeout(() => setFontsReady(true), 100);
    return () => document.head.removeChild(style);
  }, []);

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Email wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Format email tidak valid";
    if (!password) e.password = "Password wajib diisi";
    else if (password.length < 6) e.password = "Password minimal 6 karakter";
    return e;
  };

  const handleSubmit = async () => {
    setGlobalError("");
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setGlobalError(result.message);
    }
  };

  const handleKey = (ev) => { if (ev.key === "Enter") handleSubmit(); };

  if (!fontsReady) return null;

  return (
    <div className="login-root">
      <div className="right-panel">
        <div className="form-wrapper">

          <div className="form-header">
            <div className="left-logo">
              <div className="logo-mark"><IconShield /></div>
              <span className="logo-name">FileValidator System</span>
            </div>
            <p className="form-greeting">Selamat datang kembali 👋</p>
            <h2 className="form-title">Masuk ke akun Anda</h2>
          </div>

          <div className="form-body">

            {globalError && (
              <div className="global-error">
                <IconAlert />
                {globalError}
              </div>
            )}

            {/* Email */}
            <div className="field-group">
              <label className="field-label">Email</label>
              <div className="field-input-wrap">
                <input
                  type="email"
                  className={`field-input${errors.email ? " has-error" : ""}`}
                  placeholder="nama@perusahaan.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: "" })); }}
                  onKeyDown={handleKey}
                  autoComplete="email"
                />
                <span className="field-icon"><IconMail /></span>
              </div>
              {errors.email && <span className="field-error"><IconAlert />{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="field-group">
              <label className="field-label">Password</label>
              <div className="field-input-wrap">
                <input
                  type={showPass ? "text" : "password"}
                  className={`field-input${errors.password ? " has-error" : ""}`}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: "" })); }}
                  onKeyDown={handleKey}
                  autoComplete="current-password"
                />
                <span className="field-icon"><IconLock /></span>
                <button className="pass-toggle" onClick={() => setShowPass(v => !v)} type="button" tabIndex={-1}>
                  <IconEye off={showPass} />
                </button>
              </div>
              {errors.password && <span className="field-error"><IconAlert />{errors.password}</span>}
            </div>

            {/* Options */}
            <div className="form-options">
              <div className="remember-wrap" onClick={() => setRemember(v => !v)}>
                <div className={`remember-check${remember ? " checked" : ""}`}>
                  {remember && <IconCheck />}
                </div>
                <span className="remember-label">Ingat saya</span>
              </div>
              <button className="forgot-link" type="button">Lupa password?</button>
            </div>

            {/* Submit */}
            <button className="submit-btn" onClick={handleSubmit} disabled={loading} type="button">
              <div className="submit-btn-inner">
                {loading ? (
                  <><div className="spinner" /> Memverifikasi...</>
                ) : (
                  "Masuk →"
                )}
              </div>
            </button>

          </div>

          <div className="form-footer">
            <p className="footer-text">
              Sistem ini hanya dapat diakses oleh tim internal.<br />
              Hubungi administrator jika mengalami masalah login.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
