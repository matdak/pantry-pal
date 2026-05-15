// screens-main.jsx — Onboarding, Home (3 layouts), Pantry, Add Chat

const { useState: useState1, useEffect: useEffect1, useRef: useRef1, useMemo: useMemo1 } = React;

// ─────────────────────────────────────────────────────────────
// Onboarding — 3 steps (welcome, name, chat)
// ─────────────────────────────────────────────────────────────
function Onboarding({ onFinish, p, initialName = '' }) {
  const [step, setStep] = useState1(0);
  const [name, setName] = useState1(initialName || '');
  const hasName = !!initialName.trim();

  if (step === 0) return <OnboardingWelcome p={p}
    onNext={() => setStep(hasName ? 2 : 1)} />;
  if (step === 1) return <OnboardingName p={p} name={name} setName={setName} onNext={() => setStep(2)} />;
  return <OnboardingVoice p={p} name={name || 'there'}
    onFinish={(items) => onFinish(items, name)} />;
}

// Sample utterances cycled on each tap — what someone naturally says.
const VOICE_SAMPLES = [
  { text: "Okay let's see… I've got like a bunch of carrots, a couple lemons left, half a tub of yogurt — and probably eight or so eggs.",
    items: [
      { name: 'Carrots', said: 'a bunch of carrots', qty: '~1 lb' },
      { name: 'Lemons', said: 'a couple lemons', qty: '~2' },
      { name: 'Greek yogurt', said: 'half a tub', qty: '~½ container' },
      { name: 'Eggs', said: 'eight or so', qty: '~8' },
    ] },
  { text: "Some garlic, an onion or two, a little knob of ginger, and the chicken thighs from yesterday.",
    items: [
      { name: 'Garlic', said: 'some garlic', qty: '~1 head' },
      { name: 'Yellow onions', said: 'an onion or two', qty: '~2' },
      { name: 'Ginger root', said: 'a little knob', qty: '~2 in' },
      { name: 'Chicken thighs', said: 'thighs from yesterday', qty: '~1 lb' },
    ] },
  { text: "Most of a box of penne, a fair amount of jasmine rice, olive oil, soy sauce. Plus cumin and smoked paprika in the cabinet.",
    items: [
      { name: 'Penne', said: 'most of a box', qty: '~¾ box' },
      { name: 'Jasmine rice', said: 'a fair amount', qty: '~2 lb' },
      { name: 'Olive oil', said: '', qty: '~½ bottle' },
      { name: 'Soy sauce', said: '', qty: '~full' },
      { name: 'Cumin', said: '', qty: '1 jar' },
      { name: 'Smoked paprika', said: '', qty: '1 jar' },
    ] },
  { text: "Some cilantro that's looking a little sad, four or five roma tomatoes, and a bag of baby spinach that's almost full.",
    items: [
      { name: 'Cilantro', said: 'looking a little sad', qty: '~½ bunch', tag: 'expiring' },
      { name: 'Roma tomatoes', said: 'four or five', qty: '~4' },
      { name: 'Baby spinach', said: 'almost full bag', qty: '~5 oz' },
    ] },
];

function OnboardingVoice({ p, name, onFinish }) {
  const [parsed, setParsed] = useState1([]);
  const [transcripts, setTranscripts] = useState1([]);
  const [phase, setPhase] = useState1('intro'); // intro|idle|recording|transcribing|animating|landed|denied|error
  const [liveText, setLiveText] = useState1('');
  const [errorMsg, setErrorMsg] = useState1('');
  const [keyboardMode, setKeyboardMode] = useState1(false);
  const [draft, setDraft] = useState1('');
  const scrollRef = useRef1(null);
  const recorderRef = useRef1(null);

  useEffect1(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [transcripts, parsed, liveText, phase]);

  useEffect1(() => {
    const id = setTimeout(() => setPhase('idle'), 700);
    return () => clearTimeout(id);
  }, []);

  // Always cancel any in-flight recording on unmount.
  useEffect1(() => () => { recorderRef.current?.cancel?.(); }, []);

  const animateLanding = (text) => {
    setPhase('animating');
    setLiveText('');
    const words = text.split(/\s+/);
    let i = 0;
    const tick = () => {
      i += 1;
      setLiveText(words.slice(0, i).join(' '));
      if (i < words.length) {
        setTimeout(tick, 55 + Math.random() * 35);
      } else {
        setTimeout(() => {
          const items = window.PP.parseTranscript(text);
          const existing = new Set(parsed.map(it => it.name.toLowerCase()));
          const fresh = items.filter(it => !existing.has(it.name.toLowerCase()));
          setParsed(p2 => [...p2, ...fresh]);
          setTranscripts(ts => [...ts, { text, count: fresh.length }]);
          setLiveText('');
          setPhase(fresh.length ? 'landed' : 'idle');
          if (fresh.length) setTimeout(() => setPhase('idle'), 1200);
        }, 400);
      }
    };
    setTimeout(tick, 200);
  };

  const onMicTap = async () => {
    if (phase === 'transcribing' || phase === 'animating') return;

    // Currently recording → stop and transcribe
    if (phase === 'recording') {
      const handle = recorderRef.current;
      recorderRef.current = null;
      setPhase('transcribing');
      setLiveText('');
      try {
        const { blob } = await handle.stop();
        if (!blob || blob.size < 1500) {
          setPhase('idle');
          return;
        }
        const result = await window.PP.transcribe(blob, { languageCode: 'eng' });
        const text = (result?.text || '').trim();
        if (!text) {
          setErrorMsg("Didn't catch that — try again?");
          setPhase('error');
          setTimeout(() => { setPhase('idle'); setErrorMsg(''); }, 2400);
          return;
        }
        animateLanding(text);
      } catch (err) {
        console.error('transcribe failed', err);
        setErrorMsg(err.message || 'Could not transcribe');
        setPhase('error');
        setTimeout(() => { setPhase('idle'); setErrorMsg(''); }, 2800);
      }
      return;
    }

    // Otherwise start recording
    try {
      setErrorMsg('');
      const handle = await window.PP.startRecording();
      recorderRef.current = handle;
      setPhase('recording');
    } catch (err) {
      console.error('mic start failed', err);
      if (err?.name === 'NotAllowedError' || /denied|permission/i.test(err?.message || '')) {
        setErrorMsg('Mic blocked — switching to keyboard');
        setKeyboardMode(true);
        setPhase('denied');
        setTimeout(() => { setPhase('idle'); setErrorMsg(''); }, 2400);
      } else {
        setErrorMsg(err?.message || 'Microphone not available');
        setPhase('error');
        setTimeout(() => { setPhase('idle'); setErrorMsg(''); }, 2800);
      }
    }
  };

  const sendTyped = () => {
    if (!draft.trim()) return;
    const items = (window.PP?.parseTranscript?.(draft)) || [];
    if (items.length) {
      const existing = new Set(parsed.map(x => x.name.toLowerCase()));
      const fresh = items.filter(it => !existing.has(it.name.toLowerCase()));
      if (fresh.length) {
        setParsed(p2 => [...p2, ...fresh]);
        setTranscripts(ts => [...ts, { text: draft, count: fresh.length, typed: true }]);
      }
    }
    setDraft('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: p.paper }}>
      {/* header */}
      <div style={{ padding: '20px 22px 8px' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        }}>Step 3 of 4</div>
        <h1 style={{
          margin: '6px 0 8px', fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 30, fontWeight: 400, color: p.ink,
          letterSpacing: -0.5, lineHeight: 1.06, textWrap: 'pretty',
        }}>
          Walk me through<br/>your kitchen, {name}.
        </h1>
        <p style={{
          margin: 0, fontFamily: '"DM Sans", system-ui',
          fontSize: 14, color: p.inkSoft, lineHeight: 1.45, maxWidth: 320,
        }}>
          Open a drawer, talk through a shelf, or just rattle off whatever's nearby. Pal will figure it out.
        </p>
      </div>

      {/* live transcripts area */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '16px 18px 4px',
        display: 'flex', flexDirection: 'column', gap: 10,
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%)',
      }}>
        {transcripts.length === 0 && !['recording', 'transcribing', 'animating'].includes(phase) && (
          <EmptyHint p={p} />
        )}

        {transcripts.map((t, i) => (
          <TranscriptCard key={i} t={t} p={p} />
        ))}

        {['recording', 'transcribing', 'animating'].includes(phase) && (
          <div style={{
            padding: '12px 14px', borderRadius: 14, background: p.surface,
            border: `1px solid ${p.accent}50`,
            boxShadow: `0 0 0 4px ${p.accent}10`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
              color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: 999, background: p.accent,
                animation: 'pulse 1s ease-out infinite',
              }} />
              {phase === 'recording' ? 'Listening' : phase === 'transcribing' ? 'Transcribing' : 'Got it'}
            </div>
            <div style={{
              fontFamily: '"Newsreader", Georgia, serif', fontSize: 16, lineHeight: 1.4,
              color: p.ink, fontStyle: 'italic', minHeight: 22,
            }}>{liveText
              ? <>"{liveText}<span style={{
                  display: 'inline-block', width: 2, height: 14, background: p.accent,
                  marginLeft: 2, verticalAlign: 'middle',
                  animation: 'pulse 0.8s ease-in-out infinite',
                }} />"</>
              : phase === 'transcribing'
                ? <span style={{ color: p.inkSoft, fontStyle: 'normal' }}>One sec, working it out…</span>
                : <span style={{ color: p.inkSoft, fontStyle: 'normal' }}>Tap the mic again when you're done.</span>
            }</div>
          </div>
        )}

        {parsed.length > 0 && (
          <div style={{
            marginTop: 6, padding: '12px 14px 14px', borderRadius: 14, background: p.accent + '10',
            border: `1px solid ${p.accent}25`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
              }}>In your pantry · {parsed.length}</div>
              <div style={{
                fontFamily: '"DM Sans", system-ui', fontSize: 11, color: p.inkSoft,
                fontStyle: 'italic',
              }}>tap to edit</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {parsed.map((it, i) => (
                <ParsedItemRow key={i} item={it} p={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* mic + status */}
      {!keyboardMode ? (
        <div style={{
          padding: '12px 18px 12px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8,
        }}>
          <div style={{
            fontFamily: '"DM Sans", system-ui', fontSize: 13,
            color: (phase === 'error' || phase === 'denied') ? p.danger : phase === 'recording' ? p.accent : p.inkSoft,
            fontWeight: phase === 'recording' ? 600 : 500, minHeight: 18, textAlign: 'center',
          }}>
            {(phase === 'error' || phase === 'denied') && errorMsg ? errorMsg :
             phase === 'recording' ? 'Speak now — tap to stop' :
             phase === 'transcribing' ? 'Transcribing…' :
             phase === 'animating' ? '' :
             phase === 'landed' ? 'Got those.' :
             transcripts.length === 0 ? 'Tap to start talking' :
             'Tap to add more'}
          </div>
          <MicButton phase={phase} onClick={onMicTap} p={p} />
        </div>
      ) : (
        <div style={{ padding: '6px 14px 8px', background: p.paper }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setKeyboardMode(false)} style={{
              width: 44, height: 44, borderRadius: 999, flexShrink: 0,
              background: p.surface, border: `1px solid ${p.line}`,
              color: p.ink, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="mic" size={18} strokeWidth={1.8} />
            </button>
            <div style={{
              flex: 1, display: 'flex', gap: 8, alignItems: 'center',
              background: p.surface, border: `1px solid ${p.line}`, borderRadius: 999,
              padding: '4px 6px 4px 16px',
            }}>
              <input value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendTyped()}
                autoFocus
                placeholder="What did you find?"
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  color: p.ink, fontFamily: '"DM Sans", system-ui', fontSize: 15,
                  padding: '10px 0',
                }} />
              <button onClick={sendTyped} disabled={!draft.trim()} style={{
                width: 36, height: 36, borderRadius: 999, border: 'none',
                background: draft.trim() ? p.accent : p.surfaceAlt,
                color: draft.trim() ? p.accentInk : p.inkFaint, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="send" size={15} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* footer: secondary toggle + primary done */}
      <div style={{
        padding: '6px 22px 28px', background: p.paper,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
      }}>
        <button onClick={() => setKeyboardMode(k => !k)} style={{
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
          color: p.inkSoft, fontFamily: '"DM Sans", system-ui', fontSize: 12,
          display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 500,
        }}>
          <Icon name={keyboardMode ? 'mic' : 'keyboard'} size={13} strokeWidth={1.8} />
          {keyboardMode ? 'Use voice instead' : 'Use keyboard instead'}
        </button>
        <BigButton fullWidth p={p}
          onClick={() => onFinish(parsed)}
          variant={parsed.length === 0 ? 'secondary' : 'primary'}
          icon="arrowRight">
          {parsed.length === 0
            ? "Skip for now"
            : `Continue · ${parsed.length} item${parsed.length>1?'s':''}`}
        </BigButton>
      </div>
    </div>
  );
}

function EmptyHint({ p }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 14, border: `1px dashed ${p.line}`,
      background: p.surface,
    }}>
      <div style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5,
        color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        marginBottom: 6,
      }}>Vague is fine</div>
      <div style={{
        fontFamily: '"DM Sans", system-ui', fontSize: 13, color: p.inkSoft,
        lineHeight: 1.5, textWrap: 'pretty',
      }}>
        <span style={{ color: p.ink, fontStyle: 'italic' }}>"a bunch of carrots, half a tub of yogurt, and a few slices of bread"</span>
        <br />
        Pal figures out roughly how much — and you can adjust anytime.
      </div>
    </div>
  );
}

function TranscriptCard({ t, p }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 14, background: p.surface,
      border: `1px solid ${p.line}`,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
        fontFamily: '"JetBrains Mono", monospace', fontSize: 9.5,
        color: p.inkFaint, textTransform: 'uppercase', letterSpacing: 1.3, fontWeight: 600,
      }}>
        <Icon name={t.typed ? 'keyboard' : 'mic'} size={11} strokeWidth={2} />
        <span>You said</span>
        <span style={{ opacity: 0.5 }}>·</span>
        <span style={{ color: p.accent }}>+{t.count} item{t.count>1?'s':''}</span>
      </div>
      <div style={{
        fontFamily: '"Newsreader", Georgia, serif', fontSize: 14.5, lineHeight: 1.45,
        color: p.ink, fontStyle: 'italic',
      }}>"{t.text}"</div>
    </div>
  );
}

function ParsedItemRow({ item, p }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 10, background: p.surface,
      border: `1px solid ${p.line}`,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: 999, background: p.sage, flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: '"DM Sans", system-ui', fontSize: 14, fontWeight: 600,
          color: p.ink, lineHeight: 1.2,
        }}>{item.name}</div>
        <div style={{
            fontFamily: '"DM Sans", system-ui', fontSize: 11.5, color: p.inkSoft,
            marginTop: 2,
          }}>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
              color: p.ink, fontWeight: 600,
              padding: '1px 5px', borderRadius: 4, background: p.surfaceAlt,
            }}>{item.qty}</span>
          </div>
      </div>
      {item.tag === 'expiring' && (
        <span style={{
          padding: '2px 6px', borderRadius: 999, background: p.warning + '22',
          color: p.warning, fontFamily: '"DM Sans", system-ui', fontSize: 10,
          fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>
          <Icon name="leaf" size={9} strokeWidth={2.2} />
          use soon
        </span>
      )}
      <Icon name="edit" size={13} stroke={p.inkFaint} strokeWidth={1.6} />
    </div>
  );
}

function MicButton({ phase, onClick, p }) {
  const recording = phase === 'recording';
  const busy = phase === 'transcribing' || phase === 'animating';
  const landed = phase === 'landed';
  const disabled = busy;
  return (
    <div style={{ position: 'relative', width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {recording && (
        <>
          <span style={{
            position: 'absolute', inset: -14, borderRadius: 999,
            background: p.accent + '25', animation: 'pulse 1.8s ease-out infinite',
          }} />
          <span style={{
            position: 'absolute', inset: -4, borderRadius: 999,
            background: p.accent + '40', animation: 'pulse 1.8s ease-out 0.4s infinite',
          }} />
        </>
      )}
      <button onClick={onClick} disabled={disabled} style={{
        position: 'relative', width: 84, height: 84, borderRadius: 999, border: 'none',
        background: landed ? p.sage : p.accent,
        color: '#fff', cursor: disabled ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 12px 30px ${(landed ? p.sage : p.accent)}55, 0 1px 0 rgba(255,255,255,0.3) inset`,
        transition: 'background 0.2s, transform 0.15s',
        transform: recording ? 'scale(1.04)' : 'scale(1)',
        opacity: disabled ? 0.7 : 1,
      }}>
        {busy ? (
          <span style={{
            width: 28, height: 28, borderRadius: 999,
            border: '3px solid rgba(255,255,255,0.5)', borderTopColor: '#fff',
            animation: 'spin 0.8s linear infinite',
          }} />
        ) : recording ? (
          <span style={{ width: 26, height: 26, borderRadius: 6, background: '#fff' }} />
        ) : (
          <Icon name={landed ? 'check' : 'mic'} size={36} strokeWidth={landed ? 2.5 : 1.8} />
        )}
      </button>
    </div>
  );
}

function OnboardingWelcome({ p, onNext }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: p.paper, padding: '0 24px',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{
          width: 60, height: 60, borderRadius: 20, background: p.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: p.accentInk, marginBottom: 28,
          boxShadow: `0 12px 32px ${p.accent}40`,
        }}>
          <Icon name="chef" size={30} strokeWidth={1.8} />
        </div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
          marginBottom: 12,
        }}>Pantry Pal</div>
        <h1 style={{
          margin: 0, fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 40, fontWeight: 400, color: p.ink,
          lineHeight: 1.02, letterSpacing: -0.8, textWrap: 'pretty',
        }}>
          Cook from what<br/>you already <em style={{ fontStyle: 'italic', color: p.accent }}>have.</em>
        </h1>
        <p style={{
          margin: '20px 0 0', fontFamily: '"DM Sans", system-ui',
          fontSize: 16, color: p.inkSoft, lineHeight: 1.45,
          maxWidth: 320, textWrap: 'pretty',
        }}>
          Just talk to Pal as you wander your kitchen. We'll catch every shelf, every half-bag — then suggest real recipes that use it up before it goes off.
        </p>

        <div style={{
          marginTop: 26, display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 12, background: p.surface,
          border: `1px solid ${p.line}`, maxWidth: 320,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 999, background: p.accent + '18',
            color: p.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="mic" size={16} strokeWidth={1.8} />
          </div>
          <div style={{
            fontFamily: '"DM Sans", system-ui', fontSize: 13, color: p.inkSoft, lineHeight: 1.35,
          }}>
            <span style={{ color: p.ink, fontWeight: 600 }}>Setup takes a minute.</span> Just talk — no forms, no scanning, no typing.
          </div>
        </div>
      </div>
      <div style={{ padding: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <BigButton fullWidth p={p} onClick={onNext} icon="mic">Start by talking</BigButton>
        <button style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: p.inkSoft, fontFamily: '"DM Sans", system-ui', fontSize: 14,
          padding: 8,
        }}>I already have an account</button>
      </div>
    </div>
  );
}

function OnboardingName({ p, name, setName, onNext }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: p.paper, padding: '0 24px' }}>
      <div style={{ paddingTop: 60, marginBottom: 'auto' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        }}>Step 2 of 4</div>
        <h1 style={{
          margin: '10px 0 8px', fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 32, fontWeight: 400, color: p.ink,
          letterSpacing: -0.5, lineHeight: 1.1, textWrap: 'pretty',
        }}>What should Pal<br/>call you?</h1>
        <p style={{
          margin: 0, fontFamily: '"DM Sans", system-ui', fontSize: 15,
          color: p.inkSoft, lineHeight: 1.4,
        }}>Just a first name. We'll greet you with it.</p>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
          style={{
            width: '100%', boxSizing: 'border-box', marginTop: 28,
            padding: '16px 18px', borderRadius: 14,
            border: `1px solid ${p.line}`, background: p.surface,
            color: p.ink, fontFamily: '"Newsreader", Georgia, serif',
            fontSize: 22, fontWeight: 400, outline: 'none',
          }} />
      </div>
      <div style={{ padding: '0 0 36px' }}>
        <BigButton fullWidth p={p} onClick={onNext} icon="arrowRight">Continue</BigButton>
      </div>
    </div>
  );
}

function OnboardingSignIn({ p, name, pantryCount, onFinish }) {
  const [signing, setSigning] = useState1(null);

  const startSignIn = (provider) => {
    setSigning(provider);
    setTimeout(() => onFinish(), 1400);
  };

  const matchedRecipes = Math.min(8, Math.max(2, Math.round(pantryCount * 1.3)));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: p.paper, padding: '0 22px',
    }}>
      <div style={{ paddingTop: 60 }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        }}>Almost there · Step 4 of 4</div>
        <h1 style={{
          margin: '8px 0 10px', fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 30, fontWeight: 400, color: p.ink,
          letterSpacing: -0.5, lineHeight: 1.06, textWrap: 'pretty',
        }}>Save your kitchen,<br/>{name}?</h1>
        <p style={{
          margin: 0, fontFamily: '"DM Sans", system-ui', fontSize: 14,
          color: p.inkSoft, lineHeight: 1.5, maxWidth: 320, textWrap: 'pretty',
        }}>Sign in so your pantry follows you across devices — and Pal remembers what you've already cooked.</p>
      </div>

      <div style={{
        marginTop: 22, padding: '14px 16px', borderRadius: 16,
        background: p.surface, border: `1px solid ${p.line}`,
      }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.inkFaint, textTransform: 'uppercase', letterSpacing: 1.3, fontWeight: 600,
          marginBottom: 10,
        }}>What gets saved</div>
        <SaveLine icon="pantry" label="Your pantry"
          value={pantryCount > 0 ? `${pantryCount} item${pantryCount>1?'s':''}` : 'When you add some'}
          p={p} />
        <SaveLine icon="book" label="Recipe matches"
          value={`${matchedRecipes} ready tonight`} p={p} />
        <SaveLine icon="flame" label="Streak & history" value="Synced" p={p} last />
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        <OAuthButton provider="apple" signing={signing}
          onClick={() => startSignIn('apple')} p={p} />
        <OAuthButton provider="google" signing={signing}
          onClick={() => startSignIn('google')} p={p} />
      </div>

      <button onClick={onFinish} disabled={!!signing} style={{
        background: 'transparent', border: 'none', cursor: signing ? 'default' : 'pointer',
        color: signing ? p.inkFaint : p.inkSoft,
        fontFamily: '"DM Sans", system-ui', fontSize: 13, fontWeight: 500,
        padding: 10, opacity: signing ? 0.5 : 1,
      }}>Use without an account</button>

      <p style={{
        margin: '4px 0 28px', textAlign: 'center',
        fontFamily: '"DM Sans", system-ui', fontSize: 11, color: p.inkFaint,
        lineHeight: 1.5, maxWidth: 320, alignSelf: 'center', textWrap: 'pretty',
      }}>
        We only store your pantry, preferences, and recipe history.
        Never your contacts, photos, or location.
      </p>
    </div>
  );
}

function SaveLine({ icon, label, value, p, last }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
      borderBottom: last ? 'none' : `1px solid ${p.line}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, background: p.accentSoft,
        color: p.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name={icon} size={14} strokeWidth={1.8} />
      </div>
      <span style={{
        flex: 1, fontFamily: '"DM Sans", system-ui', fontSize: 14, color: p.ink,
        fontWeight: 500,
      }}>{label}</span>
      <span style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: p.inkSoft,
        fontWeight: 500,
      }}>{value}</span>
    </div>
  );
}

function OAuthButton({ provider, signing, onClick, p }) {
  const isApple = provider === 'apple';
  const me = signing === provider;
  const otherSigning = signing && !me;

  const bg = isApple ? '#000' : '#ffffff';
  const fg = isApple ? '#fff' : '#202124';
  const border = isApple ? '#000' : '#dadce0';

  return (
    <button onClick={onClick} disabled={!!signing} style={{
      width: '100%', minHeight: 50, borderRadius: 999, cursor: signing ? 'default' : 'pointer',
      border: `1px solid ${border}`, background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      padding: '0 18px',
      fontFamily: '"DM Sans", system-ui, -apple-system, system-ui',
      fontSize: 16, fontWeight: 500, letterSpacing: -0.1,
      opacity: otherSigning ? 0.5 : 1, transition: 'opacity 0.2s',
      boxShadow: isApple ? 'none' : '0 1px 0 rgba(0,0,0,0.04)',
    }}>
      {me ? (
        <>
          <Spinner color={fg} />
          <span>Signing you in…</span>
        </>
      ) : (
        <>
          {isApple ? <AppleGlyph color={fg} /> : <GoogleGlyph />}
          <span>Continue with {isApple ? 'Apple' : 'Google'}</span>
        </>
      )}
    </button>
  );
}

function AppleGlyph({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={color} style={{ marginTop: -2 }}>
      <path d="M16 4c-1 0-2 .5-2.7 1.2-.6.6-1.2 1.6-1 2.6 1.1 0 2.1-.5 2.8-1.2.7-.7 1.1-1.7.9-2.6z"/>
      <path d="M20 16.8c-.5 1.1-.8 1.6-1.4 2.6-.9 1.4-2.1 3-3.7 3-1.4 0-1.8-.9-3.7-.9s-2.4.9-3.7.9c-1.6 0-2.7-1.5-3.6-2.8-2.5-3.7-2.8-8-1.2-10.3 1.1-1.6 2.9-2.5 4.5-2.5 1.7 0 2.7.9 4.1.9 1.3 0 2.1-.9 4.1-.9 1.5 0 3 .8 4.1 2.2-3.6 2-3 7.1.4 7.8z"/>
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.4z" fill="#4285F4"/>
      <path d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.3c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9V13c1.5 3 4.6 5 8.1 5z" fill="#34A853"/>
      <path d="M3.9 10.7c-.2-.5-.3-1.1-.3-1.7s.1-1.2.3-1.7V4.9H.9C.3 6.1 0 7.5 0 9s.3 2.9.9 4.1l3-2.4z" fill="#FBBC05"/>
      <path d="M9 3.6c1.3 0 2.5.5 3.4 1.4l2.6-2.6C13.4.9 11.4 0 9 0 5.5 0 2.4 2 .9 5l3 2.3C4.6 5.1 6.6 3.6 9 3.6z" fill="#EA4335"/>
    </svg>
  );
}

function Spinner({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: 'spin 0.7s linear infinite' }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function Bubble({ role, text, p }) {
  const isUser = role === 'user';
  return (
    <div style={{
      alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '85%',
      padding: '10px 14px', borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
      background: isUser ? p.ink : p.surface,
      color: isUser ? p.paper : p.ink,
      fontFamily: '"DM Sans", system-ui', fontSize: 15, lineHeight: 1.4,
      border: isUser ? 'none' : `1px solid ${p.line}`,
      textWrap: 'pretty',
    }}>{text}</div>
  );
}

function ChatInput({ draft, setDraft, onSend, p }) {
  return (
    <div style={{
      padding: '10px 14px 8px', background: p.paper,
      display: 'flex', gap: 8, alignItems: 'center',
    }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', gap: 6,
        background: p.surface, border: `1px solid ${p.line}`, borderRadius: 999,
        padding: '4px 4px 4px 16px',
      }}>
        <input value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSend(draft)}
          placeholder="Type or hold mic to speak"
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: p.ink, fontFamily: '"DM Sans", system-ui', fontSize: 15,
            padding: '8px 0',
          }} />
        <button style={{
          width: 36, height: 36, borderRadius: 999, border: 'none',
          background: p.surfaceAlt, color: p.inkSoft, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="mic" size={17} strokeWidth={1.8} />
        </button>
      </div>
      <button onClick={() => onSend(draft)} disabled={!draft.trim()} style={{
        width: 44, height: 44, borderRadius: 999, border: 'none',
        background: draft.trim() ? p.accent : p.surfaceAlt,
        color: draft.trim() ? p.accentInk : p.inkFaint, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon name="send" size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function parseIngredients(text) {
  const lookup = [
    { keys: ['carrot'], name: 'Carrots', defaultQty: '~1 lb' },
    { keys: ['onion'], name: 'Yellow onions', defaultQty: '~2' },
    { keys: ['garlic'], name: 'Garlic', defaultQty: '~1 head' },
    { keys: ['egg'], name: 'Eggs', defaultQty: '~6' },
    { keys: ['yogurt'], name: 'Greek yogurt', defaultQty: '~1 tub' },
    { keys: ['sour cream'], name: 'Sour cream', defaultQty: '~½ tub' },
    { keys: ['jasmine', 'rice'], name: 'Jasmine rice', defaultQty: '~2 lb' },
    { keys: ['penne', 'pasta'], name: 'Penne', defaultQty: '~1 box' },
    { keys: ['olive oil'], name: 'Olive oil', defaultQty: '~1 bottle' },
    { keys: ['spinach'], name: 'Baby spinach', defaultQty: '~5 oz' },
    { keys: ['lemon'], name: 'Lemons', defaultQty: '~2' },
    { keys: ['cilantro'], name: 'Cilantro', defaultQty: '~1 bunch' },
    { keys: ['chicken'], name: 'Chicken thighs', defaultQty: '~1 lb' },
    { keys: ['tomato'], name: 'Roma tomatoes', defaultQty: '~3' },
    { keys: ['butter'], name: 'Butter', defaultQty: '~1 stick' },
    { keys: ['ginger'], name: 'Ginger root', defaultQty: '~2 in' },
    { keys: ['bread'], name: 'Bread', defaultQty: '~½ loaf' },
    { keys: ['parmesan'], name: 'Parmesan', defaultQty: '~1 wedge' },
  ];
  const lower = text.toLowerCase();
  const found = [];
  for (const item of lookup) {
    const key = item.keys.find(k => lower.includes(k));
    if (!key) continue;
    const idx = lower.indexOf(key);
    const before = text.slice(0, idx).replace(/^.*[,.;]/, '');
    const after = text.slice(idx + key.length).replace(/[,.;].*$/, '');
    const said = (before + text.slice(idx, idx + key.length) + after)
      .replace(/\b(and|i've got|we have|i have|there's|some|the|with|a|an)\b/gi, '')
      .replace(/\s+/g, ' ').trim();
    const w = (before + ' ' + after).toLowerCase();
    let qty = item.defaultQty;
    const numMatch = w.match(/(\d+)/);
    if (/half|½|halfa/.test(w)) {
      const container = w.match(/tub|jar|bottle|box|bag|loaf|stick/);
      qty = container ? `~½ ${container[0]}` : '~½';
    } else if (/few|couple/.test(w)) qty = '~2–3';
    else if (/bunch|bag/.test(w)) {
      const c = w.match(/bunch|bag/);
      qty = `~1 ${c[0]}`;
    } else if (numMatch) qty = `~${numMatch[1]}`;
    found.push({ name: item.name, said, qty });
  }
  return found;
}

// ─────────────────────────────────────────────────────────────
// Home — 3 layout variants
// ─────────────────────────────────────────────────────────────
function HomeScreen({ p, t, data, pantryIds, navigate, cookedDays, onGrocery }) {
  if (t.homeLayout === 'feed') return <HomeFeed p={p} t={t} data={data} pantryIds={pantryIds} navigate={navigate} cookedDays={cookedDays} onGrocery={onGrocery} />;
  if (t.homeLayout === 'pantryFirst') return <HomePantryFirst p={p} t={t} data={data} pantryIds={pantryIds} navigate={navigate} cookedDays={cookedDays} onGrocery={onGrocery} />;
  return <HomeTodaysPick p={p} t={t} data={data} pantryIds={pantryIds} navigate={navigate} cookedDays={cookedDays} onGrocery={onGrocery} />;
}

function rankedRecipes(data, pantryIds) {
  return data.recipes
    .map(r => ({ r, m: calcMatch(r, pantryIds) }))
    .sort((a, b) => {
      const aExp = a.r.expiringUsed?.length || 0;
      const bExp = b.r.expiringUsed?.length || 0;
      if (aExp !== bExp) return bExp - aExp;
      return (b.m.have / b.m.total) - (a.m.have / a.m.total);
    });
}

function GreetingHead({ p, t, data, cookedDays }) {
  const greeting = new Date().getHours() < 11 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div style={{ padding: '20px 18px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: '"DM Sans", system-ui', fontSize: 13,
            color: p.inkSoft, fontWeight: 500,
          }}>{greeting},</div>
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif', fontSize: 32,
            fontWeight: 400, color: p.ink, letterSpacing: -0.5, lineHeight: 1.05,
          }}>{data.user.name}.</div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 11px', borderRadius: 999, background: p.surface,
          border: `1px solid ${p.line}`,
        }}>
          <Icon name="flame" size={14} stroke={p.accent} strokeWidth={2} />
          <span style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
            color: p.ink, fontWeight: 600,
          }}>{data.user.streak}</span>
          <span style={{
            fontFamily: '"DM Sans", system-ui', fontSize: 11,
            color: p.inkSoft, marginLeft: -2,
          }}>day streak</span>
        </div>
      </div>
    </div>
  );
}

function GroceryCard({ p, onClick }) {
  return (
    <div style={{ padding: '0 18px 16px' }}>
      <button onClick={onClick} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
        background: p.surface, border: `1px solid ${p.line}`, textAlign: 'left',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, background: p.ink, color: p.paper,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          position: 'relative',
        }}>
          <Icon name="cart" size={18} strokeWidth={1.8} />
          <span style={{
            position: 'absolute', bottom: -3, right: -3,
            width: 16, height: 16, borderRadius: 999, background: p.accent,
            border: `2px solid ${p.surface}`, color: p.accentInk,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="mic" size={9} strokeWidth={2.5} />
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: '"DM Sans", system-ui', fontSize: 14, fontWeight: 600, color: p.ink,
          }}>Just back from the store?</div>
          <div style={{
            fontFamily: '"DM Sans", system-ui', fontSize: 12, color: p.inkSoft, marginTop: 1,
          }}>Talk Pal through the bags — we'll sort it all in.</div>
        </div>
        <Icon name="chevronRight" size={16} stroke={p.inkFaint} strokeWidth={1.8} />
      </button>
    </div>
  );
}

function HomeTodaysPick({ p, t, data, pantryIds, navigate, cookedDays, onGrocery }) {
  const ranked = useMemo1(() => rankedRecipes(data, pantryIds), [data, pantryIds]);
  const hero = ranked[0];
  const supports = ranked.slice(1, 4);
  const expiringItems = data.pantry.filter(i => i.expiring);

  return (
    <div style={{ paddingBottom: 120 }}>
      <GreetingHead p={p} t={t} data={data} cookedDays={cookedDays} />

      {/* expiring nudge */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{
          padding: '12px 14px', borderRadius: 14,
          background: p.accent + '12',
          border: `1px solid ${p.accent}30`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: p.accent,
            color: p.accentInk, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="leaf" size={18} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: '"DM Sans", system-ui', fontSize: 14, fontWeight: 600,
              color: p.ink,
            }}>{expiringItems.length} item{expiringItems.length!==1?'s':''} going off this week</div>
            <div style={{
              fontFamily: '"DM Sans", system-ui', fontSize: 12,
              color: p.inkSoft, marginTop: 1,
            }}>{expiringItems.slice(0,3).map(i => i.name.toLowerCase()).join(', ')}</div>
          </div>
        </div>
      </div>

      <GroceryCard p={p} onClick={onGrocery} />

      <SectionHeader kicker="Tonight's pick" title="Charred carrots are calling." p={p} />
      <div style={{ padding: '0 18px 22px' }}>
        <button onClick={() => navigate('recipe', hero.r.id)} style={{
          width: '100%', padding: 0, border: 'none', background: 'transparent',
          textAlign: 'left', cursor: 'pointer',
        }}>
          <div style={{
            position: 'relative', borderRadius: 22, overflow: 'hidden',
            aspectRatio: '4 / 5', background: p.surfaceAlt,
          }}>
            <img src={hero.r.photo} alt="" style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.7) 100%)',
            }} />
            <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6 }}>
              <MatchIndicator have={hero.m.have} total={hero.m.total} missing={hero.m.missing} style={t.matchStyle} p={p} size="lg" />
              {hero.r.expiringUsed?.length > 0 && (
                <span style={{
                  padding: '4px 9px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.95)', color: p.warning,
                  fontFamily: '"DM Sans", system-ui', fontSize: 11, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  <Icon name="leaf" size={11} strokeWidth={2} />
                  uses expiring
                </span>
              )}
            </div>
            <div style={{ position: 'absolute', bottom: 18, left: 18, right: 18, color: '#fff' }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.9, marginBottom: 6,
              }}>{hero.r.cuisine} · {hero.r.time} min · {hero.r.difficulty}</div>
              <div style={{
                fontFamily: '"Newsreader", Georgia, serif', fontSize: 30, fontWeight: 400,
                lineHeight: 1.02, letterSpacing: -0.6, textShadow: '0 1px 16px rgba(0,0,0,0.5)',
                textWrap: 'pretty',
              }}>{hero.r.title}</div>
              <div style={{
                marginTop: 8, fontFamily: '"DM Sans", system-ui', fontSize: 13.5,
                opacity: 0.92, lineHeight: 1.35,
              }}>{hero.r.blurb}</div>
            </div>
          </div>
        </button>
      </div>

      <SectionHeader kicker="Also tonight" title="If carrots aren't the move." p={p}
        action={<button onClick={() => navigate('browse')} style={{
          background: 'transparent', border: 'none', color: p.inkSoft,
          fontFamily: '"DM Sans", system-ui', fontSize: 13, fontWeight: 500,
          cursor: 'pointer', padding: 0,
        }}>See all →</button>}
      />
      <div style={{ padding: '0 18px 26px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {supports.map(({ r, m }) => (
          <RecipeCard key={r.id} recipe={r} match={m} layout="list" matchStyle={t.matchStyle}
            onClick={() => navigate('recipe', r.id)} p={p} />
        ))}
      </div>

      <CuisineVariety p={p} data={data} />
      <WeekProgress p={p} data={data} cookedDays={cookedDays} />
    </div>
  );
}

function HomeFeed({ p, t, data, pantryIds, navigate, cookedDays, onGrocery }) {
  const ranked = useMemo1(() => rankedRecipes(data, pantryIds), [data, pantryIds]);
  return (
    <div style={{ paddingBottom: 120 }}>
      <GreetingHead p={p} t={t} data={data} cookedDays={cookedDays} />
      <GroceryCard p={p} onClick={onGrocery} />
      <SectionHeader kicker="Your feed" title="Ranked for what's in your kitchen." p={p} />
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ranked.slice(0, 6).map(({ r, m }) => (
          <RecipeCard key={r.id} recipe={r} match={m} layout="feed" matchStyle={t.matchStyle}
            onClick={() => navigate('recipe', r.id)} p={p} />
        ))}
      </div>
    </div>
  );
}

function HomePantryFirst({ p, t, data, pantryIds, navigate, cookedDays, onGrocery }) {
  const ranked = useMemo1(() => rankedRecipes(data, pantryIds), [data, pantryIds]);
  const expiring = data.pantry.filter(i => i.expiring);
  return (
    <div style={{ paddingBottom: 120 }}>
      <GreetingHead p={p} t={t} data={data} cookedDays={cookedDays} />
      <GroceryCard p={p} onClick={onGrocery} />

      <div style={{ padding: '0 18px 18px' }}>
        <div style={{
          padding: 16, borderRadius: 18, background: p.surface,
          border: `1px solid ${p.line}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
              }}>Your pantry</div>
              <div style={{
                fontFamily: '"Newsreader", Georgia, serif', fontSize: 22,
                color: p.ink, letterSpacing: -0.3, marginTop: 2,
              }}>{data.pantry.length} items, {expiring.length} expiring</div>
            </div>
            <button onClick={() => navigate('pantry')} style={{
              background: 'transparent', border: 'none', color: p.inkSoft,
              fontFamily: '"DM Sans", system-ui', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', padding: 0,
            }}>Manage →</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {data.pantry.slice(0, 16).map(i => (
              <span key={i.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 999, background: p.surfaceAlt,
                fontFamily: '"DM Sans", system-ui', fontSize: 12, color: p.ink,
                fontWeight: 500,
              }}>
                <FreshnessPip fresh={i.fresh} p={p} size={6} />
                {i.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <SectionHeader kicker="Cook tonight" title="From what you've got." p={p} />
      <div style={{ padding: '0 18px 26px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {ranked.slice(0, 6).map(({ r, m }) => (
          <RecipeCard key={r.id} recipe={r} match={m} layout="grid" matchStyle={t.matchStyle}
            onClick={() => navigate('recipe', r.id)} p={p} />
        ))}
      </div>
    </div>
  );
}

function CuisineVariety({ p, data }) {
  const all = ['Italian', 'Mexican', 'Thai', 'Mediterranean', 'Middle Eastern', 'Modern'];
  const cooked = data.user.cuisinesThisWeek;
  return (
    <div style={{ padding: '0 18px 26px' }}>
      <SectionHeader kicker="This week" title="Variety meter" p={p} />
      <div style={{
        padding: 14, borderRadius: 16, background: p.surface, border: `1px solid ${p.line}`,
      }}>
        <div style={{
          fontFamily: '"DM Sans", system-ui', fontSize: 13, color: p.inkSoft,
          marginBottom: 10,
        }}>{
          cooked.length === 0 ? 'Cook something to start your streak.'
          : cooked.length === 1 ? '1 cuisine this week — branch out?'
          : `${cooked.length} cuisines this week — nice mix.`
        }</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {all.map(c => {
            const on = cooked.includes(c);
            return (
              <div key={c} style={{
                flex: 1, height: 8, borderRadius: 999,
                background: on ? p.accent : p.surfaceAlt,
              }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {all.map(c => (
            <span key={c} style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 8,
              color: cooked.includes(c) ? p.ink : p.inkFaint,
              letterSpacing: 0.5, textTransform: 'uppercase', flex: 1, textAlign: 'center',
            }}>{c.slice(0, 4)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekProgress({ p, data, cookedDays }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <div style={{ padding: '0 18px 26px' }}>
      <SectionHeader kicker="Habit" title={
        cookedDays.filter(Boolean).length === 0
          ? 'A blank week — start where you want.'
          : `${cookedDays.filter(Boolean).length} cooked, ${7 - cookedDays.filter(Boolean).length} to go.`
      } p={p} />
      <div style={{
        padding: 16, borderRadius: 16, background: p.surface, border: `1px solid ${p.line}`,
        display: 'flex', justifyContent: 'space-between',
      }}>
        {days.map((d, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 999,
              background: cookedDays[i] ? p.accent : 'transparent',
              border: cookedDays[i] ? 'none' : `1.5px dashed ${p.line}`,
              color: cookedDays[i] ? p.accentInk : p.inkFaint,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {cookedDays[i] && <Icon name="check" size={14} strokeWidth={2.5} />}
            </div>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
              color: p.inkFaint, fontWeight: 500,
            }}>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pantry screen — grouped inventory
// ─────────────────────────────────────────────────────────────
function PantryScreen({ p, data, navigate, onRemove }) {
  const [filter, setFilter] = useState1('all');
  const cats = ['Produce', 'Protein', 'Dairy', 'Grains', 'Pantry', 'Spices'];
  const expiring = data.pantry.filter(i => i.expiring);

  let visible = data.pantry;
  if (filter === 'expiring') visible = expiring;
  else if (filter !== 'all') visible = data.pantry.filter(i => i.cat === filter);

  const grouped = useMemo1(() => {
    const g = {};
    visible.forEach(i => { (g[i.cat] = g[i.cat] || []).push(i); });
    return g;
  }, [visible]);

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ padding: '20px 18px 14px' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        }}>{data.pantry.length} items · {expiring.length} expiring</div>
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif', fontSize: 32,
          fontWeight: 400, color: p.ink, letterSpacing: -0.5, marginTop: 4,
        }}>Your kitchen</div>
      </div>

      <div style={{
        padding: '0 0 14px', overflowX: 'auto', display: 'flex', gap: 6,
        scrollbarWidth: 'none',
      }}>
        <div style={{ paddingLeft: 18 }} />
        <Chip active={filter === 'all'} onClick={() => setFilter('all')} p={p}>All</Chip>
        <Chip active={filter === 'expiring'} onClick={() => setFilter('expiring')} p={p} icon="leaf">
          Expiring · {expiring.length}
        </Chip>
        {cats.map(c => (
          <Chip key={c} active={filter === c} onClick={() => setFilter(c)} p={p}>{c}</Chip>
        ))}
        <div style={{ paddingRight: 18 }} />
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 22 }}>
          <div style={{
            padding: '0 18px 8px', fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10, color: p.inkFaint, textTransform: 'uppercase',
            letterSpacing: 1.5, fontWeight: 600,
          }}>{cat} · {items.length}</div>
          <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map(item => (
              <PantryRow key={item.id} item={item} p={p} onRemove={() => onRemove(item.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PantryRow({ item, p, onRemove }) {
  const fresh = item.fresh >= 0.7 ? 'fresh' : item.fresh >= 0.4 ? 'use soon' : 'expiring';
  const c = item.fresh >= 0.7 ? p.sage : item.fresh >= 0.4 ? p.warning : p.danger;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      borderRadius: 14, background: p.surface, border: `1px solid ${p.line}`,
    }}>
      <FreshnessPip fresh={item.fresh} p={p} size={10} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: '"DM Sans", system-ui', fontSize: 15, fontWeight: 500,
          color: p.ink, lineHeight: 1.2,
        }}>{item.name}</div>
        <div style={{
          fontFamily: '"DM Sans", system-ui', fontSize: 12,
          color: p.inkSoft, marginTop: 1,
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        }}>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
            color: p.ink, fontWeight: 600,
            padding: '1px 5px', borderRadius: 4, background: p.surfaceAlt,
          }}>{item.qty}</span>
          {item.loc && <span style={{ color: p.inkFaint }}>{item.loc}</span>}
        </div>
      </div>
      <span style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
        color: c, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600,
        flexShrink: 0,
      }}>{fresh}</span>
      <button onClick={onRemove} style={{
        width: 28, height: 28, borderRadius: 999, background: 'transparent',
        border: 'none', color: p.inkFaint, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name="x" size={14} strokeWidth={1.8} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Add Chat — pantry input via voice/text
// ─────────────────────────────────────────────────────────────
function AddChatScreen({ p, onClose, onAdd, mode = 'add' }) {
  const isGrocery = mode === 'grocery';
  const [chat, setChat] = useState1([
    { role: 'bot', text: isGrocery
      ? "Welcome back! Walk me through the bags — Pal will sort everything into the right spot."
      : "What did you pick up? List as much or as little as you want." },
  ]);
  const [draft, setDraft] = useState1('');
  const [parsed, setParsed] = useState1([]);
  const [phase, setPhase] = useState1('idle'); // idle|recording|transcribing
  const [errorMsg, setErrorMsg] = useState1('');
  const scrollRef = useRef1(null);
  const recorderRef = useRef1(null);

  useEffect1(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [chat, parsed, phase]);

  useEffect1(() => () => { recorderRef.current?.cancel?.(); }, []);

  const send = (text) => {
    if (!text.trim()) return;
    const items = (window.PP?.parseTranscript?.(text)) || [];
    setChat(c => [
      ...c,
      { role: 'user', text },
      { role: 'bot', text: items.length
        ? (isGrocery ? groceryReply(items) : warmReply(items))
        : "Hmm, didn't catch that. Try \"some carrots and a head of garlic\"?" },
    ]);
    if (items.length) {
      setParsed(pp => {
        const have = new Set(pp.map(x => x.name.toLowerCase()));
        return [...pp, ...items.filter(it => !have.has(it.name.toLowerCase()))];
      });
    }
    setDraft('');
  };

  const startMic = async () => {
    try {
      setErrorMsg('');
      const handle = await window.PP.startRecording();
      recorderRef.current = handle;
      setPhase('recording');
    } catch (err) {
      console.error('mic failed', err);
      setErrorMsg(err?.name === 'NotAllowedError'
        ? 'Mic blocked — use the keyboard for now'
        : (err?.message || 'Mic not available'));
      setTimeout(() => setErrorMsg(''), 2500);
    }
  };

  const stopMicAndSend = async () => {
    const handle = recorderRef.current;
    recorderRef.current = null;
    if (!handle) { setPhase('idle'); return; }
    setPhase('transcribing');
    try {
      const { blob } = await handle.stop();
      if (!blob || blob.size < 1500) { setPhase('idle'); return; }
      const result = await window.PP.transcribe(blob, { languageCode: 'eng' });
      const text = (result?.text || '').trim();
      setPhase('idle');
      if (text) send(text);
      else {
        setErrorMsg("Didn't catch that");
        setTimeout(() => setErrorMsg(''), 2200);
      }
    } catch (err) {
      console.error('transcribe failed', err);
      setPhase('idle');
      setErrorMsg(err?.message || 'Could not transcribe');
      setTimeout(() => setErrorMsg(''), 2800);
    }
  };

  const cancelMic = () => {
    recorderRef.current?.cancel?.();
    recorderRef.current = null;
    setPhase('idle');
  };

  const finish = () => {
    onAdd(parsed);
    onClose();
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50, background: p.paper,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '20px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${p.line}`,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 999, background: p.surface,
          border: `1px solid ${p.line}`, color: p.ink, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="chevronDown" size={18} strokeWidth={2} /></button>
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif', fontSize: 19, fontWeight: 500,
          color: p.ink, letterSpacing: -0.2,
        }}>{isGrocery ? 'Just got groceries' : 'Add to pantry'}</div>
        <button onClick={finish} disabled={parsed.length === 0} style={{
          padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: parsed.length ? p.accent : p.surfaceAlt,
          color: parsed.length ? p.accentInk : p.inkFaint,
          fontFamily: '"DM Sans", system-ui', fontSize: 13, fontWeight: 600,
        }}>{isGrocery ? 'Put away' : 'Save'}{parsed.length > 0 && ` · ${parsed.length}`}</button>
      </div>

      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '16px 18px 8px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {chat.map((m, i) => <Bubble key={i} role={m.role} text={m.text} p={p} />)}
        {errorMsg && (
          <div style={{
            alignSelf: 'center', padding: '8px 12px', borderRadius: 10,
            background: p.danger + '14', color: p.danger,
            fontFamily: '"DM Sans", system-ui', fontSize: 13, fontWeight: 500,
          }}>{errorMsg}</div>
        )}
        {parsed.length > 0 && (
          <div style={{
            marginTop: 4, padding: '12px 14px 14px', borderRadius: 14, background: p.surface,
            border: `1px dashed ${p.accent}`,
          }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                color: p.accent, textTransform: 'uppercase', letterSpacing: 1.2,
                fontWeight: 600,
              }}>Pal heard · {parsed.length}</div>
              <div style={{
                fontFamily: '"DM Sans", system-ui', fontSize: 11, color: p.inkSoft,
                fontStyle: 'italic',
              }}>tap to edit</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {parsed.map((it, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <ParsedItemRow item={it} p={p} />
                  <button onClick={() => setParsed(pp => pp.filter((_, j) => j !== i))}
                    aria-label="Remove" style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 22, height: 22, borderRadius: 999,
                    background: 'transparent', border: 'none', color: p.inkFaint,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon name="x" size={12} strokeWidth={2} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* big mic button when listening, else input */}
      {phase === 'recording' || phase === 'transcribing' ? (
        <div style={{ padding: '20px 18px 24px', textAlign: 'center', background: p.paper, borderTop: `1px solid ${p.line}` }}>
          <div style={{
            fontFamily: '"DM Sans", system-ui', fontSize: 14, color: p.inkSoft,
            marginBottom: 14,
          }}>{phase === 'transcribing' ? 'Working it out…'
              : isGrocery ? 'Walk me through the bags — tap when done'
              : 'Listening… tap when done'}</div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {phase === 'recording' && <>
              <div style={{
                position: 'absolute', inset: -16, borderRadius: 999,
                background: p.accent + '20', animation: 'pulse 1.8s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute', inset: -8, borderRadius: 999,
                background: p.accent + '35', animation: 'pulse 1.8s ease-out 0.3s infinite',
              }} />
            </>}
            <button onClick={stopMicAndSend} disabled={phase === 'transcribing'} style={{
              position: 'relative', width: 84, height: 84, borderRadius: 999, border: 'none',
              background: p.accent, color: p.accentInk,
              cursor: phase === 'transcribing' ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 12px 30px ${p.accent}55`,
              opacity: phase === 'transcribing' ? 0.7 : 1,
            }}>
              {phase === 'transcribing' ? (
                <span style={{
                  width: 28, height: 28, borderRadius: 999,
                  border: '3px solid rgba(255,255,255,0.5)', borderTopColor: '#fff',
                  animation: 'spin 0.8s linear infinite',
                }} />
              ) : (
                <span style={{ width: 26, height: 26, borderRadius: 6, background: '#fff' }} />
              )}
            </button>
          </div>
          <div style={{ marginTop: 14 }}>
            <button onClick={cancelMic} style={{
              background: 'transparent', border: 'none', color: p.inkSoft,
              fontFamily: '"DM Sans", system-ui', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ padding: '6px 18px 8px', display: 'flex', gap: 6, flexWrap: 'wrap', background: p.paper }}>
            {(isGrocery
              ? ['milk + eggs', 'chicken breasts', 'broccoli + peppers', 'rice + beans']
              : ['a bag of carrots', 'eggs', 'jasmine rice', 'half tub yogurt']
            ).map(s => (
              <button key={s} onClick={() => send(s)} style={{
                padding: '6px 11px', borderRadius: 999, border: `1px solid ${p.line}`,
                background: p.surface, color: p.inkSoft, cursor: 'pointer',
                fontFamily: '"DM Sans", system-ui', fontSize: 12,
              }}>+ {s}</button>
            ))}
          </div>
          <div style={{
            padding: '8px 14px 24px', background: p.paper,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <button onClick={startMic} style={{
              width: 44, height: 44, borderRadius: 999,
              background: p.surface, color: p.ink, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${p.line}`, flexShrink: 0,
            }}>
              <Icon name="mic" size={18} strokeWidth={1.8} />
            </button>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: p.surface, border: `1px solid ${p.line}`, borderRadius: 999,
              padding: '0 16px',
            }}>
              <input value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(draft)}
                placeholder={isGrocery ? "Or type the receipt…" : "Type what you've got…"}
                style={{
                  flex: 1, border: 'none', outline: 'none', background: 'transparent',
                  color: p.ink, fontFamily: '"DM Sans", system-ui', fontSize: 15,
                  padding: '12px 0',
                }} />
            </div>
            <button onClick={() => send(draft)} disabled={!draft.trim()} style={{
              width: 44, height: 44, borderRadius: 999, border: 'none',
              background: draft.trim() ? p.accent : p.surfaceAlt,
              color: draft.trim() ? p.accentInk : p.inkFaint, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name="send" size={17} strokeWidth={1.8} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function warmReply(items) {
  const first = items[0].name.toLowerCase();
  if (first.includes('carrot')) return `Carrots locked in 🥕. Want me to plan a few dishes around them?`;
  if (first.includes('chicken')) return `Chicken thighs — perfect. ${items.length-1>0?`Plus ${items.length-1} more thing${items.length-1>1?'s':''}. `:''}I've got ideas.`;
  if (first.includes('cilantro')) return `Cilantro added. We'll use it fast — it never lasts long.`;
  if (items.length === 1) return `Got it — ${items[0].name.toLowerCase()} added.`;
  return `Nice — ${items.length} items in. Say more or hit save.`;
}

function groceryReply(items) {
  const n = items.length;
  if (n >= 5) return `Whoa, ${n} items 👏. Anything else in the bags?`;
  if (n >= 3) return `Got all ${n} — keep going.`;
  if (n === 2) return `Two down. What else came home?`;
  return `Got it. What else?`;
}

Object.assign(window, { Onboarding, HomeScreen, PantryScreen, AddChatScreen });
