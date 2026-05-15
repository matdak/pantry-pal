// app.jsx — Pantry Pal main App + nav

const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "terracotta",
  "homeLayout": "todaysPick",
  "cardLayout": "list",
  "matchStyle": "percent",
  "showOnboarding": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const p = PALETTES[t.palette] || PALETTES.terracotta;

  const data = window.PANTRY_PAL_DATA;
  const [pantry, setPantry] = useStateA(data.pantry);
  const pantryIds = useMemoA(() => new Set(pantry.map(i => i.id)), [pantry]);
  const [cookedDays, setCookedDays] = useStateA([true, true, false, true, true, false, false]);

  // route stack: { name, args }
  const [stack, setStack] = useStateA(t.showOnboarding ? [{ name: 'onboarding' }] : [{ name: 'home' }]);
  const top = stack[stack.length - 1];

  const navigate = (name, arg) => {
    if (name === 'back') {
      setStack(s => s.length > 1 ? s.slice(0, -1) : s);
      return;
    }
    // tabs reset stack
    if (['home', 'pantry', 'browse', 'profile'].includes(name)) {
      setStack([{ name }]);
    } else {
      setStack(s => [...s, { name, arg }]);
    }
  };

  // Add sheet — mode 'add' (default) or 'grocery'
  const [addSheet, setAddSheet] = useStateA(null);   // null | 'add' | 'grocery'
  const [showCook, setShowCook] = useStateA(null);

  const openAdd = (mode = 'add') => setAddSheet(mode);

  const onAddItems = (items, mode = 'inventory') => {
    const newOnes = items.map((it, i) => {
      // honor user-spoken expiring cues ("looking sad", "almost gone") via the item.tag
      const explicitlyExpiring = it.tag === 'expiring';
      const fresh = explicitlyExpiring ? 0.3 : freshnessFor(it.name, mode);
      return {
        id: `added-${Date.now()}-${i}`, name: it.name, qty: it.qty, said: it.said,
        cat: guessCatFromName(it.name), loc: guessLocFromName(it.name),
        fresh, expiring: explicitlyExpiring || fresh < 0.45,
        added: 'just now',
      };
    });
    setPantry(pp => [...pp, ...newOnes]);
  };
  const onRemove = (id) => setPantry(pp => pp.filter(i => i.id !== id));

  const activeTab = ['home', 'pantry', 'browse', 'profile'].includes(top.name) ? top.name : null;

  const liveData = { ...data, pantry };

  // route screen
  let screen;
  if (top.name === 'onboarding') {
    screen = <Onboarding p={p} onFinish={(items) => {
      // append the items the user just talked through, with onboarding freshness
      if (items && items.length) onAddItems(items, 'onboarding');
      setStack([{ name: 'home' }]);
    }} />;
  } else if (top.name === 'home') {
    screen = <HomeScreen p={p} t={t} data={liveData} pantryIds={pantryIds}
              navigate={navigate} cookedDays={cookedDays}
              onGrocery={() => openAdd('grocery')} />;
  } else if (top.name === 'pantry') {
    screen = <PantryScreen p={p} data={liveData} navigate={navigate} onRemove={onRemove} />;
  } else if (top.name === 'browse') {
    screen = <BrowseScreen p={p} t={t} data={liveData} pantryIds={pantryIds} navigate={navigate} />;
  } else if (top.name === 'profile') {
    screen = <ProfileScreen p={p} data={liveData} navigate={navigate}
              onShop={() => navigate('shopping')} />;
  } else if (top.name === 'settings') {
    screen = <SettingsScreen p={p} navigate={navigate} />;
  } else if (top.name === 'shopping') {
    screen = <ShoppingScreen p={p} data={liveData} pantryIds={pantryIds} navigate={navigate} />;
  } else if (top.name === 'recipe') {
    screen = <RecipeDetailScreen p={p} t={t} data={liveData} pantryIds={pantryIds}
              recipeId={top.arg} navigate={navigate} onCook={(id) => setShowCook(id)} />;
  }

  return (
    <div style={{
      width: '100%', height: '100%', background: p.paper, color: p.ink,
      position: 'relative', overflow: 'hidden',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      <div data-screen-label={`screen-${top.name}`} style={{
        position: 'absolute', left: 0, right: 0,
        top: 'env(safe-area-inset-top)', bottom: 0,
        overflowY: 'auto',
      }}>
        {screen}
      </div>

      {/* Tab bar — hidden during onboarding and full-screen cooking */}
      {top.name !== 'onboarding' && (
        <TabBar active={activeTab || 'home'}
          onChange={navigate}
          onAdd={() => openAdd('add')} p={p} />
      )}

      {addSheet && (
        <AddChatScreen p={p} mode={addSheet}
          onClose={() => setAddSheet(null)}
          onAdd={(items) => onAddItems(items, addSheet)} />
      )}
      {showCook && (
        <CookScreen p={p} data={liveData} recipeId={showCook}
          navigate={navigate}
          onFinish={() => {
            setShowCook(null);
            const day = (new Date().getDay() + 6) % 7; // mon=0
            setCookedDays(d => d.map((v, i) => i === day ? true : v));
          }} />
      )}

      <TweaksPanel>
        <TweakSection label="Layout" />
        <TweakRadio label="Home" value={t.homeLayout}
          options={[
            { value: 'todaysPick', label: "Today's pick" },
            { value: 'feed', label: 'Feed' },
            { value: 'pantryFirst', label: 'Pantry-first' },
          ]}
          onChange={v => setTweak('homeLayout', v)} />
        <TweakRadio label="Card style" value={t.cardLayout}
          options={['list', 'grid', 'feed']}
          onChange={v => setTweak('cardLayout', v)} />
        <TweakRadio label="Match style" value={t.matchStyle}
          options={[
            { value: 'percent', label: '%' },
            { value: 'dots', label: 'dots' },
            { value: 'missing', label: 'missing' },
          ]}
          onChange={v => setTweak('matchStyle', v)} />
        <TweakSection label="Palette" />
        <TweakRadio label="Theme" value={t.palette}
          options={[
            { value: 'terracotta', label: 'Terra' },
            { value: 'saffron', label: 'Saffron' },
            { value: 'forest', label: 'Forest' },
            { value: 'plum', label: 'Plum' },
          ]}
          onChange={v => setTweak('palette', v)} />
        <TweakSection label="Demo" />
        <TweakButton label="Replay onboarding"
          onClick={() => { setPantry([]); setStack([{ name: 'onboarding' }]); }} />
        <TweakButton label="Open shopping list"
          onClick={() => setStack([{ name: 'shopping' }])} />
        <TweakButton label="Try cook-along"
          onClick={() => setShowCook(data.recipes[0].id)} /></TweaksPanel>
    </div>
  );
}

function guessCatFromName(name) {
  const lower = name.toLowerCase();
  if (['carrot', 'onion', 'spinach', 'lemon', 'cilantro', 'tomato', 'ginger', 'garlic'].some(k => lower.includes(k))) return 'Produce';
  if (['chicken', 'egg', 'tofu', 'beef', 'pork', 'fish'].some(k => lower.includes(k))) return 'Protein';
  if (['rice', 'pasta', 'penne', 'bread', 'tortilla'].some(k => lower.includes(k))) return 'Grains';
  if (['yogurt', 'milk', 'butter', 'cheese', 'parmesan', 'cream'].some(k => lower.includes(k))) return 'Dairy';
  if (['oil', 'sauce', 'vinegar'].some(k => lower.includes(k))) return 'Pantry';
  return 'Pantry';
}

// Shelf-stable items keep their freshness regardless of how long they've sat.
// Everything else added in onboarding is conservatively "use soon" — because if
// it was *already* in the kitchen, it's been there for a while.
const SHELF_STABLE = [
  'rice', 'pasta', 'penne', 'flour', 'sugar', 'oil', 'vinegar', 'soy',
  'salt', 'pepper', 'cumin', 'paprika', 'cinnamon', 'oregano', 'basil',
  'chili', 'spice', 'honey', 'maple', 'can', 'jar', 'chickpea', 'lentil',
  'bean', 'tortilla', 'cracker', 'cereal',
];
function isShelfStable(name) {
  const l = (name || '').toLowerCase();
  return SHELF_STABLE.some(k => l.includes(k));
}
function freshnessFor(name, mode) {
  if (isShelfStable(name)) return 0.98;
  if (mode === 'grocery')   return 0.95;  // just bought — fresh
  if (mode === 'onboarding') return 0.45; // already in your kitchen — use soon
  return 0.85;                            // ad-hoc add
}
function guessLocFromName(name) {
  const lower = (name || '').toLowerCase();
  if (['onion', 'garlic', 'potato', 'tomato', 'rice', 'pasta', 'oil', 'sauce', 'spice', 'flour', 'sugar', 'can', 'cumin', 'paprika', 'salt', 'pepper'].some(k => lower.includes(k))) return 'pantry';
  return 'fridge';
}

// ─────────────────────────────────────────────────────────────
// Mount — full-bleed PWA
// ─────────────────────────────────────────────────────────────
function Mount() {
  // On wide screens (desktop preview), constrain to a phone-shaped viewport
  // so the layout still feels right. On mobile, fill the device.
  const [isWide, setIsWide] = useStateA(typeof window !== 'undefined' && window.innerWidth > 540);
  useEffectA(() => {
    const onResize = () => setIsWide(window.innerWidth > 540);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (isWide) {
    return (
      <div style={{
        width: '100vw', height: '100dvh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#F5EDE2', overflow: 'hidden',
      }}>
        <div style={{
          width: 420, height: 'min(900px, 100dvh)',
          borderRadius: 28, overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)',
          position: 'relative',
        }}>
          <App />
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100dvh', overflow: 'hidden' }}>
      <App />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Mount />);
