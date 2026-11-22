# Live Progress & Multi-LLM Handoff Log

> **INSTRUCTIONS FOR ANY LLM OPENING THIS REPO:**
> 1. Read **`PROGRESS.md` (this file)** from top to bottom first.
> 2. Read **[`PLAN.md`](./PLAN.md)** for the full game vision, architecture, and exact contracts.
> 3. Follow the **"Exact Next Steps"** section below without duplicating or breaking already-built modules.
> 4. Always update **`PROGRESS.md`** with completed steps, new files, verification results, and next steps before finishing your session.

---

## 1. Current Status Dashboard

| Field | Value |
|---|---|
| **Project** | **Boo-Ville: The Silly Spooky Night!** (Kids under 10 interactive Halloween world) |
| **Repository** | `https://github.com/LucmanAly/Halloween` |
| **Live GitHub Pages URL** | `https://lucmanaly.github.io/Halloween/` |
| **Local Workspace Path** | `C:\Users\zohan\.gemini\antigravity\scratch\Halloween` |
| **Completed Phase** | **Phase 1 — Foundation, Docs & Living Courtyard** |
| **Next Phase & Step** | **Phase 2 — Step 2.1: Generate Expressive Neural Character Voices (`scripts/generate_voices.py`)** |
| **Environment** | Windows · Node `v24.18.0` · npm `11.16.0` · Python `3.14.1` · `gh` CLI (`LucmanAly`) |
| **Last Updated** | `2026-11-22` |

---

## 2. Phase Roadmap Checklist

- [x] **Phase 1 — Foundation, Docs & Living Courtyard** *(Completed)*
  - [x] Clone repo (`LucmanAly/Halloween`) and configure `.gitignore`
  - [x] Scaffold Vite 6 (`6.4.6`) + strict TypeScript 5 (`5.9.3`) (`package.json`, `tsconfig.json`, `vite.config.ts`)
  - [x] Add GitHub Pages CI/CD workflow (`.github/workflows/deploy.yml`)
  - [x] Create `PLAN.md`, `PROGRESS.md`, and `README.md`
  - [x] Build `src/core/` (`eventBus.ts`, `state.ts`, `audioEngine.ts`) & `src/creatures/types.ts`
  - [x] Build `src/world/` (`secretsCatalog.ts`, `courtyardSvg.ts`, `particleCanvas.ts`, `secretsController.ts`, `worldEvents.ts`)
  - [x] Build `index.html`, `src/styles/` (`tokens.css`, `layout.css`, `scene.css`), `src/ui/` (`welcomeCurtain.ts`, `hud.ts`, `settingsDialog.ts`), and `src/main.ts`
  - [x] Verify `npm run typecheck`, `npm run build`, local preview under `/Halloween/`, and 10/10 secret ID sync
  - [x] Ready for GitHub push & Pages workflow deployment

- [ ] **Phase 2 — Real Neural Voices, Lip-Sync & 6 Living Creatures** *(START HERE)*
  - [ ] Step 2.1: Create `scripts/generate_voices.py` (`edge-tts`) & generate 60–80 `.mp3` clips + `public/audio/voices/manifest.json`
  - [ ] Step 2.2: Build `src/creatures/voiceManager.ts` bridging `manifest.json` + `audioEngine.playVoiceBuffer()` + lip-sync frames
  - [ ] Step 2.3: Build `src/creatures/creatureRig.ts` & `src/creatures/creatureRoster.ts` (all 6 SVG rigged creatures inside `#creature-stage-layer`)
  - [ ] Step 2.4: Build `src/creatures/banterDirector.ts` (autonomous roaming, cursor eye-tracking, tap gags, 2-line banter)
  - [ ] Step 2.5: Wire Phase 2 into `src/main.ts`, verify build + browser audio/lip-sync, update `PROGRESS.md`, push & verify live Pages

- [ ] **Phase 3 — 4 Interactive Mini-Activities**
  - [ ] Step 3.1: Winnie's Wacky Cauldron + Spell Book (`src/activities/cauldronGame.ts`)
  - [ ] Step 3.2: Flashlight Hide-and-Seek (`src/activities/flashlightGame.ts`)
  - [ ] Step 3.3: Knock-Knock Trick-or-Treat & Candy Catcher (`src/activities/trickOrTreatGame.ts`)
  - [ ] Step 3.4: Silly Dress-Up & Monster Dance Party (`src/activities/dressUpParty.ts`)

- [ ] **Phase 4 — Kid-Testing Polish & Final Launch Check**
  - [ ] Responsive touch-target & iPad/phone viewport pass
  - [ ] Audio asset preloading & graceful fallback polish
  - [ ] Final full live verification on `https://lucmanaly.github.io/Halloween/`

---

## 3. Completed Phase 1 File Inventory

| File | Responsibility | Key Exports / Contracts |
|---|---|---|
| `PLAN.md` | Full product, cast, voice, world, mini-game, and tech blueprint | Reference doc |
| `PROGRESS.md` | Live status, exact next steps, handoff notes | Reference doc |
| `README.md` | Repo quickstart & live URL | Reference doc |
| `vite.config.ts` | Uses `/Halloween/` on `build` & `preview`, `/` on `dev` | `defineConfig(({ command, isPreview }) => ...)` |
| `.github/workflows/deploy.yml` | Builds `dist/` with Node 22 and deploys to GitHub Pages | Workflow `Deploy to GitHub Pages` |
| `index.html` | Semantic HTML5 shell, HUD, `#welcome-curtain`, `#game-stage`, native `<dialog id="settings-dialog">` | DOM landmarks & IDs |
| `public/favicon.svg` | Smiling jack-o'-lantern browser icon | Referenced via `./favicon.svg` |
| `public/audio/voices/README.md` | Placeholder guide for Phase 2 voice pack | Directory marker |
| `src/styles/tokens.css` | Color palette, rounded display typography, shadows, z-layers | CSS custom properties |
| `src/styles/layout.css` | `100dvh` stage, floating HUD, speech bubbles, welcome curtain, `<dialog>` styles | Responsive UI styles |
| `src/styles/scene.css` | Courtyard SVG animations, `.secret-target` bounce, reduced motion support | Courtyard keyframes |
| `src/core/eventBus.ts` | Strongly typed pub/sub event bus | `eventBus`, `GameEvents` |
| `src/core/state.ts` | Persistent `localStorage` state (`booville_save_v1`) | `gameState`, `SaveState` |
| `src/core/audioEngine.ts` | Web Audio music loop, 13 kid SFX, and Phase 2 `AnalyserNode` voice player | `audioEngine` (`playVoiceBuffer`, `getVoiceAmplitude`) |
| `src/creatures/types.ts` | Phase 2 creature, voice manifest, and lip-sync TypeScript interfaces | `CreatureId`, `MouthShape`, `VoiceManifest`, `CreatureConfig`, `CreatureInstance` |
| `src/world/secretsCatalog.ts` | Single source of truth for the 10 courtyard secrets | `SECRETS_CATALOG`, `TOTAL_SECRETS` |
| `src/world/courtyardSvg.ts` | Layered interactive SVG courtyard (`1600×900`) + `#creature-stage-layer` + `#cauldron-anchor` | `createCourtyardSvg()` |
| `src/world/particleCanvas.ts` | 60fps fireflies, autumn leaves, cauldron/poppable bubbles, shooting stars, bursts | `ParticleCanvas` (`tryPopAt`, `spawnBurst`, `spawnBubbleStorm`, `spawnShootingStars`) |
| `src/world/secretsController.ts` | Handles `[data-secret]` taps, keyboard triggers, and canvas bubble popping | `SecretsController` |
| `src/world/worldEvents.ts` | Periodic surprise director (Bubble Storm, Candy Cart, Shooting Stars, Bat Flock) | `WorldEventsDirector` |
| `src/ui/welcomeCurtain.ts` | Audio-unlocking welcome screen (`Tap to Play!`) | `initWelcomeCurtain()` |
| `src/ui/hud.ts` | Top candy/secrets (`X / 10`), sound mute, `🪄 Surprise!`, and settings triggers | `initHud()` |
| `src/ui/settingsDialog.ts` | Native `<dialog>` volume sliders, age mode, reduced motion, 2-step reset | `initSettingsDialog()` |
| `src/main.ts` | Wires core, world, clamped speech bubbles, and UI layers | `bootstrap()` |

---

## 4. Exact Next Steps for the Next LLM (Phase 2 Kickoff)

> Start directly here! Do **not** rebuild `audioEngine`, `eventBus`, `state`, or `courtyardSvg` — extend via the mount points below.

### Step 2.1 — Generate Expressive Character Voice Assets
1. Install `edge-tts` in a local Python environment (`python -m pip install edge-tts`).
2. Create **`scripts/generate_voices.py`** to synthesize 10–12 short expressive lines for each of the 6 creatures defined in `PLAN.md` Section 2 (`pip`, `boobell`, `winnie`, `barnaby`, `frankie`, `bitey`):
   - Categories: `greeting`, `tap_gag`, `banter_a`, `banter_b`, `world_react`, and `hint` (Phase 3 ready).
   - Export MP3 clips to `public/audio/voices/<creatureId>/<lineId>.mp3`.
   - Export `public/audio/voices/manifest.json` matching the `VoiceManifest` interface already defined in `src/creatures/types.ts`.
3. Keep total audio payload lean (~2–4 MB) so GitHub Pages loads smoothly on phones & tablets.

### Step 2.2 — Voice Manager & Real-Time Lip-Sync Engine
1. Create **`src/creatures/voiceManager.ts`**:
   - Fetch `${import.meta.env.BASE_URL}audio/voices/manifest.json` once after entry (never omit `BASE_URL`).
   - Expose `speak(creatureId, lineOrCategory, onMouthFrame)` that picks a line (avoiding immediate repeats), calls `audioEngine.playVoiceBuffer(url, onMouthFrame)`, emits `'world:speech'` & `'creature:speak'` on `eventBus`, and queues or gates overlapping speech politely.
   - Map live `amplitude` (`0..1`) to `MouthShape`:
     - `< 0.05` -> `'closed'`
     - `0.05..0.18` -> `'small'`
     - `0.18..0.38` -> `'open'`
     - `> 0.38` -> `'wide'`

### Step 2.3 — Rigged SVG Creatures
1. Create **`src/creatures/creatureRoster.ts`** with spawn coordinates, walk/float bands, palette, and personality hooks for `pip`, `boobell`, `winnie`, `barnaby`, `frankie`, and `bitey`.
2. Create **`src/creatures/creatureRig.ts`**:
   - Build layered `<g class="creature" data-creature="<id>" role="button" tabindex="0">` SVG groups implementing `CreatureInstance` (`src/creatures/types.ts`).
   - Put positioning `transform="translate(x, y)"` on the outer root `<g>` and animate bounce/squash on an inner `<g>` so CSS animations never clobber position transforms (same pattern used in `courtyardSvg.ts`).
   - Include `.creature-eyes` + `.creature-pupil` (tracks pointer), `.creature-mouth` (5 shapes), and `.creature-hat-slot` (for Phase 3 dress-up).
   - Mount all 6 creatures into **`#creature-stage-layer`** inside `.courtyard-svg`.

### Step 2.4 — Autonomous Roaming, Tap Gags & Banter
1. Create **`src/creatures/banterDirector.ts`**:
   - 60fps `requestAnimationFrame` wandering on the yard path (`y: 625..755`) for walkers (`pip`, `winnie`, `barnaby`, `frankie`) and sky/air arcs (`y: 230..480`) for flyers (`boobell`, `bitey`).
   - Gentle crowd-separation steering so creatures don't overlap.
   - Tapping any creature triggers its signature gag animation + real voice clip with lip-sync + `+2` Magic Candy.
   - Idle banter loop every ~22–35s pairs two creatures for a quick 2-line voiced conversation.

### Step 2.5 — Integrate, Verify & Deploy Phase 2
1. Wire `VoiceManager` + `BanterDirector` in `src/main.ts` after Welcome Curtain unlock.
2. Run `npm run typecheck && npm run build` and test locally with `npm run preview`.
3. Update `PROGRESS.md` (mark Phase 2 complete, record new files, prep Phase 3 Step 3.1), commit, push to `main`, and verify live GitHub Pages.

---

## 5. Critical Contracts & Gotchas (Read Before Coding)

1. **`import.meta.env.BASE_URL` for ALL static assets:** Production deploys under `/Halloween/`, while `npm run dev` runs at `/`. Always build runtime asset URLs with `${import.meta.env.BASE_URL}...`.
2. **Never set `pointer-events: auto` on `#particle-canvas`:** Keeping `pointer-events: none` ensures every SVG creature and prop remains clickable while stage `pointerdown` pops floating bubbles via `particleCanvas.tryPopAt()`.
3. **Wrap SVG positioning transforms separately:** Never apply CSS `transform` animations directly onto an SVG element that carries `transform="translate(...)"` — put animations on an inner `<g>` so CSS does not override the SVG translation.
4. **Mount creatures inside `#creature-stage-layer`:** `courtyardSvg.ts` places `<g id="creature-stage-layer">` between the Manor/Cauldron midground and Foreground Pumpkin/Bushes so roaming creatures layer naturally.
5. **Single source of truth for Secrets:** `src/world/secretsCatalog.ts` (`10` IDs) must stay synced with `[data-secret-id]` elements in `src/world/courtyardSvg.ts`.

---

## 6. Verification & Session Log

| Timestamp | Phase | Summary & Verification Results |
|---|---|---|
| `2026-11-22` | Phase 1 Complete | Cloned `LucmanAly/Halloween`, wrote `PLAN.md`/`PROGRESS.md`/`README.md`, built Vite + TS living courtyard (`17` modules), `npm run typecheck` exited `0`, `npm run build` emitted `dist/` (`index.html`, `index-BjfSjy0U.css`, `index-IFY3XWJV.js`), `vite preview` verified HTTP 200 & correct MIME types under `/Halloween/`, and `10/10` secret IDs verified in sync. |
