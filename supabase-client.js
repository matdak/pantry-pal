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

  // ── Cooked recipes ────────────────────────────────────────────────────
  async function cookCompleted(recipeId) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { data, error } = await sb.from('cooked_recipes')
      .insert({ user_id: user.id, recipe_id: recipeId })
      .select().single();
    if (error) throw error;
    return data;
  }

  async function getCookStats() {
    // total all-time + this week (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [totalRes, weekRes] = await Promise.all([
      sb.from('cooked_recipes').select('id', { count: 'exact', head: true }),
      sb.from('cooked_recipes')
        .select('cooked_at, recipes(cuisine)')
        .gte('cooked_at', weekAgo),
    ]);
    if (totalRes.error) throw totalRes.error;
    if (weekRes.error) throw weekRes.error;

    const cookedDays = [false, false, false, false, false, false, false]; // Mon..Sun
    const cuisines = new Set();
    for (const row of (weekRes.data || [])) {
      const d = new Date(row.cooked_at);
      const idx = (d.getDay() + 6) % 7; // Mon = 0
      cookedDays[idx] = true;
      if (row.recipes?.cuisine) cuisines.add(row.recipes.cuisine);
    }
    return {
      totalCooked: totalRes.count || 0,
      cookedDays,
      cuisinesThisWeek: [...cuisines],
    };
  }

  // ── Mic recording + transcription ─────────────────────────────────────
  function pickMimeType() {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    for (const t of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  // Returns { stop: () => Promise<{ blob, mimeType }>, cancel: () => void }
  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone not supported in this browser');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const mimeType = pickMimeType();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    rec.start();

    const cleanup = () => {
      try { stream.getTracks().forEach(t => t.stop()); } catch {}
    };

    return {
      stop() {
        return new Promise((resolve, reject) => {
          rec.onerror = (e) => { cleanup(); reject(e.error || new Error('recorder error')); };
          rec.onstop = () => {
            cleanup();
            const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
            resolve({ blob, mimeType: rec.mimeType || 'audio/webm' });
          };
          try { rec.stop(); } catch (e) { cleanup(); reject(e); }
        });
      },
      cancel() {
        try { rec.stop(); } catch {}
        cleanup();
      },
    };
  }

  async function transcribe(blob, { languageCode } = {}) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('Not signed in');

    const form = new FormData();
    form.append('file', blob, 'recording.webm');
    if (languageCode) form.append('language_code', languageCode);

    const res = await fetch(`${SUPABASE_URL}/functions/v1/transcribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: SUPABASE_KEY,
      },
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Transcribe ${res.status}: ${text || res.statusText}`);
    }
    const json = await res.json();
    // ElevenLabs returns { text, words, language_code, ... }
    return json;
  }

  // Parse a transcript into pantry items via the alias map.
  // Splits on commas / "and" / "plus", looks up each fragment, captures qty hints.
  function parseTranscript(text) {
    const ensureLoaded = !!_aliasMap;
    if (!ensureLoaded) return [];
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    // Split by separators
    const fragments = cleaned
      .split(/,| and | plus | also /i)
      .map(s => s.trim())
      .filter(Boolean);

    const items = [];
    const seen = new Set();
    for (const frag of fragments) {
      const ing = resolveIngredient(frag);
      if (!ing) continue;
      if (seen.has(ing.id)) continue;
      seen.add(ing.id);

      const qty = extractQuantityHint(frag);
      const looksExpiring = /sad|going off|almost gone|wilting|expired|stale|old/i.test(frag);
      items.push({
        name: ing.name,
        said: frag,
        qty: qty || '',
        tag: looksExpiring ? 'expiring' : undefined,
      });
    }
    return items;
  }

  function extractQuantityHint(s) {
    const t = s.toLowerCase();
    if (/\bhalf( a)?\b/.test(t)) return '~½';
    if (/\ba couple\b/.test(t)) return '~2';
    if (/\ba few\b/.test(t)) return '~3';
    if (/\ba bunch\b/.test(t)) return '~1 bunch';
    if (/\ba bag\b/.test(t)) return '~1 bag';
    if (/\ba can\b/.test(t)) return '~1 can';
    if (/\ba head\b/.test(t)) return '1 head';
    if (/\ba box\b/.test(t)) return '~1 box';
    const num = t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/);
    if (num) {
      const map = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
      return `~${map[num[1]] ?? num[1]}`;
    }
    return '';
  }

  // ── Saved recipes ────────────────────────────────────────────────────
  async function getSavedRecipes() {
    const { data, error } = await sb.from('saved_recipes').select('recipe_id, saved_at').order('saved_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(r => r.recipe_id);
  }

  async function saveRecipe(recipeId) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await sb.from('saved_recipes').insert({ user_id: user.id, recipe_id: recipeId });
    if (error && error.code !== '23505') throw error; // ignore duplicate
  }

  async function unsaveRecipe(recipeId) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await sb.from('saved_recipes').delete().eq('user_id', user.id).eq('recipe_id', recipeId);
    if (error) throw error;
  }

  // ── Shopping list ─────────────────────────────────────────────────────
  async function getShoppingList() {
    const { data, error } = await sb
      .from('shopping_list_items')
      .select('id, ingredient_id, qty, checked, added_at, ingredients(id, name, category)')
      .order('added_at', { ascending: true });
    if (error) throw error;
    return data.map(it => ({
      id: it.id,
      ingredient_id: it.ingredient_id,
      name: it.ingredients?.name || it.ingredient_id,
      cat: it.ingredients?.category || 'Other',
      qty: it.qty,
      checked: it.checked,
    }));
  }

  async function addShoppingItems(ingredientIds) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) throw new Error('Not signed in');
    const rows = ingredientIds.map(id => ({ user_id: user.id, ingredient_id: id }));
    const { error } = await sb.from('shopping_list_items').insert(rows).select();
    if (error) throw error;
    return getShoppingList();
  }

  async function toggleShoppingItem(id, checked) {
    const { error } = await sb.from('shopping_list_items').update({ checked }).eq('id', id);
    if (error) throw error;
  }

  async function removeShoppingItem(id) {
    const { error } = await sb.from('shopping_list_items').delete().eq('id', id);
    if (error) throw error;
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
  async function signInWithGoogle() {
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });
    if (error) throw error;
    return data;
  }
  async function signOut() { await sb.auth.signOut(); }

  function onAuthChange(cb) {
    return sb.auth.onAuthStateChange((_event, session) => cb(session));
  }

  window.PP = {
    sb,
    loadIngredients, resolveIngredient, parseTranscript,
    getRecipes, getPantry, addPantryItems, removePantryItem,
    getProfile, updateProfile,
    cookCompleted, getCookStats,
    getSavedRecipes, saveRecipe, unsaveRecipe,
    getShoppingList, addShoppingItems, toggleShoppingItem, removeShoppingItem,
    startRecording, transcribe,
    signUp, signIn, signInWithGoogle, signOut, onAuthChange,
  };
})();
