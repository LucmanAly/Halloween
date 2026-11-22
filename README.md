# Boo-Ville: The Silly Spooky Night!

An interactive, kid-friendly Halloween courtyard world built for children under 10 (ages 4–9) and hosted on GitHub Pages.

- **Play Live:** https://lucmanaly.github.io/Halloween/
- **Master Plan & Architecture:** [`PLAN.md`](./PLAN.md)
- **Live Progress & LLM Handoff:** [`PROGRESS.md`](./PROGRESS.md)

## Features (Phase 1 + Phase 2)
- **6 Living Voiced Creatures with Real Lip-Sync:** Pip the Pumpkin, Boo-Bell the Ghost, Winnie the Giggle-Witch, Barnaby the Skeleton, Frankie the Gentle Monster, and Bitey the Tiny Bat roam the courtyard, follow your finger/cursor with their eyes, react with unique animated tap gags, chat in 2-line voiced banter, and speak 66 pre-generated neural character lines synced at 60fps via Web Audio `AnalyserNode`.
- **Animated Boo-Ville Courtyard:** Glowing pumpkins, haunted manor with peeking windows, musical xylophone fence, bubbling cauldron, whispering tree, friendly spider, and bonus rattling tombstone.
- **60fps Canvas Effects:** Ambient fireflies, drifting autumn leaves, poppable rainbow bubbles, shooting stars, and sparkle confetti bursts.
- **10 Discoverable Secrets & Autonomous Surprises:** Bubble Storm, Runaway Candy Cart, Shooting Star Shower, and Playful Bat Flock.
- **Kid-Safe Controls:** Audio mute, independent music & voice/SFX sliders, Gentle Motion toggle, Easy/Playful age mode, and 2-step reset protection.

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
