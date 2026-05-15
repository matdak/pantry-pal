// screens-detail.jsx — Browse, Recipe Detail, Cook-along, Shopping, Profile

const { useState: useState2, useEffect: useEffect2, useRef: useRef2, useMemo: useMemo2 } = React;

// ─────────────────────────────────────────────────────────────
// Browse — filter chips + sorted recipe grid/list
// ─────────────────────────────────────────────────────────────
function BrowseScreen({ p, t, data, pantryIds, navigate }) {
  const [cuisine, setCuisine] = useState2('All');
  const [quick, setQuick] = useState2(false);
  const [pantryOnly, setPantryOnly] = useState2(false);

  const visible = useMemo2(() => {
    let list = data.recipes.map(r => ({ r, m: calcMatch(r, pantryIds) }));
    if (cuisine !== 'All') list = list.filter(({ r }) => r.cuisine === cuisine);
    if (quick) list = list.filter(({ r }) => r.time <= 25);
    if (pantryOnly) list = list.filter(({ m }) => m.missing === 0);
    list.sort((a, b) => (b.m.have / b.m.total) - (a.m.have / a.m.total));
    return list;
  }, [cuisine, quick, pantryOnly, pantryIds, data]);

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ padding: '20px 18px 12px' }}>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
        }}>Browse · {visible.length} recipes</div>
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
          {visible.map(({ r, m }) => (
            <RecipeCard key={r.id} recipe={r} match={m} layout="grid" matchStyle={t.matchStyle}
              onClick={() => navigate('recipe', r.id)} p={p} />
          ))}
        </div>
      ) : t.cardLayout === 'feed' ? (
        <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {visible.map(({ r, m }) => (
            <RecipeCard key={r.id} recipe={r} match={m} layout="feed" matchStyle={t.matchStyle}
              onClick={() => navigate('recipe', r.id)} p={p} />
          ))}
        </div>
      ) : (
        <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {visible.map(({ r, m }) => (
            <RecipeCard key={r.id} recipe={r} match={m} layout="list" matchStyle={t.matchStyle}
              onClick={() => navigate('recipe', r.id)} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recipe Detail
// ─────────────────────────────────────────────────────────────
function RecipeDetailScreen({ p, t, data, pantryIds, recipeId, navigate, onCook }) {
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
        <button style={{
          position: 'absolute', top: 14, right: 14,
          width: 40, height: 40, borderRadius: 999,
          background: 'rgba(255,255,255,0.94)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="star" size={18} stroke={p.ink} strokeWidth={1.8} />
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
            <IngredientRow key={i} ing={ing} have={pantryIds.has(ing.id)} p={p} data={data} />
          ))}
        </div>

        {missIng.length > 0 && (
          <button onClick={() => navigate('shopping')} style={{
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

function IngredientRow({ ing, have, p, data }) {
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cook-along — step-by-step
// ─────────────────────────────────────────────────────────────
function CookScreen({ p, data, recipeId, navigate, onFinish }) {
  const recipe = data.recipes.find(r => r.id === recipeId) || data.recipes[0];
  const [step, setStep] = useState2(0);
  const [running, setRunning] = useState2(false);
  const [remaining, setRemaining] = useState2(recipe.steps[0].dur);

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
          <BigButton fullWidth p={p} onClick={() => { onFinish(recipe.id); navigate('home'); }} icon="check">
            Done — I cooked it!
          </BigButton>
        ) : (
          <BigButton fullWidth p={p} onClick={() => setStep(s2 => s2 + 1)} icon="arrowRight">
            Next step
          </BigButton>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Shopping list
// ─────────────────────────────────────────────────────────────
function ShoppingScreen({ p, data, pantryIds, navigate }) {
  // collect missing ingredients across all "considered" (high-match) recipes
  const items = useMemo2(() => {
    const map = {};
    data.recipes.forEach(r => {
      r.ingredients.forEach(ing => {
        if (!pantryIds.has(ing.id) && !ing.have) {
          if (!map[ing.id]) {
            map[ing.id] = {
              id: ing.id, name: ing.name || ing.id, amt: ing.amt,
              recipes: [], cat: guessCat(ing.id),
            };
          }
          map[ing.id].recipes.push(r.title);
        }
      });
    });
    return Object.values(map);
  }, [data, pantryIds]);
  const [checked, setChecked] = useState2(new Set());

  const grouped = items.reduce((g, i) => { (g[i.cat] = g[i.cat] || []).push(i); return g; }, {});

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{
        padding: '20px 18px 14px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button onClick={() => navigate('home')} style={{
          width: 36, height: 36, borderRadius: 999, background: p.surface,
          border: `1px solid ${p.line}`, color: p.ink, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}><Icon name="chevronLeft" size={18} strokeWidth={2} /></button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
            color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600,
          }}>Shopping list · {items.length} items</div>
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif', fontSize: 28,
            fontWeight: 400, color: p.ink, letterSpacing: -0.4, marginTop: 2,
          }}>Round out the week</div>
        </div>
      </div>

      <div style={{ padding: '0 18px 14px', display: 'flex', gap: 8 }}>
        <button style={{
          flex: 1, padding: '14px 16px', borderRadius: 14, border: 'none',
          background: p.ink, color: p.paper, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: '"DM Sans", system-ui', fontSize: 14, fontWeight: 600,
        }}>
          <Icon name="cart" size={16} strokeWidth={1.8} />
          Send to Instacart
        </button>
        <button style={{
          padding: '14px 16px', borderRadius: 14, border: `1px solid ${p.line}`,
          background: p.surface, color: p.ink, cursor: 'pointer',
          fontFamily: '"DM Sans", system-ui', fontSize: 14, fontWeight: 600,
        }}>Share</button>
      </div>

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
            {items.map((it, i) => {
              const isChecked = checked.has(it.id);
              return (
                <button key={it.id} onClick={() => {
                  const n = new Set(checked);
                  isChecked ? n.delete(it.id) : n.add(it.id);
                  setChecked(n);
                }} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', border: 'none', background: 'transparent',
                  borderTop: i === 0 ? 'none' : `1px solid ${p.line}`,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 999,
                    background: isChecked ? p.accent : 'transparent',
                    border: isChecked ? 'none' : `1.5px solid ${p.line}`,
                    color: p.accentInk,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {isChecked && <Icon name="check" size={13} strokeWidth={2.5} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: '"DM Sans", system-ui', fontSize: 15, fontWeight: 500,
                      color: isChecked ? p.inkFaint : p.ink,
                      textDecoration: isChecked ? 'line-through' : 'none',
                    }}>{it.name}</div>
                    <div style={{
                      fontFamily: '"DM Sans", system-ui', fontSize: 12, color: p.inkSoft,
                      marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>for {it.recipes.slice(0, 2).join(', ')}{it.recipes.length > 2 && ` +${it.recipes.length - 2}`}</div>
                  </div>
                  <span style={{
                    fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                    color: p.inkSoft, flexShrink: 0,
                  }}>{it.amt}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
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
        sub={data.user.savedCount ? `${data.user.savedCount} favorites` : 'Nothing saved yet'}
        onClick={() => {}} p={p} />

      <ProfileTile icon="leaf" title="Cooking history"
        sub={data.user.totalCooked ? `${data.user.totalCooked} recipes cooked` : 'No cooks yet'}
        onClick={() => {}} p={p} />

      <div style={{ height: 10 }} />

      <div style={{ margin: '0 18px', borderRadius: 14, background: p.surface, border: `1px solid ${p.line}`, overflow: 'hidden' }}>
        <ProfileRow icon="sparkle" label="Preferences & taste" detail={prefSummary}
          onClick={() => navigate('settings')} p={p} first />
        <ProfileRow icon="bell" label="Notifications" detail="Off" onClick={() => {}} p={p} />
        <ProfileRow icon="fridge" label="Connected appliances" detail="None" onClick={() => {}} p={p} />
        <ProfileRow icon="cart" label="Grocery integrations" detail="None" onClick={() => {}} p={p} />
        <ProfileRow icon="profile" label="Account" detail="" onClick={() => {}} p={p} last />
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

Object.assign(window, { BrowseScreen, RecipeDetailScreen, CookScreen, ShoppingScreen, ProfileScreen, SettingsScreen });
