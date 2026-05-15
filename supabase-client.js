// supabase-client.js — Pantry Pal Supabase wiring
(function () {
  const SUPABASE_URL = 'https://tzsujrgjnfpnrqvrwxyn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_w6_Dl3hz60TQS6PGBF62vA_3OwQVmR7';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  // ── Ingredient name → id resolver (built lazily from public.ingredients) ──
  let _ingredients = null;
  let _aliasMap = null;
  async function loadIngredients() {
    if (_ingredients) return _ingredients;
    const { data, error } = await sb.from('ingredients').select('*').order('name');
    if (error) throw error;
    _ingredients = data;
    _aliasMap = new Map();
    for (const ing of data) {
      _aliasMap.set(ing.name.toLowerCase(), ing);
      _aliasMap.set(ing.id, ing);
      for (const alias of (ing.aliases || [])) {
        _aliasMap.set(alias.toLowerCase(), ing);
      }
    }
    return data;
  }
  function resolveIngredient(text) {
    if (!_aliasMap) return null;
    const t = String(text || '').toLowerCase().trim();
    if (!t) return null;
    if (_aliasMap.has(t)) return _aliasMap.get(t);
    // fuzzy: any alias as substring of input, or input contains alias word
    for (const [key, ing] of _aliasMap.entries()) {
      if (key.length < 3) continue;
      if (t.includes(key)) return ing;
    }
    return null;
  }

  // ── Recipes ────────────────────────────────────────────────────────────
  async function getRecipes() {
    const { data, error } = await sb
      .from('recipes')
      .select(`
        id, title, blurb, photo, time_minutes, difficulty, cuisine, tags, steps,
        recipe_ingredients ( ingredient_id, amount, optional, position,
          ingredients ( id, name, category, default_location, shelf_stable )
        )
      `)
      .order('created_at', { ascending: true });
    if (error) throw error;
    // Normalize to the shape the UI expects: { id, title, blurb, photo, time, difficulty, cuisine, tags, steps, ingredients }
    return data.map(r => ({
      id: r.id,
      title: r.title,
      blurb: r.blurb,
      photo: r.photo,
      time: r.time_minutes,
      difficulty: r.difficulty,
      cuisine: r.cuisine,
      tags: r.tags || [],
      steps: r.steps,
      ingredients: (r.recipe_ingredients || [])
        .sort((a, b) => a.position - b.position)
        .map(ri => ({
          id: ri.ingredient_id,
          name: ri.ingredients?.name || ri.ingredient_id,
          amt: ri.amount,
          optional: ri.optional,
        })),
      need: (r.recipe_ingredients || []).map(ri => ri.ingredient_id),
    }));
  }

  // ── Pantry (per-user) ──────────────────────────────────────────────────
  async function getPantry() {
    const { data, error } = await sb
      .from('pantry_items')
      .select(`
        id, qty, said, location, expiring, fresh, added_at,
        ingredient_id,
        ingredients ( id, name, category, default_location )
      `)
      .order('added_at', { ascending: false });
    if (error) throw error;
    return data.map(p => ({
      id: p.id,
      ingredient_id: p.ingredient_id,
      name: p.ingredients?.name || p.ingredient_id,
      cat: p.ingredients?.category || 'Other',
      qty: p.qty,
      said: p.said,
      loc: p.location,
      expiring: p.expiring,
      fresh: p.fresh,
      added_at: p.added_at,
      added: timeAgo(p.added_at),
    }));
  }

  async function addPantryItems(items) {
    // items: [{ name, qty, said, tag }] — needs resolution to ingredient_id
    if (!_aliasMap) await loadIngredients();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const rows = [];
    const unresolved = [];
    for (const it of items) {
      const ing = resolveIngredient(it.name);
      if (!ing) { unresolved.push(it.name); continue; }
      const explicitlyExpiring = it.tag === 'expiring';
      const fresh = explicitlyExpiring ? 0.3 : freshnessFor(ing, it.mode);
      rows.push({
        user_id: user.id,
        ingredient_id: ing.id,
        qty: it.qty || '',
        said: it.said || '',
        location: ing.default_location,
        expiring: explicitlyExpiring || fresh < 0.45,
        fresh,
      });
    }
    if (rows.length === 0) return { added: [], unresolved };
    const { data, error } = await sb.from('pantry_items').insert(rows).select(`
      id, qty, said, location, expiring, fresh, added_at, ingredient_id,
      ingredients ( id, name, category, default_location )
    `);
    if (error) throw error;
    return { added: data, unresolved };
  }

  async function removePantryItem(id) {
    const { error } = await sb.from('pantry_items').delete().eq('id', id);
    if (error) throw error;
  }

  function freshnessFor(ing, mode) {
    if (ing.shelf_stable) return 0.98;
    if (mode === 'grocery') return 0.95;
    if (mode === 'onboarding') return 0.45;
    return 0.85;
  }

  function timeAgo(ts) {
    const d = (Date.now() - new Date(ts).getTime()) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    const days = Math.floor(d / 86400);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  }

  // ── Profile ────────────────────────────────────────────────────────────
  async function getProfile() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;
    const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function updateProfile(patch) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { data, error } = await sb.from('profiles').update(patch).eq('id', user.id).select().single();
    if (error) throw error;
    return data;
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  async function signUp(email, password, name) {
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name } },
    });
    if (error) throw error;
    return data;
  }
  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  async function signOut() { await sb.auth.signOut(); }

  function onAuthChange(cb) {
    return sb.auth.onAuthStateChange((_event, session) => cb(session));
  }

  window.PP = {
    sb,
    loadIngredients, resolveIngredient,
    getRecipes, getPantry, addPantryItems, removePantryItem,
    getProfile, updateProfile,
    signUp, signIn, signOut, onAuthChange,
  };
})();
