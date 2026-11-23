# Boo-Ville: The Silly Spooky Night!

An interactive, kid-friendly Halloween courtyard world built for children under 10 (ages 4–9) and hosted on GitHub Pages.

- **Play Live:** https://lucmanaly.github.io/Halloween/
- **Master Plan & Architecture:** [`PLAN.md`](./PLAN.md)
- **Live Progress & LLM Handoff:** [`PROGRESS.md`](./PROGRESS.md)

## Features
- **6 Living Voiced Creatures with Real Lip-Sync:** Pip the Pumpkin, Boo-Bell the Ghost, Winnie the Giggle-Witch, Barnaby the Skeleton, Frankie the Gentle Monster, and Bitey the Tiny Bat roam the courtyard, follow your finger/cursor with their eyes, react with unique animated tap gags, chat in 2-line voiced banter, and speak 66 pre-generated neural character lines synced at 60fps via Web Audio `AnalyserNode`.
- **4 Interactive Mini-Activities (Phase 3):**
  - **🧪 Winnie's Wacky Cauldron:** Drag or tap silly ingredients, swirl the pot, and discover 8 wacky full-screen spells in your Spell Book.
  - **🔦 Flashlight Hide-and-Seek:** Sweep a glowing spotlight across the darkened courtyard with hot/cold radar pings and voiced hints (`hint_1`) to pop hiding friends out.
  - **🚪 Knock-Knock Trick-or-Treat:** Knock on the haunted door, guess the visitor from their voiced clue (`hint_2`), and catch falling candy with your pumpkin bucket while dodging goofy socks and broccoli.
  - **🎩 Silly Dress-Up & Monster Dance Party:** Unlock 6 SVG costumes with Magic Candy, dress up any creature, drop the pumpkin disco ball, and tap dancing friends as live musical instrument pads!
- **Animated Boo-Ville Courtyard:** Glowing pumpkins, haunted manor with peeking windows, musical xylophone fence, bubbling cauldron, whispering tree, friendly spider, and bonus rattling tombstone.
- **60fps Canvas Effects:** Ambient fireflies, drifting autumn leaves, poppable rainbow bubbles, shooting stars, and sparkle confetti bursts.
- **10 Discoverable Secrets & Autonomous Surprises:** Bubble Storm, Runaway Candy Cart, Shooting Star Shower, and Playful Bat Flock.
- **Kid-Safe Controls & Accessibility:** Audio mute, independent music & voice/SFX sliders, Gentle Motion toggle, Easy/Playful age mode, 2-step reset protection, gentle background voice preloading, smooth tab-switch audio fade/resume, and full keyboard navigation (`Tab`, `Enter`/`Space`, `Escape`, Arrow/WASD steering).

## Local Development

```bash
npm install
npm run dev
```

Type-check, build, and preview locally:

```bash
npm run typecheck
npm run build
npm run preview
```

Regenerate character voice `.mp3` clips and `manifest.json` (requires `uv` and `ffmpeg`):

```bash
uv run --with edge-tts python scripts/generate_voices.py
```
