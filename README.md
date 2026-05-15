# Pantry Pal

A voice-first pantry tracker that turns what you have into what you can cook. Built as a mobile PWA in a single weekend.

**Live demo → [pantry-pal-omega-roan.vercel.app](https://pantry-pal-omega-roan.vercel.app)**
*(Best experienced on iOS Safari — add to home screen for the full PWA feel)*

---

## What it does

1. **Talk through your kitchen.** Onboarding prompts you to open a drawer and narrate what's in it. ElevenLabs transcribes the audio, a parser resolves aliases and extracts quantities, and items land in your pantry in real time.
2. **See what you can cook.** Browse 112 globally-seeded recipes. Each shows a live match percentage based on your pantry contents. Filter by cuisine or ingredient overlap.
3. **Track the habit.** A home screen surfaces today's pick (highest-match recipe), a 7-day cooking streak, and a variety meter across cuisines cooked this week.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Babel Standalone | No build step — iterate directly in JSX files, fast on mobile previews |
| Auth | Supabase Auth (Google OAuth + email) | Zero-config, handles refresh tokens and session persistence |
| Database | Supabase Postgres + RLS | Row-level security enforces per-user data isolation at the DB layer |
| Voice | ElevenLabs `scribe_v1` + MediaRecorder API | Best accuracy/latency for natural pantry narration; API key proxied through Supabase Edge Function |
| Secrets | Supabase Vault + `SECURITY DEFINER` RPC | Edge functions never touch env vars directly; key retrieved via a signed DB call |
| Hosting | Vercel (static, auto-deploy from main) | Cold start irrelevant for a static PWA |

---

## Architecture

```
Browser (PWA)
  ├── index.html          — shell, global CSS, script loading order
  ├── app.jsx             — auth gate, route stack, top-level state
  ├── screens-main.jsx    — Home, Pantry, Onboarding, AddChat, voice UX
  ├── screens-detail.jsx  — Browse (lazy-load), Recipe detail, Cook flow
  ├── components.jsx      — TabBar, Icon system, shared primitives
  ├── auth-screen.jsx     — Sign in / Create account
  ├── supabase-client.js  — DB queries, startRecording(), transcribe(), parseTranscript()
  └── data.js             — alias map, ingredient categories, static seed helpers

Supabase
  ├── Auth                — sessions, Google OAuth
  ├── DB Tables           — users, pantry_items, recipes, recipe_ingredients,
  │                         ingredients, cooked_recipes, shopping_list_items
  ├── RLS Policies        — users can only see/write their own rows
  ├── Edge Function       — /transcribe (proxies ElevenLabs, reads key from Vault)
  └── Vault               — elevenlabs_api_key stored as encrypted secret
```

---

## Interesting problems

**Natural language → structured pantry**

`parseTranscript()` in `supabase-client.js` handles a lot of messiness:
- Alias resolution: "eggs" → `egg`, "mozz" → `mozzarella`, "evo" → `olive-oil`
- Quantity extraction from inline hints: "half a cup of flour", "3 chicken breasts"
- Expiry detection: "that yogurt that's almost gone" sets `tag: 'expiring'`
- Splitting on "and", "+", commas, with exceptions for ingredient names that contain those words

**Secure API key proxying without a backend**

ElevenLabs requires a server-side call so the key never hits the browser. The flow:
1. Browser calls Supabase Edge Function `/transcribe` with the audio blob + the user's JWT
2. Edge function verifies the JWT, then calls `public.get_elevenlabs_key()` — a `SECURITY DEFINER` RPC that reads from the Vault schema (which edge functions can't access directly)
3. Edge function forwards the blob to ElevenLabs and returns the transcript

**Recipe matching at query time**

Rather than a materialized match score, the Browse screen computes overlap on the fly:
```sql
SELECT r.*, 
  COUNT(ri.ingredient_id) FILTER (WHERE ri.ingredient_id = ANY($pantryIds)) AS matched,
  COUNT(ri.ingredient_id) AS total
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
GROUP BY r.id
```
This keeps the data model simple and the scores always fresh.

**Lazy-loading 112 recipes without a build step**

No virtual list library — just an `IntersectionObserver` on a sentinel div at the bottom. When it enters the viewport, `page` increments and the visible slice grows by 20. Works down to iOS Safari 12.

---

## Running locally

```bash
# Install the one dev dependency (local static server)
npm install

# Start the server
npm start          # → http://localhost:3456

# No build step. Edit any .jsx file and reload.
```

Supabase and ElevenLabs credentials are not included. You'll need:
- A Supabase project with the schema from `all-recipes.sql` / `all-ingredients.sql`
- The `transcribe` Edge Function deployed (`supabase functions deploy transcribe`)
- An ElevenLabs API key stored in Supabase Vault as `elevenlabs_api_key`
- A `supabase-client.js` pointing at your project URL + anon key

---

## What I'd do next

- **Grocery list → cook mode flow**: tap a recipe, generate a shopping diff against current pantry, check off items as you cook
- **Expiry tracking with push notifications**: items tagged `expiring` surface in a daily digest
- **Receipt OCR**: same ElevenLabs pipeline but with an image capture endpoint — point your camera at a grocery receipt
- **Swap the no-build approach for Vite**: Babel standalone is fast to prototype with but TypeScript and tree-shaking would matter at scale
