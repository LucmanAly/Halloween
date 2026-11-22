const SVG_NS = 'http://www.w3.org/2000/svg';

interface StarSpec {
  x: number;
  y: number;
  r: number;
  delay: number;
  sparkle?: boolean;
}

const STARS: StarSpec[] = [
  { x: 140, y: 85, r: 2.6, delay: 0.2 },
  { x: 215, y: 55, r: 3.8, delay: 1.1, sparkle: true },
  { x: 370, y: 95, r: 2.5, delay: 0.7 },
  { x: 455, y: 58, r: 4.2, delay: 1.9, sparkle: true },
  { x: 545, y: 120, r: 2.3, delay: 0.4 },
  { x: 635, y: 68, r: 3.1, delay: 2.2 },
  { x: 720, y: 112, r: 4.4, delay: 0.9, sparkle: true },
  { x: 815, y: 52, r: 2.7, delay: 1.5 },
  { x: 910, y: 98, r: 3.2, delay: 2.8 },
  { x: 990, y: 56, r: 4.0, delay: 0.5, sparkle: true },
  { x: 1095, y: 115, r: 2.4, delay: 1.7 },
  { x: 1185, y: 66, r: 3.4, delay: 2.4 },
  { x: 1275, y: 94, r: 4.2, delay: 0.3, sparkle: true },
  { x: 1380, y: 58, r: 2.8, delay: 1.3 },
  { x: 1465, y: 118, r: 3.1, delay: 2.0 },
  { x: 175, y: 235, r: 2.2, delay: 1.4 },
  { x: 590, y: 195, r: 2.5, delay: 2.7 },
  { x: 775, y: 185, r: 3.6, delay: 0.8, sparkle: true },
  { x: 940, y: 210, r: 2.2, delay: 1.9 },
  { x: 1125, y: 190, r: 3.0, delay: 0.6 },
  { x: 1435, y: 225, r: 2.5, delay: 2.3 },
];

const FENCE_CAPS = ['#ff7eb6', '#ffd166', '#6ef3b3', '#b892ff', '#72d6ff'];

function renderStars(): string {
  return STARS.map((s) => {
    if (s.sparkle) {
      const arm = s.r * 2.5;
      return `<path class="twinkle-star" style="animation-delay:${s.delay}s" d="M${s.x},${s.y - arm} Q${s.x},${s.y} ${s.x + arm},${s.y} Q${s.x},${s.y} ${s.x},${s.y + arm} Q${s.x},${s.y} ${s.x - arm},${s.y} Q${s.x},${s.y} ${s.x},${s.y - arm}Z" fill="#fff7c2" />`;
    }
    return `<circle class="twinkle-star" style="animation-delay:${s.delay}s" cx="${s.x}" cy="${s.y}" r="${s.r}" fill="#ffeeb0" />`;
  }).join('');
}

function renderFencePickets(): string {
  return FENCE_CAPS.map((color, i) => {
    const x = 625 + i * 74;
    const tilt = (i % 2 === 0 ? -2.2 : 2.2) + (i === 2 ? 0.5 : 0);
    return `
      <g transform="translate(${x}, 555) rotate(${tilt})">
        <g class="secret-target fence-picket" data-secret="fence-${i}" data-secret-id="musical-fence" data-note-index="${i}" role="button" tabindex="0" aria-label="Play musical fence picket ${i + 1}">
          <rect x="-26" y="-75" width="52" height="125" rx="14" fill="transparent" />
          <path d="M-16,38 L-16,-40 L0,-64 L16,-40 L16,38 Z" fill="#5e417d" stroke="#2c1942" stroke-width="3.5" stroke-linejoin="round" />
          <circle cx="0" cy="-38" r="10" fill="${color}" stroke="#2c1942" stroke-width="2.5" />
          <text x="0" y="-34" text-anchor="middle" font-size="11" font-weight="800" fill="#2c1942" pointer-events="none">♪</text>
        </g>
      </g>
    `;
  }).join('');
}

export function createCourtyardSvg(): SVGSVGElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
  <svg class="courtyard-svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="${SVG_NS}" role="img" aria-label="Boo-Ville animated Halloween courtyard">
    <defs>
      <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#13092b" />
        <stop offset="45%" stop-color="#2a1554" />
        <stop offset="82%" stop-color="#532574" />
        <stop offset="100%" stop-color="#7c3b85" />
      </linearGradient>

      <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff8b8" stop-opacity="0.55" />
        <stop offset="55%" stop-color="#ffd56b" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#ffd56b" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="moon-face-grad" cx="38%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#fffbe0" />
        <stop offset="70%" stop-color="#ffe78c" />
        <stop offset="100%" stop-color="#ffc247" />
      </radialGradient>

      <linearGradient id="hill-far" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#351b5c" />
        <stop offset="100%" stop-color="#251245" />
      </linearGradient>

      <linearGradient id="hill-mid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2c194d" />
        <stop offset="100%" stop-color="#1c0f36" />
      </linearGradient>

      <linearGradient id="yard-ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#362457" />
        <stop offset="50%" stop-color="#261742" />
        <stop offset="100%" stop-color="#1a0e30" />
      </linearGradient>

      <linearGradient id="path-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#573d78" />
        <stop offset="100%" stop-color="#3d2759" />
      </linearGradient>

      <radialGradient id="window-glow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="#fff7b2" />
        <stop offset="65%" stop-color="#ffbb38" />
        <stop offset="100%" stop-color="#e87a14" />
      </radialGradient>

      <radialGradient id="cauldron-glow" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="#c9ff66" stop-opacity="0.8" />
        <stop offset="55%" stop-color="#6ee830" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#6ee830" stop-opacity="0" />
      </radialGradient>

      <radialGradient id="pumpkin-grad" cx="40%" cy="35%" r="68%">
        <stop offset="0%" stop-color="#ffbe55" />
        <stop offset="60%" stop-color="#ff7714" />
        <stop offset="100%" stop-color="#c94300" />
      </radialGradient>

      <radialGradient id="pumpkin-mint-grad" cx="40%" cy="35%" r="68%">
        <stop offset="0%" stop-color="#ffe785" />
        <stop offset="65%" stop-color="#ffa233" />
        <stop offset="100%" stop-color="#d65c00" />
      </radialGradient>

      <radialGradient id="lantern-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#fff6a1" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#ff9914" stop-opacity="0" />
      </radialGradient>

      <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <!-- LAYER 1: SKY, STARS, CLOUDS, SMILING MOON -->
    <g id="layer-sky">
      <rect width="1600" height="900" fill="url(#sky-grad)" />
      <g aria-hidden="true">${renderStars()}</g>

      <!-- Soft twilight clouds -->
      <g class="drift-cloud-slow" opacity="0.26" aria-hidden="true">
        <path d="M480,150 Q510,120 550,132 Q585,105 630,128 Q665,125 680,152 Q695,172 655,175 L500,175 Q468,170 480,150Z" fill="#a879d1" />
        <path d="M1040,125 Q1075,98 1118,112 Q1152,88 1196,112 Q1230,108 1244,132 Q1254,152 1215,154 L1060,154 Q1028,150 1040,125Z" fill="#9a6bc7" />
      </g>

      <!-- Smiling Moon (Secret 1: moon) -->
      <g transform="translate(270, 165)">
        <g class="secret-target moon-group" data-secret="moon" data-secret-id="moon" role="button" tabindex="0" aria-label="Tickle the smiling moon">
          <circle cx="0" cy="0" r="118" fill="url(#moon-glow)" pointer-events="none" />
          <circle class="moon-orb" cx="0" cy="0" r="64" fill="url(#moon-face-grad)" stroke="#f6b93b" stroke-width="3" />
          <circle cx="-28" cy="-22" r="9" fill="#f7cb5e" opacity="0.55" />
          <circle cx="29" cy="-14" r="6" fill="#f7cb5e" opacity="0.55" />
          <circle cx="14" cy="27" r="7.5" fill="#f7cb5e" opacity="0.45" />
          <ellipse cx="-27" cy="11" rx="8" ry="5" fill="#ff968a" opacity="0.65" />
          <ellipse cx="27" cy="11" rx="8" ry="5" fill="#ff968a" opacity="0.65" />
          <g class="moon-eyes">
            <circle cx="-18" cy="-4" r="5.5" fill="#3a1c52" />
            <circle cx="-16.5" cy="-5.8" r="2" fill="#ffffff" />
            <circle cx="18" cy="-4" r="5.5" fill="#3a1c52" />
            <circle cx="19.5" cy="-5.8" r="2" fill="#ffffff" />
          </g>
          <path class="moon-smile" d="M-14,13 Q0,27 14,13" fill="none" stroke="#3a1c52" stroke-width="4" stroke-linecap="round" />
        </g>
      </g>
    </g>

    <!-- LAYER 2: DISTANT HILLS & TREES -->
    <g id="layer-hills" aria-hidden="true">
      <path d="M0,565 Q240,460 520,535 T1050,515 T1600,545 L1600,900 L0,900 Z" fill="url(#hill-far)" />
      <g fill="#28124a">
        <polygon points="105,530 138,440 172,530" />
        <polygon points="150,535 178,465 205,535" />
        <polygon points="755,520 792,425 828,520" />
        <polygon points="815,525 845,450 875,525" />
        <polygon points="1465,540 1502,435 1540,540" />
      </g>
      <path d="M0,610 Q360,545 780,600 T1600,590 L1600,900 L0,900 Z" fill="url(#hill-mid)" />
      <path d="M0,635 Q400,595 820,625 T1600,618 L1600,900 L0,900 Z" fill="url(#yard-ground)" />
      <path d="M375,638 Q420,695 570,715 T1040,740 Q1260,750 1600,720 L1600,785 Q1230,822 980,805 T510,762 Q335,730 330,638 Z" fill="url(#path-grad)" opacity="0.85" />
      <ellipse cx="420" cy="688" rx="34" ry="12" fill="#6d4f94" opacity="0.65" />
      <ellipse cx="520" cy="718" rx="40" ry="13" fill="#6d4f94" opacity="0.65" />
      <ellipse cx="645" cy="738" rx="44" ry="14" fill="#6d4f94" opacity="0.65" />
      <ellipse cx="785" cy="754" rx="42" ry="14" fill="#6d4f94" opacity="0.65" />
      <ellipse cx="920" cy="765" rx="38" ry="13" fill="#6d4f94" opacity="0.65" />
      <ellipse cx="1125" cy="770" rx="46" ry="14" fill="#6d4f94" opacity="0.6" />
    </g>

    <!-- LAYER 3: HAUNTED MANOR, MUSICAL FENCE, CAULDRON, TREE -->
    <g id="layer-landmarks">
      <!-- COZY CROOKED HAUNTED MANOR -->
      <g id="haunted-manor" transform="translate(245, 275)">
        <polygon points="220,42 252,38 258,108 214,108" fill="#51316e" stroke="#221036" stroke-width="3.5" />
        <rect x="212" y="34" width="46" height="12" rx="4" fill="#67418a" stroke="#221036" stroke-width="3" />
        <g aria-hidden="true">
          <circle class="smoke-puff" cx="235" cy="22" r="10" fill="#c9b6eb" opacity="0.55" />
          <circle class="smoke-puff smoke-2" cx="244" cy="4" r="13" fill="#d9caf5" opacity="0.42" />
          <circle class="smoke-puff smoke-3" cx="255" cy="-18" r="15" fill="#e9dffb" opacity="0.28" />
        </g>

        <path d="M35,135 L285,135 L296,360 L22,360 Z" fill="#462866" stroke="#200f36" stroke-width="4" stroke-linejoin="round" />
        <path d="M0,175 L58,175 L56,360 L6,360 Z" fill="#3a2057" stroke="#200f36" stroke-width="4" stroke-linejoin="round" />
        <polygon points="-14,180 28,96 72,180" fill="#2c1545" stroke="#1b0b2e" stroke-width="4" stroke-linejoin="round" />
        <path d="M16,144 L158,34 L312,144 L290,152 L158,58 L38,152 Z" fill="#2d1747" stroke="#1b0b2e" stroke-width="4" stroke-linejoin="round" />
        <polygon points="34,142 158,50 292,142" fill="#391d59" stroke="#1b0b2e" stroke-width="4" stroke-linejoin="round" />

        <circle cx="158" cy="108" r="17" fill="#ffd970" stroke="#200f36" stroke-width="3.5" />
        <line x1="158" y1="91" x2="158" y2="125" stroke="#200f36" stroke-width="2.5" />
        <line x1="141" y1="108" x2="175" y2="108" stroke="#200f36" stroke-width="2.5" />

        <rect x="108" y="346" width="102" height="16" rx="5" fill="#634087" stroke="#200f36" stroke-width="3" />
        <rect x="96" y="358" width="126" height="14" rx="5" fill="#523273" stroke="#200f36" stroke-width="3" />

        <!-- Left Glowing Window (Secret 2: window-left) -->
        <g transform="translate(88, 198)">
          <g class="secret-target manor-window" data-secret="window-left" data-secret-id="window-left" role="button" tabindex="0" aria-label="Peek inside the left manor window">
            <rect x="-34" y="-38" width="68" height="78" rx="14" fill="transparent" />
            <path d="M-26,30 L-26,-10 Q-26,-32 0,-32 Q26,-32 26,-10 L26,30 Z" fill="url(#window-glow)" stroke="#200f36" stroke-width="4" />
            <g class="window-peek">
              <path d="M-15,28 L-15,10 L-11,-3 L-4,5 L4,5 L11,-3 L15,10 L15,28 Z" fill="#1e0f30" />
              <circle cx="-6" cy="12" r="3" fill="#8dff6b" />
              <circle cx="6" cy="12" r="3" fill="#8dff6b" />
            </g>
            <line x1="0" y1="-31" x2="0" y2="30" stroke="#200f36" stroke-width="3" />
            <line x1="-26" y1="3" x2="26" y2="3" stroke="#200f36" stroke-width="3" />
            <rect x="-30" y="28" width="60" height="8" rx="3" fill="#6c4594" stroke="#200f36" stroke-width="2.5" />
          </g>
        </g>

        <!-- Right Glowing Window (Secret 3: window-right) -->
        <g transform="translate(228, 198)">
          <g class="secret-target manor-window" data-secret="window-right" data-secret-id="window-right" role="button" tabindex="0" aria-label="Peek inside the right manor window">
            <rect x="-34" y="-38" width="68" height="78" rx="14" fill="transparent" />
            <path d="M-26,30 L-26,-10 Q-26,-32 0,-32 Q26,-32 26,-10 L26,30 Z" fill="url(#window-glow)" stroke="#200f36" stroke-width="4" />
            <g class="window-peek">
              <ellipse cx="0" cy="17" rx="16" ry="15" fill="#e4fff8" />
              <circle cx="-6" cy="13" r="4.5" fill="#ffffff" stroke="#200f36" stroke-width="1.8" />
              <circle cx="-5" cy="13" r="2.2" fill="#200f36" />
              <circle cx="6" cy="13" r="4.5" fill="#ffffff" stroke="#200f36" stroke-width="1.8" />
              <circle cx="7" cy="13" r="2.2" fill="#200f36" />
            </g>
            <line x1="0" y1="-31" x2="0" y2="30" stroke="#200f36" stroke-width="3" />
            <line x1="-26" y1="3" x2="26" y2="3" stroke="#200f36" stroke-width="3" />
            <rect x="-30" y="28" width="60" height="8" rx="3" fill="#6c4594" stroke="#200f36" stroke-width="2.5" />
          </g>
        </g>

        <!-- Trick-or-Treat Front Door (Secret 4: manor-door) -->
        <g transform="translate(158, 286)">
          <g class="secret-target manor-door" data-secret="manor-door" data-secret-id="manor-door" role="button" tabindex="0" aria-label="Knock on the haunted manor door">
            <rect x="-42" y="-56" width="84" height="118" rx="18" fill="transparent" />
            <path d="M-32,60 L-32,-22 Q-32,-52 0,-52 Q32,-52 32,-22 L32,60 Z" fill="#693b29" stroke="#200f36" stroke-width="4.5" />
            <path d="M-22,52 L-22,-18 Q-22,-40 0,-40 Q22,-40 22,-18 L22,52 Z" fill="#824b35" stroke="#472318" stroke-width="2.5" />
            <circle cx="0" cy="-14" r="13" fill="#5e3485" stroke="#ff9636" stroke-width="4" />
            <circle cx="0" cy="-14" r="5" fill="#ffb84d" />
            <circle cx="17" cy="14" r="6" fill="#ffd15c" stroke="#200f36" stroke-width="2.2" />
          </g>
        </g>

        <circle cx="106" cy="268" r="9" fill="#ffe47a" filter="url(#soft-glow)" aria-hidden="true" />
        <circle cx="212" cy="268" r="9" fill="#ffe47a" filter="url(#soft-glow)" aria-hidden="true" />
      </g>

      <!-- MUSICAL GRAVEYARD FENCE (Secret 5: musical-fence) -->
      <g id="musical-fence">
        <rect x="595" y="544" width="365" height="12" rx="5" fill="#462d61" stroke="#251338" stroke-width="3" />
        <rect x="595" y="576" width="365" height="12" rx="5" fill="#462d61" stroke="#251338" stroke-width="3" />
        ${renderFencePickets()}
      </g>

      <!-- WINNIE'S BUBBLING CAULDRON NOOK (Secret 6: cauldron) -->
      <g transform="translate(1110, 565)">
        <g class="secret-target cauldron-group" data-secret="cauldron" data-secret-id="cauldron" role="button" tabindex="0" aria-label="Splash Winnie's bubbling cauldron">
          <rect x="-78" y="-85" width="156" height="145" rx="28" fill="transparent" />
          <circle cx="0" cy="-24" r="90" fill="url(#cauldron-glow)" pointer-events="none" />
          <rect x="-42" y="34" width="84" height="14" rx="7" fill="#543022" stroke="#26120b" stroke-width="2.5" />
          <path class="cauldron-flame" d="M-32,42 Q-24,8 -10,36 Q0,2 14,34 Q26,10 34,42 Z" fill="#ff7c1f" />
          <path class="cauldron-flame flame-inner" d="M-18,42 Q-10,18 0,38 Q10,16 20,42 Z" fill="#ffe156" />
          <ellipse cx="-26" cy="34" rx="9" ry="7" fill="#1e192b" />
          <ellipse cx="26" cy="34" rx="9" ry="7" fill="#1e192b" />
          <ellipse cx="0" cy="4" rx="58" ry="44" fill="#2c2540" stroke="#151024" stroke-width="4.5" />
          <g transform="rotate(20) translate(16, -42)">
            <rect x="-5" y="-32" width="10" height="50" rx="5" fill="#a86a3a" stroke="#3b1d0c" stroke-width="2.5" />
          </g>
          <ellipse cx="0" cy="-26" rx="54" ry="15" fill="#3b3254" stroke="#151024" stroke-width="4" />
          <ellipse class="cauldron-brew" cx="0" cy="-26" rx="44" ry="10" fill="#a4ff42" />
          <circle id="cauldron-anchor" cx="0" cy="-30" r="3" fill="transparent" pointer-events="none" />
        </g>
      </g>

      <!-- CROOKED WHISPERING TREE, LANTERN (Secret 7), SPIDER (Secret 8) -->
      <g id="whispering-tree" transform="translate(1310, 210)">
        <circle cx="-12" cy="85" r="78" fill="#3a1c5e" stroke="#200d38" stroke-width="4" />
        <circle cx="65" cy="70" r="88" fill="#472373" stroke="#200d38" stroke-width="4" />
        <circle cx="115" cy="128" r="68" fill="#351857" stroke="#200d38" stroke-width="4" />
        <path d="M58,415 Q68,310 54,230 Q35,175 -75,148 L-68,125 Q35,145 72,188 Q82,125 110,98 L128,112 Q100,152 102,225 Q114,325 128,415 Z" fill="#4f2d6e" stroke="#200d38" stroke-width="4.5" stroke-linejoin="round" />
        <ellipse cx="82" cy="272" rx="14" ry="20" fill="#220f3b" />
        <circle cx="77" cy="270" r="3.5" fill="#ffe169" />
        <circle cx="87" cy="270" r="3.5" fill="#ffe169" />

        <!-- Hanging Glowing Lantern (Secret 7: lantern) -->
        <g transform="translate(-52, 148)">
          <g class="secret-target lantern-group" data-secret="lantern" data-secret-id="lantern" role="button" tabindex="0" aria-label="Swing the glowing tree lantern">
            <rect x="-32" y="-10" width="64" height="92" rx="16" fill="transparent" />
            <g class="lantern-swing">
              <line x1="0" y1="0" x2="0" y2="22" stroke="#200d38" stroke-width="3.5" />
              <circle cx="0" cy="48" r="46" fill="url(#lantern-glow)" pointer-events="none" />
              <path d="M-14,24 L14,24 L18,62 L-18,62 Z" fill="#ffe066" stroke="#200d38" stroke-width="3.5" stroke-linejoin="round" />
              <path d="M-19,24 L0,14 L19,24 Z" fill="#2c1747" stroke="#200d38" stroke-width="3" />
              <rect x="-18" y="61" width="36" height="8" rx="3" fill="#2c1747" stroke="#200d38" stroke-width="3" />
            </g>
          </g>
        </g>

        <!-- Spider Web + Friendly Spider (Secret 8: spider) -->
        <g transform="translate(86, 130)">
          <g class="secret-target spider-group" data-secret="spider" data-secret-id="spider" role="button" tabindex="0" aria-label="Say hi to the friendly spider">
            <rect x="-46" y="-20" width="92" height="145" rx="24" fill="transparent" />
            <path d="M-32,-12 L10,32 M28,-12 L-16,32 M-28,12 Q0,24 28,12" stroke="#d8c8f5" stroke-width="1.6" opacity="0.55" fill="none" />
            <g class="spider-body">
              <line x1="0" y1="-8" x2="0" y2="48" stroke="#e9defc" stroke-width="2.2" />
              <path d="M-16,52 Q-34,42 -36,60 M-18,58 Q-36,56 -38,74 M-16,64 Q-32,70 -30,84 M-10,68 Q-20,80 -16,90" stroke="#1e1233" stroke-width="3.5" stroke-linecap="round" fill="none" />
              <path d="M16,52 Q34,42 36,60 M18,58 Q36,56 38,74 M16,64 Q32,70 30,84 M10,68 Q20,80 16,90" stroke="#1e1233" stroke-width="3.5" stroke-linecap="round" fill="none" />
              <circle cx="0" cy="60" r="21" fill="#2c194a" stroke="#140926" stroke-width="3.5" />
              <circle cx="-7" cy="56" r="5.5" fill="#ffffff" />
              <circle cx="7" cy="56" r="5.5" fill="#ffffff" />
              <circle cx="-6" cy="56.5" r="2.7" fill="#180a2e" />
              <circle cx="8" cy="56.5" r="2.7" fill="#180a2e" />
              <path d="M-7,66 Q0,72 7,66" stroke="#ff9ee0" stroke-width="2.8" stroke-linecap="round" fill="none" />
            </g>
          </g>
        </g>
      </g>
    </g>

    <!-- LAYER 4: AUTONOMOUS FLYERS, ROAMING CREATURE STAGE (PHASE 2), RUNAWAY CANDY CART -->
    <g id="layer-actors">
      <!-- Playful Bat Flock (World Event) -->
      <g id="bat-flock-group" class="bat-flock" aria-hidden="true">
        <g transform="translate(0, 0)">
          <path class="bat-wing" d="M-24,-4 Q-12,-20 0,-6 Q12,-20 24,-4 Q12,4 0,10 Q-12,4 -24,-4 Z" fill="#2c164a" stroke="#ff8ae2" stroke-width="1.5" />
          <circle cx="-3" cy="-3" r="1.8" fill="#ffe66d" />
          <circle cx="3" cy="-3" r="1.8" fill="#ffe66d" />
        </g>
        <g transform="translate(-75, 42) scale(0.85)">
          <path class="bat-wing" d="M-24,-4 Q-12,-20 0,-6 Q12,-20 24,-4 Q12,4 0,10 Q-12,4 -24,-4 Z" fill="#3a1d63" stroke="#ff8ae2" stroke-width="1.5" />
          <circle cx="-3" cy="-3" r="1.8" fill="#ffe66d" />
          <circle cx="3" cy="-3" r="1.8" fill="#ffe66d" />
        </g>
        <g transform="translate(-140, -18) scale(0.95)">
          <path class="bat-wing" d="M-24,-4 Q-12,-20 0,-6 Q12,-20 24,-4 Q12,4 0,10 Q-12,4 -24,-4 Z" fill="#2c164a" stroke="#78e8ff" stroke-width="1.5" />
          <circle cx="-3" cy="-3" r="1.8" fill="#ffe66d" />
          <circle cx="3" cy="-3" r="1.8" fill="#ffe66d" />
        </g>
        <g transform="translate(-210, 28) scale(0.78)">
          <path class="bat-wing" d="M-24,-4 Q-12,-20 0,-6 Q12,-20 24,-4 Q12,4 0,10 Q-12,4 -24,-4 Z" fill="#3a1d63" stroke="#ffe169" stroke-width="1.5" />
          <circle cx="-3" cy="-3" r="1.8" fill="#ffe66d" />
          <circle cx="3" cy="-3" r="1.8" fill="#ffe66d" />
        </g>
      </g>

      <!-- Phase 2 Creature Mount Layer -->
      <g id="creature-stage-layer"></g>

      <!-- Runaway Candy Cart (World Event) -->
      <g id="candy-cart-group" class="candy-cart" role="button" tabindex="-1" aria-label="Tap the runaway candy cart for bonus candy">
        <rect x="-85" y="-95" width="170" height="125" rx="22" fill="transparent" />
        <circle cx="-25" cy="-48" r="16" fill="#ff6eb4" stroke="#240f3b" stroke-width="3" />
        <circle cx="8" cy="-56" r="18" fill="#63e6be" stroke="#240f3b" stroke-width="3" />
        <circle cx="36" cy="-45" r="15" fill="#ffd166" stroke="#240f3b" stroke-width="3" />
        <polygon points="-50,-32 -36,-72 -20,-32" fill="#ffa94d" stroke="#240f3b" stroke-width="3" />
        <path d="M-64,-38 L64,-38 L52,4 L-52,4 Z" fill="#7c3aed" stroke="#240f3b" stroke-width="4" stroke-linejoin="round" />
        <rect x="-56" y="-26" width="112" height="12" rx="4" fill="#ffd166" />
        <path d="M60,-22 L84,-34" stroke="#ffd166" stroke-width="6" stroke-linecap="round" />
        <circle cx="-34" cy="10" r="16" fill="#ff922b" stroke="#240f3b" stroke-width="4" />
        <circle cx="-34" cy="10" r="6" fill="#fff3bf" />
        <circle cx="34" cy="10" r="16" fill="#ff922b" stroke="#240f3b" stroke-width="4" />
        <circle cx="34" cy="10" r="6" fill="#fff3bf" />
      </g>
    </g>

    <!-- LAYER 5: FOREGROUND PUMPKINS, MYSTERY BUSHES & BONUS TOMBSTONE -->
    <g id="layer-foreground">
      <!-- Glowing Pumpkin Patch (Secret 9: pumpkin-patch) -->
      <g transform="translate(310, 742)">
        <g class="secret-target pumpkin-patch" data-secret="pumpkin-patch" data-secret-id="pumpkin-patch" role="button" tabindex="0" aria-label="Bounce the smiling pumpkin patch">
          <rect x="-95" y="-68" width="190" height="115" rx="26" fill="transparent" />
          <g transform="translate(52, -16)">
            <path d="M-4,-34 Q0,-48 10,-45" stroke="#5db849" stroke-width="6" stroke-linecap="round" fill="none" />
            <ellipse cx="0" cy="0" rx="38" ry="30" fill="url(#pumpkin-mint-grad)" stroke="#702300" stroke-width="3.5" />
            <circle cx="-13" cy="-5" r="4.5" fill="#fff7b0" />
            <circle cx="13" cy="-5" r="4.5" fill="#fff7b0" />
            <path d="M-14,9 Q0,20 14,9" stroke="#fff7b0" stroke-width="4" stroke-linecap="round" fill="none" />
          </g>
          <g transform="translate(-26, 2)">
            <path d="M-3,-44 Q3,-62 15,-56" stroke="#5db849" stroke-width="8" stroke-linecap="round" fill="none" />
            <ellipse cx="0" cy="0" rx="52" ry="40" fill="url(#pumpkin-grad)" stroke="#6e2200" stroke-width="4" />
            <ellipse cx="0" cy="0" rx="28" ry="39" fill="none" stroke="#db5700" stroke-width="2.5" opacity="0.65" />
            <polygon points="-22,-6 -10,-16 -6,-2" fill="#fff7b0" />
            <polygon points="22,-6 10,-16 6,-2" fill="#fff7b0" />
            <path d="M-24,12 Q0,30 24,12 Q10,19 0,18 Q-10,19 -24,12 Z" fill="#fff7b0" />
          </g>
          <g transform="translate(22, 24)">
            <path d="M0,-20 Q3,-29 8,-27" stroke="#5db849" stroke-width="4.5" stroke-linecap="round" fill="none" />
            <ellipse cx="0" cy="0" rx="24" ry="19" fill="url(#pumpkin-grad)" stroke="#6e2200" stroke-width="3" />
            <circle cx="-7" cy="-3" r="2.8" fill="#fff7b0" />
            <circle cx="7" cy="-3" r="2.8" fill="#fff7b0" />
            <path d="M-7,6 Q0,11 7,6" stroke="#fff7b0" stroke-width="2.8" stroke-linecap="round" fill="none" />
          </g>
        </g>
      </g>

      <!-- Bonus Silly Tombstone -->
      <g transform="translate(970, 682)">
        <g class="secret-target tombstone-group" data-secret="tombstone" data-secret-id="tombstone-bonus" role="button" tabindex="0" aria-label="Tap the silly dancing tombstone">
          <rect x="-46" y="-66" width="92" height="115" rx="20" fill="transparent" />
          <g class="tombstone-skull">
            <circle cx="0" cy="-32" r="18" fill="#f7f1ff" stroke="#24113b" stroke-width="3" />
            <circle cx="-6" cy="-34" r="3.5" fill="#24113b" />
            <circle cx="6" cy="-34" r="3.5" fill="#24113b" />
            <path d="M-6,-24 L6,-24" stroke="#24113b" stroke-width="2.5" stroke-linecap="round" />
          </g>
          <path d="M-34,38 L-34,-12 Q-34,-46 0,-46 Q34,-46 34,-12 L34,38 Z" fill="#6b568a" stroke="#24113b" stroke-width="4" />
          <text x="0" y="-4" text-anchor="middle" font-size="19" font-weight="800" fill="#e5d7ff" pointer-events="none">BOO!</text>
          <rect x="-40" y="34" width="80" height="12" rx="5" fill="#513e6b" stroke="#24113b" stroke-width="3" />
        </g>
      </g>

      <!-- Left & Right Giggling Mystery Bushes (Secret 10: mystery-bushes) -->
      <g transform="translate(185, 735)">
        <g class="secret-target bush-group" data-secret="bush-left" data-secret-id="mystery-bushes" role="button" tabindex="0" aria-label="Tickle the giggling left bush">
          <rect x="-78" y="-62" width="156" height="112" rx="26" fill="transparent" />
          <circle cx="-38" cy="4" r="40" fill="#2c4a4f" stroke="#14222b" stroke-width="4" />
          <circle cx="38" cy="6" r="38" fill="#2c4a4f" stroke="#14222b" stroke-width="4" />
          <circle cx="0" cy="-14" r="46" fill="#375f63" stroke="#14222b" stroke-width="4" />
          <g class="bush-eyes">
            <ellipse cx="-14" cy="-10" rx="7" ry="8.5" fill="#ffe66d" />
            <ellipse cx="14" cy="-10" rx="7" ry="8.5" fill="#ffe66d" />
            <circle cx="-12" cy="-10" r="3.5" fill="#18122b" />
            <circle cx="16" cy="-10" r="3.5" fill="#18122b" />
          </g>
        </g>
      </g>

      <g transform="translate(1375, 738)">
        <g class="secret-target bush-group" data-secret="bush-right" data-secret-id="mystery-bushes" role="button" tabindex="0" aria-label="Tickle the giggling right bush">
          <rect x="-78" y="-62" width="156" height="112" rx="26" fill="transparent" />
          <circle cx="-38" cy="6" r="38" fill="#2c4a4f" stroke="#14222b" stroke-width="4" />
          <circle cx="38" cy="4" r="40" fill="#2c4a4f" stroke="#14222b" stroke-width="4" />
          <circle cx="0" cy="-14" r="46" fill="#375f63" stroke="#14222b" stroke-width="4" />
          <g class="bush-eyes">
            <ellipse cx="-14" cy="-10" rx="7" ry="8.5" fill="#8dff6b" />
            <ellipse cx="14" cy="-10" rx="7" ry="8.5" fill="#8dff6b" />
            <circle cx="-15" cy="-10" r="3.5" fill="#18122b" />
            <circle cx="13" cy="-10" r="3.5" fill="#18122b" />
          </g>
        </g>
      </g>
    </g>
  </svg>
  `.trim();

  return wrapper.firstElementChild as SVGSVGElement;
}
