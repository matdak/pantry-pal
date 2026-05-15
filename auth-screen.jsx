// auth-screen.jsx — Sign in / Sign up gate

const { useState: useStateAuth, useEffect: useEffectAuth } = React;

function AuthScreen({ p }) {
  const [mode, setMode] = useStateAuth('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useStateAuth('');
  const [password, setPassword] = useStateAuth('');
  const [name, setName] = useStateAuth('');
  const [busy, setBusy] = useStateAuth(false);
  const [err, setErr] = useStateAuth(null);
  const [msg, setMsg] = useStateAuth(null);

  const onSubmit = async (e) => {
    e?.preventDefault();
    setErr(null); setMsg(null); setBusy(true);
    try {
      if (mode === 'signup') {
        const res = await window.PP.signUp(email, password, name);
        if (!res?.session) {
          setMsg('Check your email to confirm your account, then sign in.');
          setMode('signin');
        }
      } else {
        await window.PP.signIn(email, password);
      }
    } catch (e2) {
      setErr(e2.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setErr(null); setMsg(null); setBusy(true);
    try {
      await window.PP.signInWithGoogle();
      // Browser will redirect away to Google; if we return here it's because
      // the popup/redirect was cancelled.
    } catch (e2) {
      setErr(e2.message || 'Google sign-in failed');
      setBusy(false);
    }
  };

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: p.paper, color: p.ink, padding: '54px 22px 22px',
      fontFamily: '"DM Sans", system-ui',
    }}>
      <div style={{ marginTop: 24 }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        }}>Pantry Pal</div>
        <h1 style={{
          margin: '4px 0 8px', fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 38, fontWeight: 400, color: p.ink, letterSpacing: -0.5, lineHeight: 1.05,
        }}>{mode === 'signup' ? 'Make an account.' : 'Welcome back.'}</h1>
        <p style={{
          margin: 0, fontSize: 15, color: p.inkSoft, lineHeight: 1.45, textWrap: 'pretty',
        }}>
          {mode === 'signup'
            ? "We'll save your pantry so it's there next time."
            : "Sign in to see what's in your kitchen."}
        </p>
      </div>

      <button onClick={onGoogle} disabled={busy} style={{
        marginTop: 28, padding: '14px 18px', borderRadius: 14,
        border: `1px solid ${p.line}`, background: p.surface, color: p.ink,
        cursor: busy ? 'wait' : 'pointer',
        fontFamily: '"DM Sans", system-ui', fontSize: 15, fontWeight: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        opacity: busy ? 0.6 : 1, transition: 'opacity 0.2s',
      }}>
        <GoogleLogo size={18} />
        {mode === 'signup' ? 'Continue with Google' : 'Sign in with Google'}
      </button>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 6,
      }}>
        <span style={{ flex: 1, height: 1, background: p.line }} />
        <span style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.inkFaint, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        }}>or with email</span>
        <span style={{ flex: 1, height: 1, background: p.line }} />
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'signup' && (
          <AuthInput label="Your name" value={name} onChange={setName} placeholder="Sam" p={p} />
        )}
        <AuthInput label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" p={p} autoFocus={mode === 'signin'} />
        <AuthInput label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" p={p} />

        {err && <div style={{
          padding: '10px 12px', borderRadius: 10, background: p.danger + '14',
          color: p.danger, fontSize: 13, fontWeight: 500,
        }}>{err}</div>}
        {msg && <div style={{
          padding: '10px 12px', borderRadius: 10, background: p.sage + '14',
          color: p.sage, fontSize: 13, fontWeight: 500,
        }}>{msg}</div>}

        <button type="submit" disabled={busy || !email || !password || (mode === 'signup' && !name)} style={{
          marginTop: 8, padding: '16px 18px', borderRadius: 14, border: 'none',
          background: p.accent, color: p.accentInk, cursor: busy ? 'wait' : 'pointer',
          fontFamily: '"DM Sans", system-ui', fontSize: 16, fontWeight: 600,
          opacity: busy ? 0.6 : 1, transition: 'opacity 0.2s',
        }}>
          {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setErr(null); setMsg(null); }}
        style={{
          marginTop: 18, alignSelf: 'center', background: 'transparent', border: 'none',
          cursor: 'pointer', color: p.inkSoft, fontFamily: '"DM Sans", system-ui',
          fontSize: 14, padding: 8,
        }}>
        {mode === 'signup' ? 'Have an account? Sign in' : "New here? Create an account"}
      </button>
    </div>
  );
}

function AuthInput({ label, value, onChange, type = 'text', placeholder, p, autoFocus }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
        color: p.inkSoft, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600,
      }}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={type === 'password' ? 'current-password' : type === 'email' ? 'email' : 'name'}
        style={{
          padding: '14px 14px', borderRadius: 12, border: `1px solid ${p.line}`,
          background: p.surface, color: p.ink,
          fontFamily: '"DM Sans", system-ui', fontSize: 16, outline: 'none',
        }}
      />
    </label>
  );
}

function GoogleLogo({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}

Object.assign(window, { AuthScreen });
