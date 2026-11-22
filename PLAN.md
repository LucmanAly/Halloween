# Boo-Ville: The Silly Spooky Night! — Master Plan & Architecture

> **Purpose of this document:** This is the complete product, gameplay, audio, visual, and technical blueprint for **Boo-Ville**. Any developer or LLM picking up this repository should read [`PROGRESS.md`](./PROGRESS.md) first to see the live step, then use this `PLAN.md` as the source of truth for all design and engineering decisions.

---

## 1. Vision & Core Concept

**Boo-Ville: The Silly Spooky Night!** is a living, animated, touch-first Halloween courtyard built specifically for **kids under 10 (ages 4–9)** and deployed statically on **GitHub Pages** (`https://lucmanaly.github.io/Halloween/`).

Instead of static menus or text-heavy screens, opening Boo-Ville drops children straight into an illustrated twilight courtyard alive with fireflies, floating bubbles, a glowing cauldron, tappable secrets, periodic surprise events, and (in Phase 2+) **6 expressive talking Halloween creatures** with real neural character voices and live animated lip-sync.

### Kid-First Design Pillars
1. **Silly-Spooky, Never Scary:** Warm twilight purples, golden jack-o'-lantern glows, bouncy squash-and-stretch animations, googly eyes, and goofy jokes — zero gore, zero jump scares, zero dark horror.
2. **Zero Harsh "Game Over":** Mistakes produce funny animations and giggles (e.g., catching a smelly sock instead of candy makes the character laugh *"Ewww, stinky!"* instead of punishing the player).
3. **Zero Reading Required:** Every mechanic is driven by big friendly visuals, comic emojis, glowing visual cues, and spoken character voices so a 4-year-old can play independently while a 9-year-old still enjoys collecting secrets, mixing spells, and unlocking costumes.
4. **Instant Tactile Delight (<50 ms):** Every tap anywhere meaningful produces immediate animation, sound, and sparkles.
5. **Age & Comfort Modes:** Settings include an **Easy (3–6)** vs **Playful (6–9)** mode toggle, independent **Music** and **Sounds & Voices** volume sliders, a **Reduced Motion** switch, and a 2-step parent-safe **Reset Progress** guard.

---

## 2. The Cast & Voice Bible (Phase 2)

All 6 creatures live inside the SVG courtyard (`#creature-stage-layer`), follow the pointer/finger with their eyes, animate their mouths in real time during voice playback, and carry an accessory slot for Phase 3 dress-up items.

| ID | Name | Visual Silhouette & Rig Parts | Personality & Tap Gag | Voice Style & Neural TTS Plan | Sample Spoken Lines |
|---|---|---|---|---|---|
| `pip` | **Pip the Pumpkin** | Round glowing orange jack-o'-lantern kid with green curly stem, stick legs, expressive eyes, 5-shape mouth, top hat slot | Cheerful bouncy host who loves candy corn & telling goofy puns | Bright, cheerful cartoon-kid voice (`en-US-AnaNeural` or pitched `en-US-JustinNeural` / cheerful child tone) | *"Hiya friend! Welcome to Boo-Ville!"*, *"Knock knock! Who's there? Boo! Don't cry, haha!"* |
| `boobell` | **Boo-Bell the Ghost** | Soft glowing mint-white teardrop ghost with rosy cheeks, sparkly bow, floating tail, eyes, 5-shape mouth | Shy-giggly floater who turns semi-transparent and pops out yelling *"Booo! Hehe!"* | Airy, playful giggly voice + gentle echo/reverb (`en-US-JennyNeural` slightly bright + soft chorus/echo) | *"Peek-a-boo! Hehe, did I tickle you?"*, *"Ooh, look at those rainbow bubbles!"* |
| `winnie` | **Winnie the Giggle-Witch** | Cozy purple-cloak kid witch with oversized crooked starry hat, freckles, round glasses, eyes, 5-shape mouth | Enthusiastic potion brewer hovering near the cauldron | Warm, theatrical story-witch voice (`en-GB-MaisieNeural` or `en-US-AriaNeural` expressive) | *"Double bubble, giggles and trouble!"*, *"Ooh! Let's brew something wacky!"* |
| `barnaby` | **Barnaby the Skeleton** | Friendly rounded-bone skeleton with big grin, striped scarf, eyes, clicking jaw mouth | When tapped, topples playfully into a rattling bone pile, then snaps back playing his ribs like a xylophone | Goofy, dramatic cartoon voice + crisp wooden marimba clack SFX (`en-US-GuyNeural` / `en-US-ChristopherNeural` cheerful pitch) | *"Oh my funny bones!"*, *"Check out this spooky rib solo!"* |
| `frankie` | **Frankie the Gentle Monster** | Chunky pastel-green marshmallow-hearted gentle giant with tiny golden bolts, goofy hair tuft, eyes, 5-shape mouth | Loves flowers, dancing, and sharing candy; gives big gentle stomps that launch confetti | Deep, slow, warm goofy giant voice (`en-US-DavisNeural` / `en-US-SteffanNeural` pitched gently down) | *"Frankie like candy! Yum yum!"*, *"Ooh! Dancing time! Stomp stomp!"* |
| `bitey` | **Bitey the Tiny Bat** | Chubby plum-purple bat with big floppy ears, tiny cute fangs, flapping wings, eyes, 5-shape mouth | Swoops across the upper courtyard and hangs upside-down from tree branches dropping sparkly stars | Fast, chirpy, enthusiastic squeaky sidekick (`en-US-AnaNeural` slightly sped up / pitch-lifted) | *"Eee-hee! Upside-down looks funny!"*, *"Catch a sparkly star!"* |

### How "Real-Looking & Real-Sounding" Voices Work on GitHub Pages
Because Boo-Ville runs **100% statically on GitHub Pages** with zero API keys or servers:
1. **Offline Build-Time Neural TTS Generation (`scripts/generate_voices.py`):**
   - Uses Python + **`edge-tts`** (free Microsoft neural voices, no API key needed during build) plus lightweight audio shaping (`ffmpeg` / `pydub` if available, or clean rate/pitch SSML + subtle reverb) to generate **60–80 crisp short `.mp3` voice clips** (~2–3 MB total) into `public/audio/voices/<creatureId>/<lineId>.mp3`.
   - Emits `public/audio/voices/manifest.json` mapping `{ creatureId, lineId, category, text, file, durationMs }` so captions, lip-sync, and mini-games stay perfectly synchronized.
   - This guarantees identical studio-clear expressive voices across **iPad Safari, Android Chrome, macOS, and Windows** (unlike `window.speechSynthesis`, which sounds robotic and breaks on mobile browsers).
2. **Real-Time 60fps Animated Lip-Sync (`AudioEngine` + `CreatureRig`):**
   - `src/core/audioEngine.ts` routes all voice buffers through `voiceGain -> voiceAnalyser (AnalyserNode, fftSize = 256)`.
   - `audioEngine.playVoiceBuffer(url, onFrame)` calls `onFrame(amplitude)` on every animation frame (`0..1` normalized RMS).
   - Each creature maps `amplitude` to 5 SVG mouth shapes (`closed` -> `small` -> `open` -> `wide`, plus `smile` when idle) combined with slight cheek squash/bounce, blinking eyes, and cursor-tracking pupils.
3. **Autonomous Creature Banter:**
   - Every ~22–35 seconds when idle in the courtyard, two nearby creatures exchange a short 2-line voiced conversation (e.g., Pip tells a joke -> Barnaby laughs and rattles).

---

## 3. Living Courtyard & Tappable Secrets (Phase 1)

Even before touching anything, Boo-Ville feels alive at 60fps:

### Visual Layers (`src/world/courtyardSvg.ts`)
- Responsive full-bleed SVG (`viewBox="0 0 1600 900"`, `preserveAspectRatio="xMidYMid slice"`).
- **Safe Interactive Bounds:** All tappable elements sit inside `x: 160..1440`, `y: 90..820` so tall phones and wide monitors never crop out an interactive prop.
- **Layers (bottom to top):**
  1. **Twilight Sky & Moon:** Gradient night sky, twinkling stars, drifting clouds, and the interactive **Smiling Moon** (`moon`).
  2. **Rolling Hills & Silhouettes:** Distant crooked pines and tiny ambient bat silhouettes.
  3. **Haunted Manor & Landmarks:**
     - Cozy crooked manor with puffing chimney, 2 peeking windows (`window-left`, `window-right`), and the Trick-or-Treat front door (`manor-door`).
     - Musical Graveyard Fence (`musical-fence`: 5 tuned marimba pickets playing D4-F4-G4-A4-C5).
     - Winnie's Bubbling Cauldron Nook (`cauldron`).
     - Whispering Crooked Tree with swaying Lantern (`lantern`) and drop-down Friendly Spider (`spider`).
  4. **`#creature-stage-layer`:** Dedicated empty `<g>` mount layer reserved for Phase 2's 6 roaming creatures, plus `#candy-cart-group` for the Runaway Candy Cart world event and `#bat-flock-group` for the Playful Bat Flock event.
  5. **Foreground Props:** Glowing Pumpkin Patch (`pumpkin-patch`), Left & Right Mystery Bushes with blinking eyes (`mystery-bushes`), and Dancing Tombstone (`tombstone`).

### Exact 10 Discoverable Secrets (`SECRETS_CATALOG`)
1. `moon` — Smiling Moon (*Yawns, winks & sparkles*)
2. `window-left` — Left Manor Window (*Friendly black cat pops up: "Meow! Boo!"*)
3. `window-right` — Right Manor Window (*Googly peeking eyes blink & giggle*)
4. `manor-door` — Haunted Front Door (*3 wooden knocks + "Knock knock! Who's there?"*)
5. `musical-fence` — Musical Fence (*5 xylophone/marimba pickets play notes on every tap*)
6. `cauldron` — Bubbling Cauldron (*Rainbow splash + extra bubbles*)
7. `lantern` — Tree Lantern (*Swings brightly & rings warm chime*)
8. `spider` — Friendly Spider (*Drops down on silk thread & waves "Hi friend!"*)
9. `pumpkin-patch` — Pumpkin Patch (*Three jack-o'-lanterns bounce & boing*)
10. `mystery-bushes` — Mystery Bushes (*Both left & right bushes rustle, reveal glowing eyes & giggle*)
*(Bonus prop `tombstone` also animates & pops a silly skull rattle; either `tombstone` or `mystery-bushes` groups cleanly — exact 10 tracked catalog IDs are defined once in `src/world/secretsCatalog.ts` so UI `X / 10` never drifts.)*

### 60fps Canvas Particle Layer (`src/world/particleCanvas.ts`)
- Fullscreen `<canvas>` layered above the SVG with **`pointer-events: none`** so SVG taps pass directly through.
- Renders glowing fireflies, drifting autumn leaves, continuous cauldron bubbles, poppable iridescent rainbow bubbles (`tryPopAt(clientX, clientY)` with generous kid touch padding), shooting stars, pointer sparkle trails, and celebration confetti bursts.

### Autonomous World Events (`src/world/worldEvents.ts`)
Triggered automatically on a gentle timer (first surprise ~8s after entering Boo-Ville, then every 18–26s) or immediately via the HUD **Surprise (`🪄`)** button:
1. **Cauldron Bubble Storm:** Launches 12 huge rainbow poppable bubbles out of the cauldron.
2. **Runaway Candy Cart:** Rolls an animated glowing wooden cart across the yard path; tapping it showers bonus Magic Candy.
3. **Shooting Star Shower:** Streaks 5 golden wishing stars across the night sky.
4. **Playful Bat Flock:** Swoops a cheerful pack of tiny cartoon bats across the moon with chirpy squeaks.

---

## 4. The 4 Mini-Activities (Phase 3)

Tapping glowing courtyard landmarks (or a clean bottom activity dock) opens 4 fast, replayable mini-activities right on top of the courtyard:

1. **🧪 Winnie's Wacky Cauldron (`src/activities/cauldronGame.ts`)**
   - *Trigger:* Tap the Cauldron (`data-secret="cauldron"` activity button) or potion dock icon.
   - *Gameplay:* Drag or tap 3 silly ingredients (*Moon Cheese, Giggle Berries, Glow Worms, Candy Corn, Rainbow Slime*) into the pot, stir in circles, watch Winnie celebrate, and trigger one of 8 wacky full-screen visual spells (Bubble Explosion, Floating Stars, Rainbow Fireworks, Frog Hop, Silly Hiccup Bubbles, etc.). Saves discovered recipes into `potionsDiscovered` in `localStorage`.
2. **🔦 Flashlight Hide-and-Seek (`src/activities/flashlightGame.ts`)**
   - *Trigger:* Flashlight dock button.
   - *Gameplay:* Courtyard dims behind a soft Canvas radial spotlight mask following the finger/mouse. All 6 creatures hide around props and call out **voiced hot/cold hints** (*"Psst! I'm near the glowing pumpkins!"*) that grow louder or faster as the beam gets closer. Shine light on a creature to pop them out with confetti!
3. **🚪 Knock-Knock Trick-or-Treat (`src/activities/trickOrTreatGame.ts`)**
   - *Trigger:* Manor Door (`manor-door`) activity mode.
   - *Gameplay:* Tap door to knock (`knock-knock!`), hear a voiced silhouette clue from inside, guess/tap to swing the door open for a surprise visitor, then tilt/drag a pumpkin bucket left & right to catch bouncing Magic Candy while dodging silly flying socks and broccoli (funny *"Ewww!"* giggle on hit, zero lives lost).
4. **🎩 Silly Dress-Up & Monster Dance Party (`src/activities/dressUpParty.ts`)**
   - *Trigger:* Wardrobe / Disco dock button.
   - *Gameplay:* Spend Magic Candy to unlock silly hats, star glasses, capes, and bowties and snap them onto any of the 6 creatures (`equippedCostumes`). Tap **Dance Party!** to lower a glowing jack-o'-lantern disco ball, kick up upbeat party music, sync all 6 creatures dancing, and turn each creature into a playable musical voice/instrument pad when tapped!

---

## 5. Technical Architecture & Module Contracts

### Repository Structure
```text
Halloween/
├── .github/workflows/deploy.yml   # GitHub Actions CI -> GitHub Pages
├── PLAN.md                        # Master blueprint (this file)
├── PROGRESS.md                    # Live status & multi-LLM handoff checklist
├── README.md                      # Quick overview & local commands
├── index.html                     # Semantic HTML5 shell + native <dialog>
├── package.json                   # Vite 6 + TypeScript 5 (zero runtime deps)
├── tsconfig.json                  # Strict ES2022 TypeScript config
├── vite.config.ts                 # Dynamic base: '/Halloween/' on build & preview
├── public/
│   ├── favicon.svg
│   └── audio/voices/              # Phase 2 neural .mp3 files + manifest.json
├── scripts/
│   └── generate_voices.py         # Phase 2 Python edge-tts asset builder
└── src/
    ├── main.ts                    # App bootstrap & UI wiring
    ├── styles/
    │   ├── tokens.css             # Palette, radii, shadows, fluid spacing
    │   ├── layout.css             # 100dvh full-bleed stage, HUD, dialog, curtain
    │   └── scene.css              # Courtyard SVG keyframes & speech bubbles
    ├── core/
    │   ├── eventBus.ts            # Typed pub/sub event bus
    │   ├── state.ts               # localStorage save schema (`booville_save_v1`)
    │   └── audioEngine.ts         # Web Audio music, SFX & AnalyserNode lip-sync
    ├── world/
    │   ├── secretsCatalog.ts      # Single source of truth for the 10 secrets
    │   ├── courtyardSvg.ts        # Full illustrated SVG + #creature-stage-layer
    │   ├── particleCanvas.ts      # 60fps fireflies, leaves, bubbles, bursts
    │   ├── secretsController.ts   # Prop tap/keyboard reactions + bubble popping
    │   └── worldEvents.ts         # Periodic autonomous courtyard surprises
    ├── ui/
    │   ├── welcomeCurtain.ts      # Audio-unlocking welcome overlay
    │   ├── hud.ts                 # Candy, secrets X/10, mute, surprise, settings
    │   └── settingsDialog.ts      # Native <dialog> volume, age mode, reset
    ├── creatures/                 # Phase 2
    │   ├── types.ts               # Shared interfaces (created in Phase 1)
    │   ├── voiceManager.ts        # Phase 2: manifest loader + audio/lipsync bridge
    │   ├── creatureRig.ts         # Phase 2: SVG creature builder + mouth/eye rig
    │   ├── creatureRoster.ts      # Phase 2: 6 creature definitions & paths
    │   └── banterDirector.ts      # Phase 2: roaming AI & 2-line banter
    └── activities/                # Phase 3
        ├── cauldronGame.ts
        ├── flashlightGame.ts
        ├── trickOrTreatGame.ts
        └── dressUpParty.ts
```

### Key Contracts (Do Not Break Across Phases)
1. **GitHub Pages Base Path:** `vite.config.ts` uses `base: command === 'build' ? '/Halloween/' : '/'`. Any runtime fetch (like `audio/voices/manifest.json` or `.mp3` clips in Phase 2) MUST prefix paths with `import.meta.env.BASE_URL` (e.g., `` `${import.meta.env.BASE_URL}audio/voices/manifest.json` ``).
2. **`EventBus` Events (`src/core/eventBus.ts`):**
   - `'candy:add'` -> `{ amount: number; x?: number; y?: number; source: string }`
   - `'secret:discovered'` -> `{ id: string; label: string; x: number; y: number }`
   - `'world:speech'` -> `{ text: string; emoji: string; x: number; y: number; color?: string; durationMs?: number }`
   - `'world:burst'` -> `{ x: number; y: number; colors?: string[]; count?: number; shape?: 'star' | 'candy' | 'bubble' | 'sparkle' }`
   - `'world:event'` -> `{ type: 'candy-cart' | 'bubble-storm' | 'shooting-stars' | 'bat-flock' }`
   - `'audio:state'` -> `{ muted: boolean; musicVolume: number; sfxVolume: number }`
   - `'settings:changed'` -> `{ reducedMotion: boolean; ageMode: 'easy' | 'playful' }`
   - `'creature:speak'` -> `{ creatureId: string; lineId: string; text: string }`
3. **Save State (`booville_save_v1` in `src/core/state.ts`):**
   - `candy`, `secretsFound`, `potionsDiscovered`, `unlockedCostumes`, `equippedCostumes`, `audio`, `reducedMotion`, `ageMode`.
4. **Creature Stage Mount Layer:**
   - Phase 2 mounts all 6 creature SVG roots inside `<g id="creature-stage-layer">` inside `.courtyard-svg`, positioned in SVG `1600×900` coordinates (`x: 200..1400`, ground walk band `y: 590..760`, airborne band for Boo-Bell & Bitey `y: 220..520`).
5. **Canvas Input Safety:**
   - `#particle-canvas` ALWAYS keeps `pointer-events: none` so SVG props and creatures receive pointer hits cleanly; floating canvas bubbles are popped via `particleCanvas.tryPopAt(e.clientX, e.clientY)` inside the stage `pointerdown` listener.

---

## 6. Phased Roadmap & Acceptance Criteria

- **Phase 1 — Foundation, Docs & Living Courtyard (Current)**
  - Local repo + GitHub Pages CI/CD workflow + `PLAN.md` & `PROGRESS.md`.
  - Living animated SVG courtyard, 60fps Canvas fireflies/leaves/bubbles/sparkles, 4 autonomous world events, 10 discoverable secrets with Web Audio SFX & toggleable marimba music, welcome curtain, HUD, native `<dialog>` settings.
  - *Done when:* `npm run build` passes cleanly, local preview serves HTTP 200 with zero console errors, pushed to `main`, and live at `https://lucmanaly.github.io/Halloween/`.

- **Phase 2 — Real Neural Voices, Live Lip-Sync & 6 Roaming Creatures**
  - Python `edge-tts` voice generator producing 60+ expressive `.mp3` lines + `manifest.json`.
  - `VoiceManager` + `audioEngine.playVoiceBuffer()` real-time `AnalyserNode` lip-sync.
  - All 6 animated SVG creatures with eye tracking, 5 mouth shapes, unique tap gags, autonomous courtyard roaming, and idle 2-line banter.
  - *Done when:* All 6 creatures speak real expressive voices with lip-sync, roam smoothly on desktop/mobile, and deploy cleanly to GitHub Pages.

- **Phase 3 — The 4 Interactive Mini-Activities**
  - Winnie's Wacky Cauldron + Spell Book.
  - Flashlight Hide-and-Seek (Canvas mask + hot/cold voice clues).
  - Knock-Knock Trick-or-Treat + Candy Catcher.
  - Silly Dress-Up & Monster Dance Party (costume unlocks + disco sync).
  - *Done when:* All 4 activities launch cleanly, persist rewards to `localStorage`, and pass touch + keyboard tests.

- **Phase 4 — Kid-Playability Polish & Final Verification**
  - Browser testing across desktop & mobile viewport sizes, audio fade/focus handling, offline/slow-network loading polish, final accessibility pass, and live GitHub Pages smoke verification.
