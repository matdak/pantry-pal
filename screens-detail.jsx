// screens-detail.jsx — Browse, Recipe Detail, Cook-along, Shopping, Profile

const { useState: useState2, useEffect: useEffect2, useRef: useRef2, useMemo: useMemo2 } = React;

// ─────────────────────────────────────────────────────────────
// Browse — filter chips + sorted recipe grid/list
// ─────────────────────────────────────────────────────────────
const BROWSE_PAGE_SIZE = 20;

function BrowseScreen({ p, t, data, pantryIds, navigate }) {
  const [cuisine, setCuisine] = useState2('All');
  const [quick, setQuick] = useState2(false);
  const [pantryOnly, setPantryOnly] = useState2(false);
  const [page, setPage] = useState2(1);
  const sentinelRef = useRef2(null);

  const visible = useMemo2(() => {
    let list = data.recipes.map(r => ({ r, m: calcMatch(r, pantryIds) }));
    if (cuisine !== 'All') list = list.filter(({ r }) => r.cuisine === cuisine);
    if (quick) list = list.filter(({ r }) => r.time <= 25);
    if (pantryOnly) list = list.filter(({ m }) => m.missing === 0);
    list.sort((a, b) => {
      const ratioA = a.m.total ? (a.m.have / a.m.total) : -1;
      const ratioB = b.m.total ? (b.m.have / b.m.total) : -1;
      return ratioB - ratioA;
    });
    return list;
  }, [cuisine, quick, pantryOnly, pantryIds, data]);

  // Reset paging whenever filters change
  useEffect2(() => { setPage(1); }, [cuisine, quick, pantryOnly]);

  const shown = useMemo2(() => visible.slice(0, page * BROWSE_PAGE_SIZE), [visible, page]);
  const hasMore = shown.length < visible.length;

  // Infinite scroll: when the sentinel becomes visible, bump the page.
  useEffect2(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) setPage(p => p + 1);
    }, { rootMargin: '300px' });
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, shown.length]);

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ padding: '20px 18px 12px' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        }}>Browse · {visible.length} recipe{visible.length === 1 ? '' : 's'}</div>
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif', fontSize: 32,
          fontWeight: 400, color: p.ink, letterSpacing: -0.5, marginTop: 4,
        }}>What to cook</div>
      </div>

      <div style={{
        padding: '0 0 10px', overflowX: 'auto', display: 'flex', gap: 6,
        scrollbarWidth: 'none',
      }}>
        <div style={{ paddingLeft: 18 }} />
        {data.cuisines.map(c => (
          <Chip key={c} active={cuisine === c} onClick={() => setCuisine(c)} p={p}>{c}</Chip>
        ))}
        <div style={{ paddingRight: 18 }} />
      </div>

      <div style={{ padding: '0 18px 16px', display: 'flex', gap: 6 }}>
        <Chip active={quick} onClick={() => setQuick(!quick)} p={p} icon="timer">Under 25 min</Chip>
        <Chip active={pantryOnly} onClick={() => setPantryOnly(!pantryOnly)} p={p} icon="check">Pantry-only</Chip>
      </div>

      {t.cardLayout === 'grid' ? (
        <div style={{ padding: '0 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {shown.map(({ r, m }) => (
            <RecipeCard key={r.id} recipe={r} match={m} layout="grid" matchStyle={t.matchStyle}
              onClick={() => navigate('recipe', r.id)} p={p} />
          ))}
        </div>
      ) : t.cardLayout === 'feed' ? (
        <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {shown.map(({ r, m }) => (
            <RecipeCard key={r.id} recipe={r} match={m} layout="feed" matchStyle={t.matchStyle}
              onClick={() => navigate('recipe', r.id)} p={p} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(({ r, m }) => (
            <RecipeCard key={r.id} recipe={r} match={m} layout="list" matchStyle={t.matchStyle}
              onClick={() => navigate('recipe', r.id)} p={p} />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} style={{
          padding: '20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{
            width: 14, height: 14, borderRadius: 999, border: `2px solid ${p.line}`,
            borderTopColor: p.accent, animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
            color: p.inkFaint, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600,
          }}>Loading more</span>
        </div>
      )}
      {!hasMore && visible.length > BROWSE_PAGE_SIZE && (
        <div style={{
          padding: '20px 18px', textAlign: 'center',
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.inkFaint, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600,
        }}>End · {visible.length} shown</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recipe Detail
// ─────────────────────────────────────────────────────────────
function RecipeDetailScreen({ p, t, data, pantryIds, recipeId, navigate, onCook, onAddToShoppingList, onAddOneToShoppingList, saved, onToggleSave }) {
  const recipe = data.recipes.find(r => r.id === recipeId) || data.recipes[0];
  const match = calcMatch(recipe, pantryIds);
  const [scrolled, setScrolled] = useState2(false);

  const haveIng = recipe.ingredients.filter(i => pantryIds.has(i.id));
  const missIng = recipe.ingredients.filter(i => !pantryIds.has(i.id));

  return (
    <div style={{ paddingBottom: 120 }} onScroll={e => setScrolled(e.target.scrollTop > 80)}>
      <div style={{ position: 'relative' }}>
        <img src={recipe.photo} alt="" style={{
          width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%)',
        }} />
        <button onClick={() => navigate('back')} style={{
          position: 'absolute', top: 14, left: 14,
          width: 40, height: 40, borderRadius: 999,
          background: 'rgba(255,255,255,0.94)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}>
          <Icon name="chevronLeft" size={20} stroke={p.ink} strokeWidth={2} />
        </button>
        <button onClick={() => onToggleSave && onToggleSave(recipe.id)} style={{
          position: 'absolute', top: 14, right: 14,
          width: 40, height: 40, borderRadius: 999,
          background: saved ? p.accent : 'rgba(255,255,255,0.94)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="star" size={18} stroke={saved ? p.accentInk : p.ink} strokeWidth={1.8} />
        </button>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        }}>{recipe.cuisine} · {recipe.difficulty}</div>
        <h1 style={{
          margin: '6px 0 8px', fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 30, fontWeight: 400, color: p.ink,
          letterSpacing: -0.5, lineHeight: 1.05, textWrap: 'pretty',
        }}>{recipe.title}</h1>
        <p style={{
          margin: 0, fontFamily: '"DM Sans", system-ui',
          fontSize: 15, color: p.inkSoft, lineHeight: 1.45, textWrap: 'pretty',
        }}>{recipe.blurb}</p>

        <div style={{
          display: 'flex', gap: 14, marginTop: 18, paddingTop: 16, paddingBottom: 16,
          borderTop: `1px solid ${p.line}`, borderBottom: `1px solid ${p.line}`,
        }}>
          <Stat icon="clock" label="Time" value={`${recipe.time} min`} p={p} />
          <Stat icon="flame" label="Servings" value="2" p={p} />
          <Stat icon="check" label="Have" value={`${haveIng.length}/${recipe.ingredients.length}`} p={p} />
        </div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{
            margin: 0, fontFamily: '"Newsreader", Georgia, serif',
            fontSize: 20, fontWeight: 500, color: p.ink, letterSpacing: -0.2,
          }}>Ingredients</h2>
          <MatchIndicator have={match.have} total={match.total} missing={match.missing} style={t.matchStyle} p={p} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {recipe.ingredients.map((ing, i) => (
            <IngredientRow key={i} ing={ing} have={pantryIds.has(ing.id)} p={p} data={data}
              onAdd={!pantryIds.has(ing.id) && onAddOneToShoppingList ? () => onAddOneToShoppingList(ing.id) : null} />
          ))}
        </div>

        {missIng.length > 0 && onAddToShoppingList && (
          <button onClick={() => onAddToShoppingList(missIng.map(i => i.id))} style={{
            marginTop: 14, width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', borderRadius: 12, border: `1px dashed ${p.accent}80`,
            background: p.accent + '0c', color: p.ink, cursor: 'pointer', textAlign: 'left',
          }}>
            <Icon name="cart" size={18} stroke={p.accent} strokeWidth={1.8} />
            <span style={{
              fontFamily: '"DM Sans", system-ui', fontSize: 14, fontWeight: 500, flex: 1,
            }}>Add {missIng.length} missing to shopping list</span>
            <Icon name="arrowRight" size={16} stroke={p.accent} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <h2 style={{
          margin: '0 0 14px', fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 20, fontWeight: 500, color: p.ink, letterSpacing: -0.2,
        }}>Method</h2>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recipe.steps.map((s, i) => (
            <li key={i} style={{ display: 'flex', gap: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999, background: p.surfaceAlt,
                color: p.accent, fontFamily: '"JetBrains Mono", monospace',
                fontSize: 12, fontWeight: 700, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{
                flex: 1, fontFamily: '"DM Sans", system-ui', fontSize: 15,
                color: p.ink, lineHeight: 1.5, paddingTop: 4, textWrap: 'pretty',
              }}>{s.t}</div>
            </li>
          ))}
        </ol>
      </div>

      <div style={{ padding: '28px 20px 0' }}>
        <BigButton fullWidth p={p} onClick={() => onCook(recipe.id)} icon="chef">
          Start cooking
        </BigButton>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, p }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5,
        color: p.inkSoft, marginBottom: 2,
      }}>
        <Icon name={icon} size={12} strokeWidth={1.8} />
        <span style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600,
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: '"DM Sans", system-ui', fontSize: 16, fontWeight: 600, color: p.ink,
      }}>{value}</div>
    </div>
  );
}

function IngredientRow({ ing, have, p, data, onAdd }) {
  const [added, setAdded] = useState2(false);
  const fromPantry = data.pantry.find(i => i.id === ing.id);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
      borderBottom: `1px solid ${p.line}`,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: 999,
        background: have ? p.sage + '20' : p.surfaceAlt,
        color: have ? p.sage : p.inkFaint,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {have ? <Icon name="check" size={13} strokeWidth={2.5} /> : <Icon name="plus" size={12} strokeWidth={2.2} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: '"DM Sans", system-ui', fontSize: 15, fontWeight: 500,
          color: p.ink,
        }}>{ing.name || (fromPantry?.name) || ing.id}</div>
        {have && fromPantry?.expiring && (
          <div style={{
            fontFamily: '"DM Sans", system-ui', fontSize: 11, color: p.warning,
            marginTop: 1, fontWeight: 500,
          }}>uses up your {fromPantry.name.toLowerCase()}</div>
        )}
      </div>
      <span style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
        color: have ? p.inkSoft : p.inkFaint, fontWeight: 500,
      }}>{ing.amt}</span>
      {!have && onAdd && (
        <button onClick={() => { setAdded(true); onAdd(); }} style={{
          width: 28, height: 28, borderRadius: 999, border: 'none', cursor: added ? 'default' : 'pointer',
          background: added ? p.accent : p.surface,
          color: added ? p.accentInk : p.inkSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          transition: 'background 0.2s, color 0.2s',
        }}>
          <Icon name={added ? 'check' : 'cart'} size={13} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cook-along — step-by-step
// ─────────────────────────────────────────────────────────────
function CookScreen({ p, data, recipeId, navigate, onCookComplete, onDismiss }) {
  const recipe = data.recipes.find(r => r.id === recipeId) || data.recipes[0];
  const [step, setStep] = useState2(0);
  const [running, setRunning] = useState2(false);
  const [remaining, setRemaining] = useState2(recipe.steps[0].dur);
  const [done, setDone] = useState2(false);

  useEffect2(() => {
    setRemaining(recipe.steps[step].dur);
    setRunning(false);
  }, [step, recipeId]);

  useEffect2(() => {
    if (!running || remaining == null) return;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { setRunning(false); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const s = recipe.steps[step];
  const isLast = step === recipe.steps.length - 1;
  const fmt = (sec) => {
    if (sec == null) return '—';
    const m = Math.floor(sec / 60), ss = sec % 60;
    return `${m}:${String(ss).padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: p.paper, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '20px 18px 14px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button onClick={() => navigate('recipe', recipeId)} style={{
          width: 36, height: 36, borderRadius: 999, background: p.surface,
          border: `1px solid ${p.line}`, color: p.ink, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon name="x" size={16} strokeWidth={2} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
            color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
          }}>Step {step + 1} of {recipe.steps.length}</div>
          <div style={{
            fontFamily: '"DM Sans", system-ui', fontSize: 13, color: p.inkSoft,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{recipe.title}</div>
        </div>
      </div>

      <div style={{ padding: '0 18px 14px' }}>
        <div style={{
          height: 4, borderRadius: 999, background: p.surfaceAlt, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${((step + 1) / recipe.steps.length) * 100}%`,
            background: p.accent, transition: 'width 0.3s',
          }} />
        </div>
      </div>

      <div style={{
        flex: 1, padding: '24px 22px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 60, fontWeight: 700,
          color: p.accent + '20', letterSpacing: -3, lineHeight: 1, marginBottom: 14,
        }}>0{step + 1}.</div>
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif', fontSize: 30, fontWeight: 400,
          color: p.ink, lineHeight: 1.2, letterSpacing: -0.4, textWrap: 'pretty',
        }}>{s.t}</div>

        {s.dur != null && (
          <div style={{
            marginTop: 32, padding: 20, borderRadius: 18,
            background: p.surface, border: `1px solid ${p.line}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 999,
              background: running ? p.accent : p.surfaceAlt,
              color: running ? p.accentInk : p.ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon name="timer" size={28} strokeWidth={1.8} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
                color: p.inkSoft, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600,
              }}>{running ? 'Running' : remaining === 0 ? 'Done!' : 'Timer ready'}</div>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 32, fontWeight: 700,
                color: p.ink, fontVariantNumeric: 'tabular-nums',
              }}>{fmt(remaining)}</div>
            </div>
            <button onClick={() => setRunning(r => !r)} style={{
              padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: running ? p.surfaceAlt : p.accent,
              color: running ? p.ink : p.accentInk,
              fontFamily: '"DM Sans", system-ui', fontSize: 14, fontWeight: 600,
            }}>{running ? 'Pause' : 'Start'}</button>
          </div>
        )}
      </div>

      <div style={{
        padding: '14px 18px 30px', display: 'flex', gap: 10,
        borderTop: `1px solid ${p.line}`, background: p.paper,
      }}>
        <button onClick={() => setStep(s2 => Math.max(0, s2 - 1))} disabled={step === 0} style={{
          width: 56, height: 56, borderRadius: 999, border: `1px solid ${p.line}`,
          background: p.surface, color: step === 0 ? p.inkFaint : p.ink,
          cursor: step === 0 ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon name="chevronLeft" size={22} strokeWidth={1.8} /></button>
        {isLast ? (
          <BigButton fullWidth p={p} onClick={() => { onCookComplete && onCookComplete(recipe.id); setDone(true); }} icon="check">
            Done — I cooked it!
          </BigButton>
        ) : (
          <BigButton fullWidth p={p} onClick={() => setStep(s2 => s2 + 1)} icon="arrowRight">
            Next step
          </BigButton>
        )}
      </div>

      {done && <BonAppetit p={p} recipe={recipe} onDismiss={onDismiss} />}
    </div>
  );
}

function BonAppetit({ p, recipe, onDismiss }) {
  const CONFETTI = [
    { color: '#E07B54', x: 12, delay: 0,    dur: 2.4 },
    { color: '#F9C74F', x: 28, delay: 0.3,  dur: 2.1 },
    { color: '#90BE6D', x: 48, delay: 0.1,  dur: 2.7 },
    { color: '#577590', x: 65, delay: 0.5,  dur: 2.2 },
    { color: '#F3722C', x: 80, delay: 0.2,  dur: 2.5 },
    { color: '#43AA8B', x: 20, delay: 0.7,  dur: 2.0 },
    { color: '#F8961E', x: 55, delay: 0.4,  dur: 2.8 },
    { color: '#277DA1', x: 88, delay: 0.6,  dur: 2.3 },
    { color: '#E07B54', x: 38, delay: 0.15, dur: 2.6 },
    { color: '#F9C74F', x: 72, delay: 0.45, dur: 2.1 },
  ];

  return (
    <>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(120vh) rotate(600deg); opacity: 0; }
        }
        @keyframes chefFloat {
          0%, 100% { transform: translateY(0px) rotate(-3deg) scale(1); }
          50%       { transform: translateY(-22px) rotate(3deg) scale(1.05); }
        }
        @keyframes bonFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes starPop {
          0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(8deg);  opacity: 1; }
          100% { transform: scale(1) rotate(0deg);   opacity: 1; }
        }
      `}</style>

      {/* Confetti layer */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {CONFETTI.map((c, i) => (
          <div key={i} style={{
            position: 'absolute', top: -16, left: `${c.x}%`,
            width: 10, height: 10, borderRadius: i % 2 === 0 ? 999 : 2,
            background: c.color,
            animation: `confettiFall ${c.dur}s ${c.delay}s ease-in infinite`,
          }} />
        ))}
      </div>

      {/* Screen */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        background: p.paper,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 28px',
        overflow: 'hidden',
      }}>

        {/* Chef */}
        <div style={{ animation: 'chefFloat 2.6s ease-in-out infinite', marginBottom: 28 }}>
          <svg width="140" height="160" viewBox="0 0 140 160" fill="none">
            {/* Toque */}
            <ellipse cx="70" cy="38" rx="28" ry="26" fill="white" stroke="#E8E0D8" strokeWidth="1.5"/>
            <ellipse cx="70" cy="62" rx="36" ry="10" fill="white" stroke="#E8E0D8" strokeWidth="1.5"/>
            <rect x="34" y="60" width="72" height="8" rx="2" fill="white"/>
            {/* Hat band */}
            <rect x="34" y="64" width="72" height="5" rx="2" fill="#E8E0D8"/>
            {/* Face */}
            <circle cx="70" cy="90" r="28" fill="#FDDBB4"/>
            {/* Cheeks */}
            <ellipse cx="56" cy="95" rx="8" ry="5" fill="#F4A27A" opacity="0.45"/>
            <ellipse cx="84" cy="95" rx="8" ry="5" fill="#F4A27A" opacity="0.45"/>
            {/* Eyes — happy squint */}
            <path d="M 60 85 Q 64 82 68 85" stroke="#5C3D2E" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
            <path d="M 72 85 Q 76 82 80 85" stroke="#5C3D2E" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
            {/* Smile */}
            <path d="M 58 97 Q 70 110 82 97" stroke="#5C3D2E" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
            {/* Body */}
            <rect x="42" y="114" width="56" height="44" rx="12" fill="white" stroke="#E8E0D8" strokeWidth="1.5"/>
            {/* Coat buttons */}
            <circle cx="70" cy="126" r="2.5" fill="#E8E0D8"/>
            <circle cx="70" cy="138" r="2.5" fill="#E8E0D8"/>
            <circle cx="70" cy="150" r="2.5" fill="#E8E0D8"/>
            {/* Left arm raised */}
            <rect x="20" y="106" width="26" height="12" rx="6" fill="white" stroke="#E8E0D8" strokeWidth="1.5" transform="rotate(-50 20 106)"/>
            {/* Right arm raised */}
            <rect x="94" y="106" width="26" height="12" rx="6" fill="white" stroke="#E8E0D8" strokeWidth="1.5" transform="rotate(50 120 106)"/>
            {/* Hands */}
            <circle cx="16" cy="95" r="9" fill="#FDDBB4"/>
            <circle cx="124" cy="95" r="9" fill="#FDDBB4"/>
            {/* Stars in hands */}
            <text x="10" y="100" fontSize="13">⭐</text>
            <text x="118" y="100" fontSize="13">⭐</text>
          </svg>
        </div>

        {/* Text */}
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600,
          animation: 'bonFadeUp 0.5s 0.1s both',
          marginBottom: 10,
        }}>You did it</div>

        <h1 style={{
          margin: 0,
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 52, fontWeight: 400, color: p.ink,
          letterSpacing: -1.5, lineHeight: 1.0, textAlign: 'center',
          animation: 'bonFadeUp 0.5s 0.2s both',
        }}>Bon appétit!</h1>

        <p style={{
          margin: '14px 0 0',
          fontFamily: '"DM Sans", system-ui', fontSize: 16,
          color: p.inkSoft, textAlign: 'center', lineHeight: 1.45,
          animation: 'bonFadeUp 0.5s 0.3s both',
          maxWidth: 260,
        }}>{recipe.title} added to your cooking history.</p>

        <div style={{ marginTop: 40, width: '100%', animation: 'bonFadeUp 0.5s 0.45s both' }}>
          <BigButton fullWidth p={p} onClick={onDismiss} icon="home">
            Back to home
          </BigButton>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Shopping list
// ─────────────────────────────────────────────────────────────
function ShoppingScreen({ p, navigate, shoppingList = [], onToggle, onRemove }) {
  const grouped = shoppingList.reduce((g, it) => {
    const cat = it.cat || 'Other';
    (g[cat] = g[cat] || []).push(it);
    return g;
  }, {});

  const isEmpty = shoppingList.length === 0;

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ padding: '20px 18px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => navigate('back')} style={{
          width: 36, height: 36, borderRadius: 999, background: p.surface,
          border: `1px solid ${p.line}`, color: p.ink, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
            color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
          }}>Shopping list{!isEmpty && ` · ${shoppingList.length} items`}</div>
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif', fontSize: 28,
            fontWeight: 400, color: p.ink, letterSpacing: -0.4, marginTop: 2,
          }}>Round out the week</div>
        </div>
      </div>

      {isEmpty ? (
        <div style={{
          margin: '60px 24px 0', display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', gap: 12,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, background: p.surface,
            border: `1px solid ${p.line}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: p.inkFaint,
          }}>
            <Icon name="cart" size={24} strokeWidth={1.5} />
          </div>
          <div style={{ fontFamily: '"Newsreader", Georgia, serif', fontSize: 22, fontWeight: 400, color: p.ink }}>Nothing here yet</div>
          <div style={{ fontFamily: '"DM Sans", system-ui', fontSize: 15, color: p.inkSoft, maxWidth: 260, lineHeight: 1.5 }}>
            Open a recipe and tap "Add missing ingredients" to build your list.
          </div>
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 18 }}>
              <div style={{
                padding: '0 18px 8px', fontFamily: '"JetBrains Mono", monospace',
                fontSize: 10, color: p.inkFaint, textTransform: 'uppercase',
                letterSpacing: 1.5, fontWeight: 600,
              }}>{cat}</div>
              <div style={{
                margin: '0 18px', borderRadius: 16, background: p.surface,
                border: `1px solid ${p.line}`, overflow: 'hidden',
              }}>
                {items.map((it, i) => (
                  <div key={it.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    borderTop: i === 0 ? 'none' : `1px solid ${p.line}`,
                  }}>
                    <button onClick={() => onToggle(it.id, !it.checked)} style={{
                      width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                      background: it.checked ? p.accent : 'transparent',
                      border: it.checked ? 'none' : `1.5px solid ${p.line}`,
                      color: p.accentInk, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {it.checked && <Icon name="check" size={13} strokeWidth={2.5} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: '"DM Sans", system-ui', fontSize: 15, fontWeight: 500,
                        color: it.checked ? p.inkFaint : p.ink,
                        textDecoration: it.checked ? 'line-through' : 'none',
                      }}>{it.name}</div>
                      {it.qty && <div style={{
                        fontFamily: '"DM Sans", system-ui', fontSize: 12,
                        color: p.inkSoft, marginTop: 1,
                      }}>{it.qty}</div>}
                    </div>
                    <button onClick={() => onRemove(it.id)} style={{
                      width: 28, height: 28, borderRadius: 999, border: 'none',
                      background: 'transparent', color: p.inkFaint, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon name="x" size={14} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function guessCat(id) {
  if (['basil', 'avocado'].some(k => id.includes(k))) return 'Produce';
  if (['stock', 'chicken-stock'].some(k => id.includes(k))) return 'Pantry';
  if (['fish-sauce', 'oyster-sauce', 'soy'].some(k => id.includes(k))) return 'Pantry';
  if (['flour'].some(k => id.includes(k))) return 'Baking';
  return 'Other';
}

// ─────────────────────────────────────────────────────────────
// Profile / You — overview + entry to nested screens
// ─────────────────────────────────────────────────────────────
function ProfileScreen({ p, data, profile, onShop, navigate }) {
  const dietary = profile?.dietary?.length ? profile.dietary.join(', ') : 'No restrictions';
  const prefSummary = `${profile?.skill || 'Comfortable'} · ${dietary}`;
  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ padding: '20px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 999, background: p.accent,
            color: p.accentInk, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Newsreader", Georgia, serif', fontSize: 26, fontWeight: 500,
          }}>{data.user.name[0]}</div>
          <div>
            <div style={{
              fontFamily: '"Newsreader", Georgia, serif', fontSize: 24,
              fontWeight: 500, color: p.ink, letterSpacing: -0.3,
            }}>{data.user.name}</div>
            <div style={{
              fontFamily: '"DM Sans", system-ui', fontSize: 13, color: p.inkSoft,
            }}>{data.user.streak > 0
              ? `${data.user.streak} day streak 🔥`
              : 'Welcome to Pantry Pal'}</div>
          </div>
        </div>
      </div>

      <div style={{
        margin: '0 18px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10,
      }}>
        <Statlet label="Cooked" value={String(data.user.totalCooked ?? 0)} sub="recipes" p={p} />
        <Statlet label="This week" value={String(data.user.cookedThisWeek ?? 0)} sub={(data.user.cookedThisWeek ?? 0) === 1 ? 'meal' : 'meals'} p={p} />
        <Statlet label="Pantry" value={String(data.pantry.length)} sub={data.pantry.length === 1 ? 'item' : 'items'} p={p} />
      </div>

      <ProfileTile icon="cart" title="Shopping list"
        sub="What you need to round out the week"
        onClick={onShop} p={p} />

      <ProfileTile icon="book" title="Saved recipes"
        sub={data.user.savedCount ? `${data.user.savedCount} saved` : 'Nothing saved yet'}
        onClick={() => navigate('saved-recipes')} p={p} />

      <ProfileTile icon="leaf" title="Cooking history"
        sub={data.user.totalCooked ? `${data.user.totalCooked} recipes cooked` : 'No cooks yet'}
        onClick={() => {}} p={p} />

      <div style={{ height: 10 }} />

      <div style={{ margin: '0 18px', borderRadius: 14, background: p.surface, border: `1px solid ${p.line}`, overflow: 'hidden' }}>
        <ProfileRow icon="sparkle" label="Preferences" detail={prefSummary}
          onClick={() => navigate('settings')} p={p} first />
        <ProfileRow icon="cart" label="Grocery integrations" detail="None" onClick={() => navigate('grocery-integrations')} p={p} last />
      </div>

      <div style={{ padding: '18px 18px 0', textAlign: 'center' }}>
        <button onClick={() => window.PP.signOut()} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: p.inkSoft, fontFamily: '"DM Sans", system-ui', fontSize: 13,
          fontWeight: 500, padding: 8,
        }}>Sign out</button>
      </div>
    </div>
  );
}

function ProfileTile({ icon, title, sub, onClick, p }) {
  return (
    <button onClick={onClick} style={{
      margin: '0 18px 10px', width: 'calc(100% - 36px)',
      display: 'flex', alignItems: 'center', gap: 12, padding: 14,
      borderRadius: 14, background: p.surface, border: `1px solid ${p.line}`,
      cursor: 'pointer', textAlign: 'left',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: p.accentSoft,
        color: p.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon name={icon} size={18} strokeWidth={1.8} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: '"DM Sans", system-ui', fontSize: 14, fontWeight: 600, color: p.ink,
        }}>{title}</div>
        <div style={{
          fontFamily: '"DM Sans", system-ui', fontSize: 12, color: p.inkSoft,
        }}>{sub}</div>
      </div>
      <Icon name="chevronRight" size={16} stroke={p.inkFaint} strokeWidth={1.8} />
    </button>
  );
}

function ProfileRow({ icon, label, detail, onClick, p, first, last }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
      border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
      borderTop: first ? 'none' : `1px solid ${p.line}`,
    }}>
      <Icon name={icon} size={18} stroke={p.inkSoft} strokeWidth={1.6} />
      <span style={{
        flex: 1, fontFamily: '"DM Sans", system-ui', fontSize: 15, color: p.ink, fontWeight: 500,
      }}>{label}</span>
      {detail && <span style={{
        fontFamily: '"DM Sans", system-ui', fontSize: 13, color: p.inkSoft,
        maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{detail}</span>}
      <Icon name="chevronRight" size={14} stroke={p.inkFaint} strokeWidth={1.8} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings — taste preferences live here
// ─────────────────────────────────────────────────────────────
function SettingsScreen({ p, navigate }) {
  const [dietary, setDietary] = useState2(new Set(['Pescatarian-friendly']));
  const [allergens, setAllergens] = useState2(new Set([]));
  const [skill, setSkill] = useState2('Comfortable');
  const [spice, setSpice] = useState2('Medium');

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{
        padding: '20px 18px 14px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button onClick={() => navigate('back')} style={{
          width: 36, height: 36, borderRadius: 999, background: p.surface,
          border: `1px solid ${p.line}`, color: p.ink, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
            color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
          }}>You · Settings</div>
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif', fontSize: 28,
            fontWeight: 400, color: p.ink, letterSpacing: -0.4, marginTop: 2,
          }}>Preferences & taste</div>
        </div>
      </div>

      <div style={{ padding: '0 22px 18px' }}>
        <p style={{
          margin: 0, fontFamily: '"DM Sans", system-ui', fontSize: 13.5,
          color: p.inkSoft, lineHeight: 1.45,
        }}>Pal uses these to filter recipes and tune suggestions. Update them anytime — taste changes.</p>
      </div>

      <PrefSection title="Dietary" p={p}>
        {['Vegetarian', 'Vegan', 'Pescatarian-friendly', 'No restrictions'].map(d => (
          <Chip key={d} active={dietary.has(d)} onClick={() => {
            const n = new Set(dietary);
            dietary.has(d) ? n.delete(d) : n.add(d);
            setDietary(n);
          }} p={p}>{d}</Chip>
        ))}
      </PrefSection>

      <PrefSection title="Allergens to avoid" p={p}>
        {['Peanut', 'Tree nut', 'Shellfish', 'Dairy', 'Gluten', 'Soy', 'Egg'].map(a => (
          <Chip key={a} active={allergens.has(a)} onClick={() => {
            const n = new Set(allergens);
            allergens.has(a) ? n.delete(a) : n.add(a);
            setAllergens(n);
          }} p={p}>{a}</Chip>
        ))}
      </PrefSection>

      <PrefSection title="Cooking skill" p={p}>
        {['New to it', 'Comfortable', 'Confident', 'Show off'].map(s => (
          <Chip key={s} active={skill === s} onClick={() => setSkill(s)} p={p}>{s}</Chip>
        ))}
      </PrefSection>

      <PrefSection title="Spice tolerance" p={p}>
        {['None', 'Mild', 'Medium', 'Hot', 'Bring it'].map(s => (
          <Chip key={s} active={spice === s} onClick={() => setSpice(s)} p={p}>{s}</Chip>
        ))}
      </PrefSection>
    </div>
  );
}

function Statlet({ label, value, sub, p }) {
  return (
    <div style={{
      padding: '14px 12px', borderRadius: 14, background: p.surface,
      border: `1px solid ${p.line}`, textAlign: 'left',
    }}>
      <div style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
        color: p.inkFaint, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600,
      }}>{label}</div>
      <div style={{
        fontFamily: '"Newsreader", Georgia, serif', fontSize: 22, fontWeight: 500,
        color: p.ink, marginTop: 2, letterSpacing: -0.3,
      }}>{value}</div>
      <div style={{
        fontFamily: '"DM Sans", system-ui', fontSize: 11, color: p.inkSoft,
      }}>{sub}</div>
    </div>
  );
}

function PrefSection({ title, children, p }) {
  return (
    <div style={{ padding: '0 18px 22px' }}>
      <div style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
        color: p.inkFaint, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        marginBottom: 8,
      }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
    </div>
  );
}

function SavedRecipesScreen({ p, t, data, pantryIds, savedSet, navigate }) {
  const saved = data.recipes.filter(r => savedSet.has(r.id));

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ padding: '20px 18px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => navigate('back')} style={{
          width: 36, height: 36, borderRadius: 999, background: p.surface,
          border: `1px solid ${p.line}`, color: p.ink, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
            color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
          }}>Saved{saved.length > 0 && ` · ${saved.length}`}</div>
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif', fontSize: 28,
            fontWeight: 400, color: p.ink, letterSpacing: -0.4, marginTop: 2,
          }}>Your recipes</div>
        </div>
      </div>

      {saved.length === 0 ? (
        <div style={{
          margin: '60px 24px 0', display: 'flex', flexDirection: 'column',
          alignItems: 'center', textAlign: 'center', gap: 12,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, background: p.surface,
            border: `1px solid ${p.line}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: p.inkFaint,
          }}>
            <Icon name="star" size={24} strokeWidth={1.5} />
          </div>
          <div style={{ fontFamily: '"Newsreader", Georgia, serif', fontSize: 22, fontWeight: 400, color: p.ink }}>Nothing saved yet</div>
          <div style={{ fontFamily: '"DM Sans", system-ui', fontSize: 15, color: p.inkSoft, maxWidth: 260, lineHeight: 1.5 }}>
            Tap the star on any recipe to save it here.
          </div>
        </div>
      ) : (
        <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {saved.map(r => {
            const m = calcMatch(r, pantryIds);
            return <RecipeCard key={r.id} recipe={r} match={m} layout="list"
              matchStyle={t?.matchStyle || 'percent'} p={p}
              onClick={() => navigate('recipe', r.id)} />;
          })}
        </div>
      )}
    </div>
  );
}

function GroceryIntegrationsScreen({ p, navigate }) {
  const INTEGRATIONS = [
    { name: 'Postmates', src: 'assets/postmates.png' },
    { name: 'Uber Eats', src: 'assets/ubereats.png' },
    { name: 'DoorDash',  src: 'assets/doordash.webp' },
    { name: 'Instacart', src: 'assets/instacart.png' },
  ];
  const [tapped, setTapped] = useState2(null);

  const handleTap = (name) => {
    setTapped(name);
    setTimeout(() => setTapped(t => t === name ? null : t), 2800);
  };

  return (
    <div style={{ paddingBottom: 120, position: 'relative' }}>
      <style>{`
        @keyframes toastUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ padding: '20px 18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => navigate('back')} style={{
          width: 36, height: 36, borderRadius: 999, background: p.surface,
          border: `1px solid ${p.line}`, color: p.ink, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
            color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
          }}>Integrations</div>
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif', fontSize: 28,
            fontWeight: 400, color: p.ink, letterSpacing: -0.4, marginTop: 2,
          }}>Grocery delivery</div>
        </div>
      </div>

      <div style={{ padding: '0 18px 20px', fontFamily: '"DM Sans", system-ui', fontSize: 15, color: p.inkSoft, lineHeight: 1.5 }}>
        Connect a delivery app to order missing ingredients straight from your shopping list.
      </div>

      <div style={{ padding: '0 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {INTEGRATIONS.map(({ name, src }) => (
          <div key={name} onClick={() => handleTap(name)} style={{
            borderRadius: 20, overflow: 'hidden',
            aspectRatio: '1 / 1', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            transform: tapped === name ? 'scale(0.96)' : 'scale(1)',
            transition: 'transform 0.15s ease',
          }}>
            <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>

      {tapped && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: p.ink, color: p.paper, borderRadius: 12,
          padding: '10px 18px', whiteSpace: 'nowrap',
          fontFamily: '"DM Sans", system-ui', fontSize: 13, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          animation: 'toastUp 0.2s ease both',
          zIndex: 100,
        }}>
          🚧 This is a fake door test
        </div>
      )}
    </div>
  );
}

Object.assign(window, { BrowseScreen, RecipeDetailScreen, CookScreen, ShoppingScreen, ProfileScreen, SettingsScreen, GroceryIntegrationsScreen, SavedRecipesScreen });
