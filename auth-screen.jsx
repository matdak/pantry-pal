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

      <form onSubmit={onSubmit} style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

Object.assign(window, { AuthScreen });
