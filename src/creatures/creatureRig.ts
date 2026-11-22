import type { CreatureConfig, CreatureId, CreatureInstance, MouthShape } from './types.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface RigMeta {
  eyeOriginY: number;
  gagClass: string;
  gagDurationMs: number;
}

const RIG_META: Record<CreatureId, RigMeta> = {
  pip: { eyeOriginY: -54, gagClass: 'gag-bounce', gagDurationMs: 700 },
  boobell: { eyeOriginY: -10, gagClass: 'gag-peekaboo', gagDurationMs: 950 },
  winnie: { eyeOriginY: -66, gagClass: 'gag-spell', gagDurationMs: 850 },
  barnaby: { eyeOriginY: -76, gagClass: 'gag-rattle', gagDurationMs: 950 },
  frankie: { eyeOriginY: -86, gagClass: 'gag-stomp', gagDurationMs: 800 },
  bitey: { eyeOriginY: -6, gagClass: 'gag-loop', gagDurationMs: 850 },
};

function renderMouth(x: number, y: number, scale = 1, cuteFangs = false): string {
  const fangMarkup = cuteFangs
    ? `<polygon points="-7,-1 -4.5,5 -2,-1" fill="#ffffff" /><polygon points="2,-1 4.5,5 7,-1" fill="#ffffff" />`
    : '';
  return `
    <g class="creature-mouth" data-mouth="smile" transform="translate(${x}, ${y}) scale(${scale})">
      <g data-shape="smile">
        <path d="M-11,-2 Q0,10 11,-2" fill="none" stroke="#260c2e" stroke-width="3.2" stroke-linecap="round" />
        ${fangMarkup}
      </g>
      <g data-shape="closed">
        <path d="M-9,1 Q0,4 9,1" fill="none" stroke="#260c2e" stroke-width="3.2" stroke-linecap="round" />
      </g>
      <g data-shape="small">
        <ellipse cx="0" cy="2" rx="5.5" ry="4.8" fill="#320b28" stroke="#260c2e" stroke-width="2" />
        <ellipse cx="0" cy="4.2" rx="3" ry="1.8" fill="#ff84ad" />
      </g>
      <g data-shape="open">
        <path d="M-10,-2 Q0,-4 10,-2 Q10,10 0,10 Q-10,10 -10,-2 Z" fill="#320b28" stroke="#260c2e" stroke-width="2.2" />
        <ellipse cx="0" cy="6.5" rx="5" ry="2.6" fill="#ff84ad" />
      </g>
      <g data-shape="wide">
        <path d="M-13,-3 Q0,-6 13,-3 Q13,15 0,15 Q-13,15 -13,-3 Z" fill="#320b28" stroke="#260c2e" stroke-width="2.4" />
        <path d="M-7,-3 L7,-3 L5,1 L-5,1 Z" fill="#ffffff" />
        <ellipse cx="0" cy="10" rx="6.8" ry="3.8" fill="#ff84ad" />
      </g>
    </g>
  `;
}

function renderEyes(
  leftX: number,
  rightX: number,
  y: number,
  radius = 8.5,
  irisColor = '#210e36',
): string {
  return `
    <g class="creature-eyes">
      <g transform="translate(${leftX}, ${y})">
        <circle cx="0" cy="0" r="${radius}" fill="#ffffff" stroke="#210e36" stroke-width="2.4" />
        <g class="creature-pupil">
          <circle cx="0" cy="0" r="${(radius * 0.52).toFixed(1)}" fill="${irisColor}" />
          <circle cx="1.6" cy="-1.8" r="${(radius * 0.2).toFixed(1)}" fill="#ffffff" />
        </g>
      </g>
      <g transform="translate(${rightX}, ${y})">
        <circle cx="0" cy="0" r="${radius}" fill="#ffffff" stroke="#210e36" stroke-width="2.4" />
        <g class="creature-pupil">
          <circle cx="0" cy="0" r="${(radius * 0.52).toFixed(1)}" fill="${irisColor}" />
          <circle cx="1.6" cy="-1.8" r="${(radius * 0.2).toFixed(1)}" fill="#ffffff" />
        </g>
      </g>
    </g>
  `;
}

function renderCharacterArtwork(id: CreatureId): string {
  switch (id) {
    case 'pip':
      return `
        <rect x="-46" y="-114" width="92" height="124" rx="28" fill="transparent" />
        <ellipse cx="0" cy="2" rx="34" ry="8" fill="#130824" opacity="0.4" />
        <!-- Bouncy boots -->
        <path d="M-15,-18 L-18,-2 Q-18,3 -10,3 L-6,3" fill="none" stroke="#3c1b5c" stroke-width="6.5" stroke-linecap="round" />
        <path d="M15,-18 L18,-2 Q18,3 25,3" fill="none" stroke="#3c1b5c" stroke-width="6.5" stroke-linecap="round" />
        <!-- Waving little arms -->
        <path d="M-36,-44 Q-52,-54 -48,-64" fill="none" stroke="#4e8f3d" stroke-width="5.5" stroke-linecap="round" />
        <path d="M36,-44 Q52,-54 48,-64" fill="none" stroke="#4e8f3d" stroke-width="5.5" stroke-linecap="round" />
        <!-- Curly green stem & leaf -->
        <path d="M-2,-82 Q4,-104 16,-99" fill="none" stroke="#5cc447" stroke-width="7.5" stroke-linecap="round" />
        <path d="M-3,-84 Q-18,-96 -22,-84 Q-12,-76 -3,-84 Z" fill="#6fe356" stroke="#275c1d" stroke-width="2" />
        <!-- Pumpkin body -->
        <ellipse cx="0" cy="-48" rx="42" ry="35" fill="#ff8324" stroke="#6d2200" stroke-width="3.6" />
        <ellipse cx="0" cy="-48" rx="24" ry="34.5" fill="#ff9636" stroke="#c94b00" stroke-width="2.4" />
        <ellipse cx="-12" cy="-58" rx="9" ry="5" fill="#ffbe6b" opacity="0.55" />
        <!-- Rosy cheeks -->
        <ellipse class="creature-cheek" cx="-22" cy="-42" rx="6.5" ry="3.8" fill="#ff5d8f" opacity="0.55" />
        <ellipse class="creature-cheek" cx="22" cy="-42" rx="6.5" ry="3.8" fill="#ff5d8f" opacity="0.55" />
        ${renderEyes(-14, 14, -55, 8.2)}
        ${renderMouth(0, -37, 1)}
        <g class="creature-hat-slot" transform="translate(0, -86)"></g>
      `;

    case 'boobell':
      return `
        <rect x="-46" y="-66" width="92" height="122" rx="28" fill="transparent" />
        <!-- Soft ghost glow & wispy tail -->
        <path d="M-34,12 Q-36,-44 0,-48 Q36,-44 34,12 Q36,34 22,26 Q11,38 0,26 Q-11,38 -22,26 Q-36,34 -34,12 Z" fill="#e8fff9" stroke="#53c7b4" stroke-width="3.5" stroke-linejoin="round" />
        <ellipse cx="0" cy="48" rx="24" ry="6" fill="#53c7b4" opacity="0.22" />
        <!-- Little floating arms -->
        <path d="M-32,-4 Q-45,-12 -40,-20" fill="none" stroke="#e8fff9" stroke-width="9" stroke-linecap="round" />
        <path d="M-32,-4 Q-45,-12 -40,-20" fill="none" stroke="#53c7b4" stroke-width="3" stroke-linecap="round" />
        <path d="M32,-4 Q45,-12 40,-20" fill="none" stroke="#e8fff9" stroke-width="9" stroke-linecap="round" />
        <path d="M32,-4 Q45,-12 40,-20" fill="none" stroke="#53c7b4" stroke-width="3" stroke-linecap="round" />
        <!-- Cute purple hair bow -->
        <g transform="translate(15, -45) rotate(14)">
          <polygon points="0,0 -13,-8 -11,8" fill="#c06bff" stroke="#2d124d" stroke-width="2.2" />
          <polygon points="0,0 13,-8 11,8" fill="#c06bff" stroke="#2d124d" stroke-width="2.2" />
          <circle cx="0" cy="0" r="4.5" fill="#ffd166" stroke="#2d124d" stroke-width="2" />
        </g>
        <ellipse class="creature-cheek" cx="-20" cy="0" rx="6.5" ry="3.8" fill="#ff85b3" opacity="0.7" />
        <ellipse class="creature-cheek" cx="20" cy="0" rx="6.5" ry="3.8" fill="#ff85b3" opacity="0.7" />
        ${renderEyes(-12, 12, -12, 8.2)}
        ${renderMouth(0, 6, 0.92)}
        <g class="creature-hat-slot" transform="translate(0, -52)"></g>
      `;

    case 'winnie':
      return `
        <rect x="-46" y="-128" width="92" height="136" rx="28" fill="transparent" />
        <ellipse cx="0" cy="2" rx="30" ry="7.5" fill="#130824" opacity="0.4" />
        <!-- Boots -->
        <path d="M-11,-14 L-12,0 L-19,0" fill="none" stroke="#26103d" stroke-width="6" stroke-linecap="round" />
        <path d="M11,-14 L12,0 L19,0" fill="none" stroke="#26103d" stroke-width="6" stroke-linecap="round" />
        <!-- Cozy witch cloak -->
        <path d="M-26,-10 L-18,-50 L18,-50 L26,-10 Q0,-4 -26,-10 Z" fill="#7d3ce0" stroke="#240e42" stroke-width="3.2" stroke-linejoin="round" />
        <polygon points="-4,-50 0,-38 4,-50" fill="#ffd166" />
        <!-- Star wand -->
        <g transform="translate(30, -34) rotate(18)">
          <line x1="0" y1="18" x2="0" y2="-16" stroke="#9e5a2e" stroke-width="4" stroke-linecap="round" />
          <polygon points="0,-24 3,-17 10,-16 5,-11 6,-4 0,-8 -6,-4 -5,-11 -10,-16 -3,-17" fill="#ffe066" stroke="#5e3200" stroke-width="1.5" />
        </g>
        <!-- Hair & Head -->
        <circle cx="-18" cy="-64" r="12" fill="#e86f38" stroke="#240e42" stroke-width="2.8" />
        <circle cx="18" cy="-64" r="12" fill="#e86f38" stroke="#240e42" stroke-width="2.8" />
        <circle cx="0" cy="-66" r="24" fill="#ffd7ba" stroke="#240e42" stroke-width="3.2" />
        <ellipse class="creature-cheek" cx="-14" cy="-58" rx="4.8" ry="2.8" fill="#ff7ca8" opacity="0.65" />
        <ellipse class="creature-cheek" cx="14" cy="-58" rx="4.8" ry="2.8" fill="#ff7ca8" opacity="0.65" />
        ${renderEyes(-9.5, 9.5, -67, 6.8)}
        <!-- Cute round witch glasses -->
        <circle cx="-9.5" cy="-67" r="9.5" fill="none" stroke="#6ef3b3" stroke-width="2.4" />
        <circle cx="9.5" cy="-67" r="9.5" fill="none" stroke="#6ef3b3" stroke-width="2.4" />
        <line x1="0" y1="-67" x2="0" y2="-67" stroke="#6ef3b3" stroke-width="2.4" />
        ${renderMouth(0, -52, 0.85)}
        <!-- Crooked starry witch hat -->
        <g class="winnie-hat" transform="translate(0, -83)">
          <ellipse cx="0" cy="0" rx="33" ry="7.5" fill="#3a1863" stroke="#1b0a33" stroke-width="3" />
          <path d="M-19,-1 L-6,-36 Q0,-44 13,-28 L19,-1 Z" fill="#4f2285" stroke="#1b0a33" stroke-width="3" stroke-linejoin="round" />
          <path d="M-16,-6 Q0,-2 16,-6" fill="none" stroke="#ffd166" stroke-width="4" />
          <circle cx="-2" cy="-20" r="3" fill="#ffd166" />
        </g>
        <g class="creature-hat-slot" transform="translate(0, -118)"></g>
      `;

    case 'barnaby':
      return `
        <rect x="-44" y="-122" width="88" height="130" rx="26" fill="transparent" />
        <ellipse cx="0" cy="2" rx="28" ry="7" fill="#130824" opacity="0.4" />
        <!-- Legs & bony shoes -->
        <line x1="-10" y1="-26" x2="-11" y2="-2" stroke="#f7f1ff" stroke-width="6.5" stroke-linecap="round" />
        <line x1="10" y1="-26" x2="11" y2="-2" stroke="#f7f1ff" stroke-width="6.5" stroke-linecap="round" />
        <ellipse cx="-14" cy="0" rx="9" ry="4.5" fill="#f7f1ff" stroke="#24113b" stroke-width="2.4" />
        <ellipse cx="14" cy="0" rx="9" ry="4.5" fill="#f7f1ff" stroke="#24113b" stroke-width="2.4" />
        <!-- Rattling ribcage torso -->
        <g class="barnaby-torso">
          <rect x="-15" y="-56" width="30" height="32" rx="10" fill="#f7f1ff" stroke="#24113b" stroke-width="3" />
          <line x1="-11" y1="-47" x2="11" y2="-47" stroke="#6c4594" stroke-width="3" stroke-linecap="round" />
          <line x1="-11" y1="-40" x2="11" y2="-40" stroke="#ff9234" stroke-width="3" stroke-linecap="round" />
          <line x1="-10" y1="-33" x2="10" y2="-33" stroke="#6ef3b3" stroke-width="3" stroke-linecap="round" />
          <!-- Arms -->
          <path d="M-16,-50 L-32,-34" stroke="#f7f1ff" stroke-width="6" stroke-linecap="round" />
          <path d="M16,-50 L32,-34" stroke="#f7f1ff" stroke-width="6" stroke-linecap="round" />
          <!-- Cozy purple scarf -->
          <rect x="-17" y="-61" width="34" height="9" rx="4.5" fill="#9d6bff" stroke="#24113b" stroke-width="2.5" />
          <path d="M7,-55 L14,-41 L21,-43 L14,-56 Z" fill="#ffd166" stroke="#24113b" stroke-width="2" />
        </g>
        <!-- Friendly rounded skull -->
        <g class="barnaby-head">
          <rect x="-24" y="-98" width="48" height="42" rx="21" fill="#f8f4ff" stroke="#24113b" stroke-width="3.2" />
          <ellipse cx="0" cy="-68" rx="3" ry="2.2" fill="#5b3d85" />
          ${renderEyes(-10, 10, -78, 7.6, '#391963')}
          ${renderMouth(0, -60, 0.9)}
        </g>
        <g class="creature-hat-slot" transform="translate(0, -100)"></g>
      `;

    case 'frankie':
      return `
        <rect x="-54" y="-134" width="108" height="142" rx="30" fill="transparent" />
        <ellipse cx="0" cy="2" rx="38" ry="8.5" fill="#130824" opacity="0.42" />
        <!-- Big cozy monster feet & legs -->
        <rect x="-22" y="-22" width="16" height="22" rx="6" fill="#4f377a" stroke="#210e36" stroke-width="3" />
        <rect x="6" y="-22" width="16" height="22" rx="6" fill="#4f377a" stroke="#210e36" stroke-width="3" />
        <!-- Gentle arms -->
        <path d="M-32,-54 Q-50,-42 -42,-26" fill="none" stroke="#85e898" stroke-width="12" stroke-linecap="round" />
        <path d="M-32,-54 Q-50,-42 -42,-26" fill="none" stroke="#22592e" stroke-width="2.5" stroke-linecap="round" />
        <path d="M32,-54 Q50,-42 42,-26" fill="none" stroke="#85e898" stroke-width="12" stroke-linecap="round" />
        <path d="M32,-54 Q50,-42 42,-26" fill="none" stroke="#22592e" stroke-width="2.5" stroke-linecap="round" />
        <!-- Overalls torso -->
        <rect x="-32" y="-62" width="64" height="44" rx="14" fill="#6b46ab" stroke="#210e36" stroke-width="3.5" />
        <rect x="-14" y="-48" width="28" height="18" rx="6" fill="#895fd4" stroke="#210e36" stroke-width="2.2" />
        <circle cx="-18" cy="-54" r="4" fill="#ffd166" />
        <circle cx="18" cy="-54" r="4" fill="#ffd166" />
        <!-- Golden neck bolts -->
        <rect x="-38" y="-76" width="12" height="8" rx="3" fill="#ffd166" stroke="#210e36" stroke-width="2.2" />
        <rect x="26" y="-76" width="12" height="8" rx="3" fill="#ffd166" stroke="#210e36" stroke-width="2.2" />
        <!-- Blocky lovable green head -->
        <rect x="-29" y="-110" width="58" height="48" rx="18" fill="#85e898" stroke="#22592e" stroke-width="3.5" />
        <!-- Cute zig-zag hair tuft -->
        <path d="M-24,-108 L-16,-119 L-6,-109 L4,-122 L14,-109 L24,-118 L24,-104 Q0,-98 -24,-104 Z" fill="#2e184f" />
        <ellipse class="creature-cheek" cx="-18" cy="-76" rx="5.5" ry="3.2" fill="#ff7ca8" opacity="0.55" />
        <ellipse class="creature-cheek" cx="18" cy="-76" rx="5.5" ry="3.2" fill="#ff7ca8" opacity="0.55" />
        ${renderEyes(-11, 11, -88, 7.6)}
        ${renderMouth(0, -72, 1)}
        <g class="creature-hat-slot" transform="translate(0, -116)"></g>
      `;

    case 'bitey':
      return `
        <rect x="-54" y="-48" width="108" height="92" rx="28" fill="transparent" />
        <!-- Flapping bat wings -->
        <path class="wing-left" d="M-16,-4 Q-46,-28 -52,-4 Q-40,12 -32,6 Q-24,18 -14,8 Z" fill="#5e2d91" stroke="#200b3b" stroke-width="3" stroke-linejoin="round" />
        <path class="wing-right" d="M16,-4 Q46,-28 52,-4 Q40,12 32,6 Q24,18 14,8 Z" fill="#5e2d91" stroke="#200b3b" stroke-width="3" stroke-linejoin="round" />
        <!-- Little bat ears -->
        <polygon points="-18,-16 -26,-38 -6,-24" fill="#7d44ba" stroke="#200b3b" stroke-width="3" stroke-linejoin="round" />
        <polygon points="-17,-20 -22,-32 -10,-23" fill="#ff9ee0" />
        <polygon points="18,-16 26,-38 6,-24" fill="#7d44ba" stroke="#200b3b" stroke-width="3" stroke-linejoin="round" />
        <polygon points="17,-20 22,-32 10,-23" fill="#ff9ee0" />
        <!-- Chubby body -->
        <ellipse cx="0" cy="0" rx="24" ry="22" fill="#8b52c9" stroke="#200b3b" stroke-width="3.2" />
        <ellipse cx="0" cy="7" rx="14" ry="11" fill="#b78ae8" opacity="0.65" />
        <!-- Cute tiny feet -->
        <path d="M-8,21 L-10,29 M8,21 L10,29" stroke="#ffd166" stroke-width="3.5" stroke-linecap="round" />
        <ellipse class="creature-cheek" cx="-14" cy="2" rx="4.5" ry="2.6" fill="#ff85b3" opacity="0.7" />
        <ellipse class="creature-cheek" cx="14" cy="2" rx="4.5" ry="2.6" fill="#ff85b3" opacity="0.7" />
        ${renderEyes(-9, 9, -6, 6.8)}
        ${renderMouth(0, 8, 0.85, true)}
        <g class="creature-hat-slot" transform="translate(0, -25)"></g>
      `;
  }
}

export function createCreatureRig(config: CreatureConfig): CreatureInstance {
  const meta = RIG_META[config.id];
  const root = document.createElementNS(SVG_NS, 'g');
  root.classList.add('creature-root', `creature-${config.id}`);
  root.setAttribute('data-creature', config.id);
  root.setAttribute('transform', `translate(${config.homeX}, ${config.homeY})`);

  root.innerHTML = `
    <g class="creature-flip" transform="scale(1, 1)">
      <g class="creature-interactive" role="button" tabindex="0" aria-label="Talk to ${config.title}">
        <g class="creature-motion">
          ${renderCharacterArtwork(config.id)}
        </g>
      </g>
    </g>
  `.trim();

  const flipEl = root.querySelector('.creature-flip') as SVGGElement;
  const motionEl = root.querySelector('.creature-motion') as SVGGElement;
  const mouthEl = root.querySelector('.creature-mouth') as SVGGElement;
  const hatSlotEl = root.querySelector('.creature-hat-slot') as SVGGElement;
  const pupils = Array.from(root.querySelectorAll<SVGGElement>('.creature-pupil'));

  let currentX = config.homeX;
  let currentY = config.homeY;
  let currentFacing: 1 | -1 = 1;
  let gagTimer = 0;

  return {
    config,
    root,
    setPosition(x: number, y: number, facing: 1 | -1): void {
      currentX = x;
      currentY = y;
      currentFacing = facing;
      root.setAttribute('transform', `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);
      flipEl.setAttribute('transform', `scale(${facing}, 1)`);
    },
    setMouth(shape: MouthShape): void {
      if (mouthEl.getAttribute('data-mouth') !== shape) {
        mouthEl.setAttribute('data-mouth', shape);
      }
    },
    lookAt(svgX: number, svgY: number): void {
      const dx = (svgX - currentX) * currentFacing;
      const dy = svgY - (currentY + meta.eyeOriginY);
      const dist = Math.hypot(dx, dy) || 1;
      const mag = Math.min(3.1, dist / 45);
      const px = (dx / dist) * mag;
      const py = (dy / dist) * mag;
      const transform = `translate(${px.toFixed(2)}, ${py.toFixed(2)})`;
      for (const pupil of pupils) {
        pupil.setAttribute('transform', transform);
      }
    },
    playTapGag(): void {
      window.clearTimeout(gagTimer);
      motionEl.classList.remove(meta.gagClass);
      void motionEl.getBoundingClientRect();
      motionEl.classList.add(meta.gagClass);
      gagTimer = window.setTimeout(() => {
        motionEl.classList.remove(meta.gagClass);
      }, meta.gagDurationMs);
    },
    setCostume(costumeId: string | null): void {
      hatSlotEl.innerHTML = '';
      if (!costumeId) return;
      const badge = document.createElementNS(SVG_NS, 'circle');
      badge.setAttribute('cx', '0');
      badge.setAttribute('cy', '-4');
      badge.setAttribute('r', '5');
      badge.setAttribute('fill', '#ffd166');
      badge.setAttribute('data-costume', costumeId);
      hatSlotEl.appendChild(badge);
    },
  };
}
