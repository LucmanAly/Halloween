"""Generate expressive neural character voice clips and manifest.json for Boo-Ville Phase 2.

Usage:
    uv run --with edge-tts python scripts/generate_voices.py
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import edge_tts

ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT_DIR / "public" / "audio" / "voices"
MANIFEST_PATH = OUT_DIR / "manifest.json"


@dataclass(frozen=True)
class VoiceProfile:
    voice: str
    rate: str
    pitch: str
    dsp_filter: Optional[str] = None


@dataclass(frozen=True)
class LineSpec:
    id: str
    creature_id: str
    category: str
    text: str
    emoji: str
    pair_id: Optional[str] = None


PROFILES: dict[str, VoiceProfile] = {
    "pip": VoiceProfile(
        voice="en-US-AnaNeural",
        rate="+6%",
        pitch="+4Hz",
        dsp_filter=None,
    ),
    "boobell": VoiceProfile(
        voice="en-US-JennyNeural",
        rate="+2%",
        pitch="+18Hz",
        dsp_filter="highpass=f=130,aecho=0.82:0.78:55|110:0.26|0.12",
    ),
    "winnie": VoiceProfile(
        voice="en-GB-SoniaNeural",
        rate="+4%",
        pitch="+12Hz",
        dsp_filter=None,
    ),
    "barnaby": VoiceProfile(
        voice="en-US-GuyNeural",
        rate="+8%",
        pitch="+16Hz",
        dsp_filter=None,
    ),
    "frankie": VoiceProfile(
        voice="en-US-ChristopherNeural",
        rate="-12%",
        pitch="-20Hz",
        dsp_filter="bass=g=4:f=140",
    ),
    "bitey": VoiceProfile(
        voice="en-US-AriaNeural",
        rate="+14%",
        pitch="+24Hz",
        dsp_filter="aresample=48000,asetrate=48000*1.11,aresample=24000,atempo=0.95",
    ),
}

LINES: list[LineSpec] = [
    # --- PIP THE PUMPKIN (11 lines) ---
    LineSpec("greet_1", "pip", "greeting", "Hiya friend! Welcome to Boo-Ville! Tap around for spooky giggles!", "🎃"),
    LineSpec("greet_2", "pip", "greeting", "Happy Halloween! I saved the crunchiest candy corn just for you!", "🍬"),
    LineSpec("gag_1", "pip", "tap_gag", "Boing, boing! Whoa, my pumpkin seeds are doing backflips!", "🎃"),
    LineSpec("gag_2", "pip", "tap_gag", "Hehe! That tickles my curly green stem!", "🌱"),
    LineSpec("gag_3", "pip", "tap_gag", "Knock knock! Who is there? Boo! Aww, do not cry, haha!", "😄"),
    LineSpec("banter_1_a", "pip", "banter_a", "Hey Barnaby! Why did the skeleton cross the pumpkin patch?", "🎃", "banter-1"),
    LineSpec("banter_4_b", "pip", "banter_b", "Ooh, ding-a-ling! You sound spook-tacular, Barnaby!", "🎶", "banter-4"),
    LineSpec("react_1", "pip", "world_react", "Whoa, look at that! Boo-Ville magic is sparkling everywhere!", "✨"),
    LineSpec("react_2", "pip", "world_react", "Yippee! Catch all the goodies before they float away!", "🎉"),
    LineSpec("hint_1", "pip", "hint", "Psst! I am hiding right where the orange pumpkins glow!", "🔦"),
    LineSpec("hint_2", "pip", "hint", "Knock knock! Somebody round and orange is waiting by the door!", "🚪"),

    # --- BOO-BELL THE GHOST (11 lines) ---
    LineSpec("greet_1", "boobell", "greeting", "Ooo-ooo! Hi little friend! I am Boo-Bell the friendly ghost!", "👻"),
    LineSpec("greet_2", "boobell", "greeting", "Float on in! Everything in Boo-Ville loves a silly tickle!", "🫧"),
    LineSpec("gag_1", "boobell", "tap_gag", "Peek-a-boo! Hehe, did I make you giggle?", "👻"),
    LineSpec("gag_2", "boobell", "tap_gag", "Whoopsie! I turned invisible for a second! Now you see me!", "✨"),
    LineSpec("gag_3", "boobell", "tap_gag", "Booo! Just kidding, I only scare grumpy broccoli!", "🥦"),
    LineSpec("banter_2_a", "boobell", "banter_a", "Peek-a-boo, Frankie! Did I make your hair stand up?", "👻", "banter-2"),
    LineSpec("banter_6_b", "boobell", "banter_b", "Ooh, you are on, little bat! Ready, set, floaty-boo!", "🌙", "banter-6"),
    LineSpec("react_1", "boobell", "world_react", "Wheee! Rainbow bubbles are floating through my ghost tummy!", "🫧"),
    LineSpec("react_2", "boobell", "world_react", "Ooh, make a wish upon those shiny Halloween stars!", "🌠"),
    LineSpec("hint_1", "boobell", "hint", "Hehe, shine your flashlight up high! I am floating like a cloud!", "🔦"),
    LineSpec("hint_2", "boobell", "hint", "Ooo-ooo! Guess who is hiding behind the front door with a sparkly bow!", "🎀"),

    # --- WINNIE THE GIGGLE-WITCH (11 lines) ---
    LineSpec("greet_1", "winnie", "greeting", "Hello there, young wizard! Ready for some silly Halloween magic?", "🧙‍♀️"),
    LineSpec("greet_2", "winnie", "greeting", "Double bubble, giggles and trouble! Welcome to my courtyard!", "🧪"),
    LineSpec("gag_1", "winnie", "tap_gag", "Alakazam! Watch my crooked witch hat spin with stars!", "🌟"),
    LineSpec("gag_2", "winnie", "tap_gag", "Hocus pocus, extra focus! Oops, I sneezed rainbow glitter!", "✨"),
    LineSpec("gag_3", "winnie", "tap_gag", "Stir it left, stir it right! What a wonderfully wacky brew!", "🪄"),
    LineSpec("banter_3_a", "winnie", "banter_a", "Bitey dear, did you nibble my glowing moon cheese again?", "🧀", "banter-3"),
    LineSpec("banter_5_b", "winnie", "banter_b", "Ooh, extra sprinkles and giggle fizz coming right up, Frankie!", "🧪", "banter-5"),
    LineSpec("react_1", "winnie", "world_react", "Marvelous! My cauldron bubbles are dancing in the moonlight!", "🧪"),
    LineSpec("react_2", "winnie", "world_react", "Oh my broomstick! Look at all those magical treats!", "🍬"),
    LineSpec("hint_1", "winnie", "hint", "Tee-hee! Look near the green glowing cauldron to spot my pointy hat!", "🔦"),
    LineSpec("hint_2", "winnie", "hint", "A little witch with sparkly glasses is waiting behind the door!", "🧙‍♀️"),

    # --- BARNABY THE SKELETON (11 lines) ---
    LineSpec("greet_1", "barnaby", "greeting", "Rattle-clack! Good evening, buddy! Shake a leg with old Barnaby!", "💀"),
    LineSpec("greet_2", "barnaby", "greeting", "Welcome, welcome! Have you tapped the musical fence yet?", "🎵"),
    LineSpec("gag_1", "barnaby", "tap_gag", "Whoops-a-daisy! My knees fell off! Snap! Back together!", "🦴"),
    LineSpec("gag_2", "barnaby", "tap_gag", "Oh my funny bones! That tap tickled right down to my toes!", "💀"),
    LineSpec("gag_3", "barnaby", "tap_gag", "Clink clank! Listen to my spooky skeleton xylophone belly!", "🎶"),
    LineSpec("banter_1_b", "barnaby", "banter_b", "Hehe! To get to the funny-bone shop! Rattle-clack!", "🦴", "banter-1"),
    LineSpec("banter_4_a", "barnaby", "banter_a", "Listen closely, Pip! I practiced my rib xylophone solo all night!", "🎵", "banter-4"),
    LineSpec("react_1", "barnaby", "world_react", "My jaw dropped right off! What a fantastic Halloween surprise!", "💀"),
    LineSpec("react_2", "barnaby", "world_react", "Rattle-tattle-yay! That makes me want to do a skeleton jig!", "💃"),
    LineSpec("hint_1", "barnaby", "hint", "Clack clack! Follow the sound of rattling bones near the fence!", "🔦"),
    LineSpec("hint_2", "barnaby", "hint", "Tap-tap! Somebody super bony and smiley is knocking back!", "🦴"),

    # --- FRANKIE THE GENTLE MONSTER (11 lines) ---
    LineSpec("greet_1", "frankie", "greeting", "Hiii friend! Frankie happy you came to play in Boo-Ville!", "🧟"),
    LineSpec("greet_2", "frankie", "greeting", "Hello! Frankie give biggest, gentlest monster high-five!", "🖐️"),
    LineSpec("gag_1", "frankie", "tap_gag", "Stomp, stomp! Frankie do happy marshmallow monster dance!", "💚"),
    LineSpec("gag_2", "frankie", "tap_gag", "Mmm, candy corn! Frankie think you are sweeter than cupcakes!", "🧁"),
    LineSpec("gag_3", "frankie", "tap_gag", "Boop! Did you just boop Frankie's tiny golden neck bolts?", "⚡"),
    LineSpec("banter_2_b", "frankie", "banter_b", "Whoa! You tickled my bolts! Haha, do it again!", "⚡", "banter-2"),
    LineSpec("banter_5_a", "frankie", "banter_a", "Winnie, can you brew a giant cup of candy corn soup?", "🍬", "banter-5"),
    LineSpec("react_1", "frankie", "world_react", "Oooh! Look at the candy cart! Frankie love snacks!", "🛒"),
    LineSpec("react_2", "frankie", "world_react", "Yay! Sparkles everywhere! Frankie cheering so big!", "🌟"),
    LineSpec("hint_1", "frankie", "hint", "Psst! Shine light on big green gentle monster near the bushes!", "🔦"),
    LineSpec("hint_2", "frankie", "hint", "Thump thump! Huge friendly footsteps waiting right behind the door!", "💚"),

    # --- BITEY THE TINY BAT (11 lines) ---
    LineSpec("greet_1", "bitey", "greeting", "Eee-hee! Hiya! I am Bitey! Look up, look up!", "🦇"),
    LineSpec("greet_2", "bitey", "greeting", "Squeak-squeak! Best spooky night ever! Let's flap and fly!", "🌙"),
    LineSpec("gag_1", "bitey", "tap_gag", "Loop-de-loop! Whoa, the sky looks extra funny upside-down!", "🦇"),
    LineSpec("gag_2", "bitey", "tap_gag", "Squeak! Catch a falling sparkly star from my tiny wings!", "⭐"),
    LineSpec("gag_3", "bitey", "tap_gag", "Flap, flap, wiggle ears! Bat snacks taste best at midnight!", "🍇"),
    LineSpec("banter_3_b", "bitey", "banter_b", "Eee-hee! Just a teeny tiny bat bite! It tasted sparkly!", "🧀", "banter-3"),
    LineSpec("banter_6_a", "bitey", "banter_a", "Hey Boo-Bell! Bet I can swoop around the smiling moon faster than you!", "🦇", "banter-6"),
    LineSpec("react_1", "bitey", "world_react", "Squeak-wheee! Look at my bat cousins zooming across the stars!", "🦇"),
    LineSpec("react_2", "bitey", "world_react", "Ooh shiny! Bitey wants to pop every single bubble!", "🫧"),
    LineSpec("hint_1", "bitey", "hint", "Squeak! Check the high tree branches with your flashlight!", "🔦"),
    LineSpec("hint_2", "bitey", "hint", "Flap-flap! Tiny purple ears are wiggling behind the front door!", "🦇"),
]


def probe_duration_ms(mp3_path: Path) -> int:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(mp3_path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    seconds = float(result.stdout.strip())
    return max(250, round(seconds * 1000))


def process_with_ffmpeg(raw_mp3: Path, final_mp3: Path, profile: VoiceProfile) -> None:
    filters = [
        "silenceremove=start_periods=1:start_threshold=-45dB",
        "areverse",
        "silenceremove=start_periods=1:start_threshold=-45dB",
        "areverse",
    ]
    if profile.dsp_filter:
        filters.append(profile.dsp_filter)
    filters.append("loudnorm=I=-16:TP=-1.5:LRA=11")
    filter_chain = ",".join(filters)

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(raw_mp3),
            "-af",
            filter_chain,
            "-ac",
            "1",
            "-ar",
            "24000",
            "-b:a",
            "64k",
            str(final_mp3),
        ],
        check=True,
    )


async def generate_one(
    sem: asyncio.Semaphore,
    tmp_dir: Path,
    spec: LineSpec,
) -> dict[str, object]:
    profile = PROFILES[spec.creature_id]
    creature_dir = OUT_DIR / spec.creature_id
    creature_dir.mkdir(parents=True, exist_ok=True)
    raw_mp3 = tmp_dir / f"{spec.creature_id}_{spec.id}.raw.mp3"
    final_mp3 = creature_dir / f"{spec.id}.mp3"

    async with sem:
        for attempt in range(3):
            try:
                communicate = edge_tts.Communicate(
                    spec.text,
                    voice=profile.voice,
                    rate=profile.rate,
                    pitch=profile.pitch,
                )
                await communicate.save(str(raw_mp3))
                break
            except Exception as exc:
                if attempt == 2:
                    raise RuntimeError(f"Failed TTS for {spec.creature_id}/{spec.id}: {exc}") from exc
                await asyncio.sleep(1.5 * (2**attempt))

    await asyncio.to_thread(process_with_ffmpeg, raw_mp3, final_mp3, profile)
    duration_ms = await asyncio.to_thread(probe_duration_ms, final_mp3)

    entry: dict[str, object] = {
        "id": spec.id,
        "creatureId": spec.creature_id,
        "category": spec.category,
        "text": spec.text,
        "emoji": spec.emoji,
        "file": f"audio/voices/{spec.creature_id}/{spec.id}.mp3",
        "durationMs": duration_ms,
    }
    if spec.pair_id:
        entry["pairId"] = spec.pair_id
    return entry


async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sem = asyncio.Semaphore(3)

    with tempfile.TemporaryDirectory() as tmp_name:
        tmp_dir = Path(tmp_name)
        tasks = [generate_one(sem, tmp_dir, spec) for spec in LINES]
        results = await asyncio.gather(*tasks)

    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "lines": results,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    total_bytes = sum(p.stat().st_size for p in OUT_DIR.rglob("*.mp3"))
    print(f"Generated {len(results)} voice clips ({total_bytes / 1024:.1f} KB total) -> {MANIFEST_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
