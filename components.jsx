// components.jsx — shared UI components for Pantry Pal

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────
// Palettes (selectable via Tweaks)
// ─────────────────────────────────────────────────────────────
const PALETTES = {
  terracotta: {
    name: 'Terracotta',
    paper: '#f5efe3',
    surface: '#ffffff',
    surfaceAlt: '#fbf7ee',
    ink: '#262017',
    inkSoft: '#6b6354',
    inkFaint: '#a39884',
    accent: '#c45a3c',
    accentInk: '#ffffff',
    accentSoft: '#f0d9ce',
    sage: '#7a8b6a',
    danger: '#b8472a',
    warning: '#c8902b',
    line: '#e8dfcf',
    dark: false,
  },
  saffron: {
    name: 'Saffron',
    paper: '#faf3e0',
    surface: '#fffdf6',
    surfaceAlt: '#f5ecd3',
    ink: '#2a2418',
    inkSoft: '#766c52',
    inkFaint: '#aba087',
    accent: '#b58320',
    accentInk: '#ffffff',
    accentSoft: '#ecdda8',
    sage: '#6f8a4f',
    danger: '#b8552a',
    warning: '#a87214',
    line: '#ece2c8',
    dark: false,
  },
  forest: {
    name: 'Forest',
    paper: '#eef0e8',
    surface: '#ffffff',
    surfaceAlt: '#e4e8dd',
    ink: '#1f2517',
    inkSoft: '#5e6651',
    inkFaint: '#959c85',
    accent: '#476d3e',
    accentInk: '#ffffff',
    accentSoft: '#d4ddc7',
    sage: '#7a8b6a',
    danger: '#a8492c',
    warning: '#b8902b',
    line: '#dde0d4',
    dark: false,
  },
  plum: {
    name: 'Plum (dark)',
    paper: '#1c171b',
    surface: '#27201f',
    surfaceAlt: '#2f2725',
    ink: '#f4ede9',
    inkSoft: '#b8a8a0',
    inkFaint: '#776863',
    accent: '#d49aaf',
    accentInk: '#1c171b',
    accentSoft: '#3a2b32',
    sage: '#9bb27e',
    danger: '#e08570',
    warning: '#dbb87a',
    line: '#3a302e',
    dark: true,
  },
};

// ─────────────────────────────────────────────────────────────
// Icons — simple stroke SVGs, no flourishes
// ─────────────────────────────────────────────────────────────
const Icon = ({ name, size = 20, stroke = 'currentColor', strokeWidth = 1.6, fill = 'none' }) => {
  const paths = {
    home: <><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2v-9z"/></>,
    pantry: <><rect x="3.5" y="3.5" width="17" height="17" rx="2"/><path d="M3.5 9.5h17M3.5 15h17M9 3.5v17"/></>,
    browse: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    profile: <><circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></>,
    send: <><path d="M5 12 21 4l-3 17-5-5-3 4v-7l-5-1z"/></>,
    chevronLeft: <><path d="m15 18-6-6 6-6"/></>,
    chevronRight: <><path d="m9 18 6-6-6-6"/></>,
    chevronUp: <><path d="m6 15 6-6 6 6"/></>,
    chevronDown: <><path d="m6 9 6 6 6-6"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    flame: <><path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3-1-2-1-4 0-7-4 2-7 6-7 11 0 4 2 7 6 7z"/></>,
    leaf: <><path d="M4 20s-1-12 11-15c2 5 5 17-11 15zM4 20l8-8"/></>,
    check: <><path d="m5 12 4 4 10-10"/></>,
    x: <><path d="m5 5 14 14M19 5 5 19"/></>,
    cart: <><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.5 11h11l2-7H6"/></>,
    sparkle: <><path d="M12 3v6M12 15v6M3 12h6M15 12h6M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3"/></>,
    chef: <><path d="M7 14h10v6a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-6z"/><path d="M7 14a4 4 0 1 1 1-7.7A3.5 3.5 0 0 1 12 4a3.5 3.5 0 0 1 4 2.3A4 4 0 1 1 17 14"/></>,
    book: <><path d="M4 4h7a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z"/><path d="M20 4h-7a4 4 0 0 0-4 4v12h7a4 4 0 0 0 4-4V4z"/></>,
    bell: <><path d="M6 15V11a6 6 0 0 1 12 0v4l2 3H4l2-3zM10 21h4"/></>,
    edit: <><path d="M4 20h4l11-11-4-4L4 16v4z"/></>,
    timer: <><circle cx="12" cy="13" r="8"/><path d="M12 8v5l3 2M9 2h6M12 2v3"/></>,
    fridge: <><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 11h12M9 6v2M9 14v3"/></>,
    keyboard: <><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12"/></>,
    arrowRight: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></>,
    star: <><path d="m12 3 2.6 6 6.4.5-5 4.3 1.6 6.2L12 16.8 6.4 20l1.6-6.2-5-4.3 6.4-.5L12 3z"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {paths[name] || null}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// Top bar — small status row + page chrome
// ─────────────────────────────────────────────────────────────
function TopBar({ left, title, right, p, sticky = true }) {
  return (
    <div style={{
      position: sticky ? 'sticky' : 'relative', top: 0, zIndex: 5,
      background: p.paper,
      borderBottom: `1px solid ${p.line}`,
      padding: '54px 18px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{left}</div>
        {title && (
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif', fontSize: 19, fontWeight: 500,
            color: p.ink, letterSpacing: -0.2,
          }}>{title}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom tab bar — 4 tabs + center FAB
// ─────────────────────────────────────────────────────────────
function TabBar({ active, onChange, onAdd, p }) {
  const tabs = [
    { id: 'home', label: 'Today', icon: 'home' },
    { id: 'pantry', label: 'Pantry', icon: 'pantry' },
    { id: 'browse', label: 'Browse', icon: 'browse' },
    { id: 'profile', label: 'You', icon: 'profile' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40,
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', paddingTop: 8,
      background: `linear-gradient(to top, ${p.paper} 70%, ${p.paper}00)`,
      pointerEvents: 'none',
    }}>
      <div style={{
        margin: '0 14px', display: 'flex', alignItems: 'center',
        background: p.surface, borderRadius: 999, padding: '8px 10px',
        border: `1px solid ${p.line}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.6) inset',
        pointerEvents: 'auto',
      }}>
        {tabs.slice(0, 2).map(t => (
          <TabBtn key={t.id} t={t} active={active === t.id} onClick={() => onChange(t.id)} p={p} />
        ))}
        <button onClick={onAdd}
          style={{
            width: 52, height: 52, borderRadius: 999, border: 'none',
            background: p.accent, color: p.accentInk,
            margin: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 16px ${p.accent}55, 0 1px 0 rgba(255,255,255,0.3) inset`,
            cursor: 'pointer', flexShrink: 0,
          }}>
          <Icon name="plus" size={24} strokeWidth={2.2} />
        </button>
        {tabs.slice(2).map(t => (
          <TabBtn key={t.id} t={t} active={active === t.id} onClick={() => onChange(t.id)} p={p} />
        ))}
      </div>
    </div>
  );
}

function TabBtn({ t, active, onClick, p }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      padding: '6px 0', border: 'none', background: 'transparent',
      color: active ? p.accent : p.inkSoft, cursor: 'pointer',
      fontFamily: '"DM Sans", system-ui', fontSize: 10, fontWeight: 600,
      letterSpacing: 0.2,
    }}>
      <Icon name={t.icon} size={20} strokeWidth={active ? 2 : 1.6} />
      <span>{t.label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Match indicator — three variants (Tweakable)
// ─────────────────────────────────────────────────────────────
function MatchIndicator({ have, total, missing, style, p, size = 'sm' }) {
  // If a recipe has no ingredients recorded, don't try to compute a match — skip rendering.
  if (!total || total <= 0) return null;
  const pct = Math.round((have / total) * 100);
  const c = pct >= 90 ? p.sage : pct >= 60 ? p.warning : p.danger;
  const px = size === 'lg' ? 13 : 11;

  if (style === 'percent') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 9px', borderRadius: 999,
        background: c + '18', color: c,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: px, fontWeight: 600, letterSpacing: -0.2,
      }}>
        {pct}<span style={{ opacity: 0.65 }}>%</span><span style={{ opacity: 0.5, marginLeft: 2 }}>match</span>
      </div>
    );
  }
  if (style === 'dots') {
    const dots = total > 6 ? 6 : total;
    const filled = Math.round((have / total) * dots);
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {[...Array(dots)].map((_, i) => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: 999,
              background: i < filled ? c : p.line,
            }} />
          ))}
        </div>
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: px - 1, color: p.inkSoft, fontWeight: 500,
        }}>{have}/{total}</span>
      </div>
    );
  }
  // missing-count
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 999,
      background: missing === 0 ? p.sage + '18' : p.surfaceAlt,
      color: missing === 0 ? p.sage : p.inkSoft,
      fontFamily: '"DM Sans", system-ui', fontSize: px, fontWeight: 600,
      border: missing === 0 ? 'none' : `1px solid ${p.line}`,
    }}>
      {missing === 0 ? (
        <><Icon name="check" size={11} strokeWidth={2.5} /><span>All in</span></>
      ) : (
        <span>Need <span style={{ color: p.ink }}>{missing}</span></span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recipe Card — three layouts (Tweakable)
// ─────────────────────────────────────────────────────────────
function RecipeCard({ recipe, match, layout, matchStyle, onClick, p }) {
  if (layout === 'list') return <RecipeCardList r={recipe} m={match} mStyle={matchStyle} onClick={onClick} p={p} />;
  if (layout === 'grid') return <RecipeCardGrid r={recipe} m={match} mStyle={matchStyle} onClick={onClick} p={p} />;
  return <RecipeCardFeed r={recipe} m={match} mStyle={matchStyle} onClick={onClick} p={p} />;
}

function RecipeCardList({ r, m, mStyle, onClick, p }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', gap: 14, padding: 10, border: 'none',
      background: p.surface, borderRadius: 16, textAlign: 'left',
      border: `1px solid ${p.line}`, cursor: 'pointer',
      alignItems: 'stretch',
    }}>
      <img src={r.photo} alt="" style={{
        width: 84, height: 84, borderRadius: 12, objectFit: 'cover', flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 2 }}>
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif', fontSize: 17, fontWeight: 500,
          color: p.ink, lineHeight: 1.15, letterSpacing: -0.2,
          textWrap: 'pretty',
        }}>{r.title}</div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.inkFaint, textTransform: 'uppercase', letterSpacing: 0.8,
          display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span>{r.time} min</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{r.cuisine}</span>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MatchIndicator have={m.have} total={m.total} missing={m.missing} style={mStyle} p={p} />
          {r.expiringUsed?.length > 0 && (
            <span style={{
              fontFamily: '"DM Sans", system-ui', fontSize: 11, fontWeight: 500,
              color: p.warning, display: 'inline-flex', alignItems: 'center', gap: 3,
            }}>
              <Icon name="leaf" size={11} strokeWidth={1.8} />
              uses expiring
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function RecipeCardGrid({ r, m, mStyle, onClick, p }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', flexDirection: 'column', border: 'none',
      background: p.surface, borderRadius: 16, padding: 0, textAlign: 'left',
      overflow: 'hidden', border: `1px solid ${p.line}`, cursor: 'pointer',
    }}>
      <div style={{ position: 'relative', aspectRatio: '1 / 1', overflow: 'hidden' }}>
        <img src={r.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <MatchIndicator have={m.have} total={m.total} missing={m.missing} style={mStyle} p={p} />
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif', fontSize: 15, fontWeight: 500,
          color: p.ink, lineHeight: 1.15, letterSpacing: -0.1,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>{r.title}</div>
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 9,
          color: p.inkFaint, textTransform: 'uppercase', letterSpacing: 0.8,
        }}>{r.time}m · {r.cuisine}</div>
      </div>
    </button>
  );
}

function RecipeCardFeed({ r, m, mStyle, onClick, p }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', flexDirection: 'column', border: 'none',
      background: p.surface, borderRadius: 18, padding: 0, textAlign: 'left',
      overflow: 'hidden', border: `1px solid ${p.line}`, cursor: 'pointer',
    }}>
      <div style={{ position: 'relative', aspectRatio: '16 / 10', overflow: 'hidden' }}>
        <img src={r.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)',
        }} />
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
          <MatchIndicator have={m.have} total={m.total} missing={m.missing} style={mStyle} p={p} />
          {r.expiringUsed?.length > 0 && (
            <div style={{
              padding: '4px 9px', borderRadius: 999,
              background: 'rgba(255,255,255,0.92)', color: p.warning,
              fontFamily: '"DM Sans", system-ui', fontSize: 11, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              <Icon name="leaf" size={11} strokeWidth={2} />
              uses expiring
            </div>
          )}
        </div>
        <div style={{
          position: 'absolute', bottom: 12, left: 14, right: 14, color: '#fff',
        }}>
          <div style={{
            fontFamily: '"Newsreader", Georgia, serif', fontSize: 22, fontWeight: 500,
            lineHeight: 1.1, letterSpacing: -0.3, textShadow: '0 1px 12px rgba(0,0,0,0.5)',
            textWrap: 'pretty',
          }}>{r.title}</div>
          <div style={{
            marginTop: 4, fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
            letterSpacing: 1, textTransform: 'uppercase', opacity: 0.9,
          }}>{r.time} min · {r.cuisine} · {r.difficulty}</div>
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Freshness pip — tiny indicator
// ─────────────────────────────────────────────────────────────
function FreshnessPip({ fresh, p, size = 8 }) {
  const c = fresh >= 0.7 ? p.sage : fresh >= 0.4 ? p.warning : p.danger;
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: 999,
      background: c, flexShrink: 0,
    }} title={fresh >= 0.7 ? 'fresh' : fresh >= 0.4 ? 'use soon' : 'expiring'} />
  );
}

// ─────────────────────────────────────────────────────────────
// Match calc utility
// ─────────────────────────────────────────────────────────────
function calcMatch(recipe, pantryIds) {
  const have = recipe.need.filter(id => pantryIds.has(id)).length;
  const missing = recipe.need.length - have + (recipe.missing?.length || 0);
  const total = recipe.need.length + (recipe.missing?.length || 0);
  return { have: have + 0, total, missing };
}

// ─────────────────────────────────────────────────────────────
// Section header — small caps with optional action
// ─────────────────────────────────────────────────────────────
function SectionHeader({ kicker, title, action, p }) {
  return (
    <div style={{ padding: '0 18px', marginBottom: 12 }}>
      {kicker && (
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
          color: p.accent, textTransform: 'uppercase', letterSpacing: 1.5,
          fontWeight: 600, marginBottom: 4,
        }}>{kicker}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{
          margin: 0, fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 24, fontWeight: 500, color: p.ink, letterSpacing: -0.4,
          lineHeight: 1.1, textWrap: 'pretty',
        }}>{title}</h2>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pill / Chip
// ─────────────────────────────────────────────────────────────
function Chip({ children, active, onClick, p, icon }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 13px', borderRadius: 999, border: 'none', cursor: 'pointer',
      background: active ? p.ink : p.surface,
      color: active ? p.paper : p.ink,
      fontFamily: '"DM Sans", system-ui', fontSize: 13, fontWeight: 500,
      whiteSpace: 'nowrap', flexShrink: 0,
      border: `1px solid ${active ? p.ink : p.line}`,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {icon && <Icon name={icon} size={13} strokeWidth={1.8} />}
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Big Button
// ─────────────────────────────────────────────────────────────
function BigButton({ children, onClick, p, variant = 'primary', icon, fullWidth }) {
  const styles = {
    primary: { bg: p.accent, fg: p.accentInk, border: 'transparent' },
    secondary: { bg: p.surface, fg: p.ink, border: p.line },
    ghost: { bg: 'transparent', fg: p.ink, border: p.line },
  }[variant];
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '14px 22px', borderRadius: 999, border: `1px solid ${styles.border}`,
      background: styles.bg, color: styles.fg, cursor: 'pointer',
      fontFamily: '"DM Sans", system-ui', fontSize: 15, fontWeight: 600,
      width: fullWidth ? '100%' : 'auto', letterSpacing: -0.1,
      boxShadow: variant === 'primary' ? `0 6px 16px ${p.accent}40` : 'none',
    }}>
      {icon && <Icon name={icon} size={18} strokeWidth={2} />}
      {children}
    </button>
  );
}

Object.assign(window, {
  PALETTES, Icon, TopBar, TabBar, MatchIndicator, RecipeCard,
  FreshnessPip, calcMatch, SectionHeader, Chip, BigButton,
});
