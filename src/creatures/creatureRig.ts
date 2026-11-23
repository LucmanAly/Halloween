import { renderCharacterArtwork } from './creatureArtwork.ts';
import {
  CREATURE_ACCESSORY_ANCHORS,
  getCostumeDef,
  renderCostumeMarkup,
} from './costumes.ts';
import type { CreatureConfig, CreatureId, CreatureInstance, MouthShape } from './types.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface RigMeta {
  eyeOriginY: number;
  gagClass: string;
  gagDurationMs: number;
}

const RIG_META: Record<CreatureId, RigMeta> = {
  pip: { eyeOriginY: -60, gagClass: 'gag-bounce', gagDurationMs: 700 },
  boobell: { eyeOriginY: -14, gagClass: 'gag-peekaboo', gagDurationMs: 950 },
  winnie: { eyeOriginY: -65, gagClass: 'gag-spell', gagDurationMs: 850 },
  barnaby: { eyeOriginY: -93, gagClass: 'gag-rattle', gagDurationMs: 950 },
  frankie: { eyeOriginY: -94, gagClass: 'gag-stomp', gagDurationMs: 800 },
  bitey: { eyeOriginY: -10, gagClass: 'gag-loop', gagDurationMs: 850 },
};

function buildAccessoryMarkup(id: CreatureId, costumeId: string | null | undefined): string {
  if (!costumeId) return '';
  const def = getCostumeDef(costumeId);
  if (!def) return '';
  const anchor = CREATURE_ACCESSORY_ANCHORS[id][def.slot];
  return `<g data-costume="${costumeId}" transform="translate(0, ${anchor.y}) scale(${anchor.scale})">${renderCostumeMarkup(costumeId)}</g>`;
}

const ART_BOUNDS: Record<CreatureId, [number, number, number, number]> = {
  pip: [-68, -145, 136, 152],
  boobell: [-64, -110, 128, 172],
  winnie: [-75, -155, 150, 163],
  barnaby: [-58, -173, 116, 181],
  frankie: [-64, -183, 128, 191],
  bitey: [-80, -98, 160, 144],
};

export function renderCreatureArtSvg(id: CreatureId, costumeId?: string | null): string {
  const def = costumeId ? getCostumeDef(costumeId) : undefined;
  const hatClass = def?.slot === 'hat' ? ' has-hat-costume' : '';
  const accessoryMarkup = buildAccessoryMarkup(id, costumeId);
  return `
    <svg viewBox="${ART_BOUNDS[id].join(' ')}" class="creature-portrait-svg creature-${id}${hatClass}" aria-hidden="true">
      ${renderCharacterArtwork(id)}
      ${accessoryMarkup}
    </svg>
  `.trim();
}

export function createCreatureRig(config: CreatureConfig): CreatureInstance {
  const meta = RIG_META[config.id];
  const root = document.createElementNS(SVG_NS, 'g');
  root.classList.add('creature-root', `creature-${config.id}`);
  root.setAttribute('data-creature', config.id);
  root.setAttribute('transform', `translate(${config.homeX}, ${config.homeY})`);

  const [x, y, width, height] = ART_BOUNDS[config.id];
  const touchInset = config.locomotion === 'walk' ? 29 : 23;
  root.innerHTML = `
    <g class="creature-flip" transform="scale(1, 1)">
      <g class="creature-interactive" role="button" tabindex="0" aria-label="Talk to ${config.title}">
        <g class="creature-motion">
          <rect x="${x}" y="${y + touchInset}" width="${width}" height="${height - touchInset}" rx="24" fill="transparent" />
          ${config.locomotion === 'walk' ? '<ellipse cy="3" rx="34" ry="6" fill="#100d25" opacity=".3" pointer-events="none" />' : ''}
          ${renderCharacterArtwork(config.id)}
          <g class="creature-hat-slot"></g>
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
      const def = costumeId ? getCostumeDef(costumeId) : undefined;
      root.classList.toggle('has-hat-costume', def?.slot === 'hat');
      hatSlotEl.innerHTML = buildAccessoryMarkup(config.id, costumeId);
    },
  };
}
