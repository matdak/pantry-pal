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
  const [session, setSession] = useStateA(undefined); // undefined=loading, null=signed-out

  useEffectA(() => {
    let mounted = true;
    window.PP.sb.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session ?? null);
    });
    const { data: { subscription } } = window.PP.onAuthChange(s => {
      if (mounted) setSession(s ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  return (
    <div style={{
      width: '100%', height: '100%', background: p.paper, color: p.ink,
      position: 'relative', overflow: 'hidden',
      fontFamily: '"DM Sans", system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
    }}>
      {session === undefined ? <Splash p={p} />
       : session === null ? <AuthScreen p={p} />
       : <AuthedApp p={p} t={t} setTweak={setTweak} session={session} />}

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
        <TweakSection label="Account" />
        <TweakButton label="Sign out" onClick={() => window.PP.signOut()} />
      </TweaksPanel>
    </div>
  );
}

function Splash({ p }) {
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: p.paper,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 999, border: `3px solid ${p.line}`,
        borderTopColor: p.accent, animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

function AuthedApp({ p, t, setTweak, session }) {
  const [pantry, setPantry] = useStateA([]);
  const [recipes, setRecipes] = useStateA([]);
  const [profile, setProfile] = useStateA(null);
  const [loading, setLoading] = useStateA(true);
  const [cookedDays, setCookedDays] = useStateA([false, false, false, false, false, false, false]);
  const [cuisinesThisWeek, setCuisinesThisWeek] = useStateA([]);
  const [totalCooked, setTotalCooked] = useStateA(0);

  // Load profile + recipes + pantry + cook stats on auth
  useEffectA(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        await window.PP.loadIngredients();
        const [r, pn, prof, stats] = await Promise.all([
          window.PP.getRecipes(),
          window.PP.getPantry(),
          window.PP.getProfile(),
          window.PP.getCookStats(),
        ]);
        if (cancelled) return;
        setRecipes(r);
        setPantry(pn);
        setProfile(prof);
        setCookedDays(stats.cookedDays);
        setCuisinesThisWeek(stats.cuisinesThisWeek);
        setTotalCooked(stats.totalCooked);
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session.user.id]);

  // Decide initial route once data loads
  const [stack, setStack] = useStateA([{ name: 'home' }]);
  const [didRouteOnLoad, setDidRouteOnLoad] = useStateA(false);
  useEffectA(() => {
    if (loading || didRouteOnLoad) return;
    if (pantry.length === 0) setStack([{ name: 'onboarding' }]);
    else setStack([{ name: 'home' }]);
    setDidRouteOnLoad(true);
  }, [loading, pantry.length, didRouteOnLoad]);

  const top = stack[stack.length - 1];

  const navigate = (name, arg) => {
    if (name === 'back') {
      setStack(s => s.length > 1 ? s.slice(0, -1) : s);
      return;
    }
    if (['home', 'pantry', 'browse', 'profile'].includes(name)) {
      setStack([{ name }]);
    } else {
      setStack(s => [...s, { name, arg }]);
    }
  };

  const [addSheet, setAddSheet] = useStateA(null);
  const [showCook, setShowCook] = useStateA(null);
  const openAdd = (mode = 'add') => setAddSheet(mode);

  const onAddItems = async (items, mode = 'inventory') => {
    if (!items || items.length === 0) return;
    try {
      const { added, unresolved } = await window.PP.addPantryItems(
        items.map(it => ({ ...it, mode }))
      );
      if (unresolved.length) console.warn('Unresolved ingredients:', unresolved);
      // Re-fetch pantry to get the joined ingredient data shaped correctly
      const pn = await window.PP.getPantry();
      setPantry(pn);
    } catch (err) {
      console.error('addPantryItems failed', err);
    }
  };

  const onRemove = async (id) => {
    setPantry(pp => pp.filter(i => i.id !== id));
    try { await window.PP.removePantryItem(id); }
    catch (err) {
      console.error('removePantryItem failed', err);
      // refetch on error
      const pn = await window.PP.getPantry();
      setPantry(pn);
    }
  };

  const pantryIds = useMemoA(
    () => new Set(pantry.map(i => i.ingredient_id || i.id)),
    [pantry]
  );

  const activeTab = ['home', 'pantry', 'browse', 'profile'].includes(top.name) ? top.name : null;

  // Shape pantry/recipes to match what existing screens expect
  const liveData = useMemoA(() => ({
    user: {
      name: profile?.name || session.user.email?.split('@')[0] || 'there',
      streak: profile?.streak_days ?? 0,
      cookedThisWeek: cookedDays.filter(Boolean).length,
      cuisinesThisWeek,
      totalCooked,
    },
    pantry,
    recipes,
    cuisines: ['All', 'Italian', 'Mexican', 'Thai', 'Middle Eastern', 'Mediterranean', 'Modern', 'Japanese', 'Indian'],
  }), [pantry, recipes, profile, session, cookedDays, cuisinesThisWeek, totalCooked]);

  if (loading) return <Splash p={p} />;

  let screen;
  if (top.name === 'onboarding') {
    screen = <Onboarding p={p}
      initialName={profile?.name || session.user.user_metadata?.name || ''}
      onFinish={async (items, name) => {
        if (name && name !== profile?.name) {
          try {
            const prof = await window.PP.updateProfile({ name });
            setProfile(prof);
          } catch (err) { console.error('updateProfile failed', err); }
        }
        if (items && items.length) await onAddItems(items, 'onboarding');
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
    screen = <ProfileScreen p={p} data={liveData} profile={profile} navigate={navigate}
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
    <>
      <div data-screen-label={`screen-${top.name}`} style={{
        position: 'absolute', left: 0, right: 0,
        top: 'env(safe-area-inset-top)', bottom: 0,
        overflowY: 'auto',
      }}>
        {screen}
      </div>

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
          onFinish={async (recipeId) => {
            const id = recipeId || showCook;
            setShowCook(null);
            // Optimistic local update
            const day = (new Date().getDay() + 6) % 7;
            setCookedDays(d => d.map((v, i) => i === day ? true : v));
            setTotalCooked(n => n + 1);
            const cooked = recipes.find(r => r.id === id);
            if (cooked && !cuisinesThisWeek.includes(cooked.cuisine)) {
              setCuisinesThisWeek(cs => [...cs, cooked.cuisine]);
            }
            // Persist
            try { await window.PP.cookCompleted(id); }
            catch (err) {
              console.error('cookCompleted failed', err);
              // Re-fetch stats on failure to stay consistent
              try {
                const stats = await window.PP.getCookStats();
                setCookedDays(stats.cookedDays);
                setCuisinesThisWeek(stats.cuisinesThisWeek);
                setTotalCooked(stats.totalCooked);
              } catch {}
            }
          }} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Mount — full-bleed PWA
// ─────────────────────────────────────────────────────────────
function Mount() {
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
