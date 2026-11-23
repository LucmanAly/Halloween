import { audioEngine } from '../core/audioEngine.ts';
import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';
import { renderCreatureArtSvg } from '../creatures/creatureRig.ts';
import type { ActivityController, ActivityDeps } from './types.ts';

interface IngredientDef {
  id: 'moon-cheese' | 'giggle-berries' | 'glow-worms' | 'candy-corn' | 'rainbow-slime';
  name: string;
  emoji: string;
  color: string;
}

interface PotionRecipe {
  id: string;
  name: string;
  emoji: string;
  brewColor: string;
  caption: string;
  canonical: [IngredientDef['id'], IngredientDef['id'], IngredientDef['id']];
}

const INGREDIENTS: readonly IngredientDef[] = [
  { id: 'moon-cheese', name: 'Moon Cheese', emoji: '🧀', color: '#ffe066' },
  { id: 'giggle-berries', name: 'Giggle Berries', emoji: '🫐', color: '#9d6bff' },
  { id: 'glow-worms', name: 'Glow Worms', emoji: '🐛', color: '#a9ff5e' },
  { id: 'candy-corn', name: 'Candy Corn', emoji: '🌽', color: '#ff9234' },
  { id: 'rainbow-slime', name: 'Rainbow Slime', emoji: '🌈', color: '#ff7eb6' },
];

export const POTION_RECIPES: readonly PotionRecipe[] = [
  {
    id: 'bubble-explosion',
    name: 'Mega Bubble Blast',
    emoji: '🫧',
    brewColor: '#7ef9ff',
    caption: 'Pop, pop, hooray! Giant rainbow bubbles!',
    canonical: ['giggle-berries', 'rainbow-slime', 'rainbow-slime'],
  },
  {
    id: 'star-shower',
    name: 'Wishing Star Fireworks',
    emoji: '🌠',
    brewColor: '#ffd166',
    caption: 'Boom-sparkle! Wishing stars across the sky!',
    canonical: ['moon-cheese', 'candy-corn', 'rainbow-slime'],
  },
  {
    id: 'candy-fountain',
    name: 'Candy Corn Fountain',
    emoji: '🍬',
    brewColor: '#ff9234',
    caption: 'Sweet! Extra Magic Candy rained down!',
    canonical: ['candy-corn', 'candy-corn', 'moon-cheese'],
  },
  {
    id: 'frog-hop',
    name: 'Bouncy Frog Hop',
    emoji: '🐸',
    brewColor: '#6ef3b3',
    caption: 'Ribbit-boing! Silly frogs are hopping around!',
    canonical: ['glow-worms', 'giggle-berries', 'rainbow-slime'],
  },
  {
    id: 'rainbow-glitter',
    name: 'Glitter Tornado',
    emoji: '🌈',
    brewColor: '#ff7eb6',
    caption: 'Whoosh! Rainbow glitter everywhere!',
    canonical: ['rainbow-slime', 'candy-corn', 'giggle-berries'],
  },
  {
    id: 'giggle-hiccups',
    name: 'Giggle Hiccup Brew',
    emoji: '🤭',
    brewColor: '#c98aff',
    caption: 'Hiccup-heehee! Even the bubbles are giggling!',
    canonical: ['giggle-berries', 'giggle-berries', 'moon-cheese'],
  },
  {
    id: 'cheese-moonbeam',
    name: 'Cheese Moonbeam',
    emoji: '🧀',
    brewColor: '#ffe878',
    caption: 'Glowy moon-cheese sparkles lit up the night!',
    canonical: ['moon-cheese', 'moon-cheese', 'glow-worms'],
  },
  {
    id: 'firefly-fiesta',
    name: 'Firefly Fiesta',
    emoji: '✨',
    brewColor: '#a4ff42',
    caption: 'Bzz-sparkle! Firefly party lights!',
    canonical: ['glow-worms', 'glow-worms', 'candy-corn'],
  },
];

function comboKey(ids: readonly IngredientDef['id'][]): string {
  return [...ids].sort().join('|');
}

const CANONICAL_LOOKUP = new Map<string, PotionRecipe>(
  POTION_RECIPES.map((recipe) => [comboKey(recipe.canonical), recipe]),
);

function resolveRecipe(picked: readonly IngredientDef['id'][]): PotionRecipe {
  const exact = CANONICAL_LOOKUP.get(comboKey(picked));
  if (exact) return exact;

  // Deterministic order-independent hash over the 5 ingredients so all 35 3-combos map cleanly
  const indexMap = new Map(INGREDIENTS.map((item, idx) => [item.id, idx + 1]));
  const sorted = [...picked].sort();
  let sum = 0;
  sorted.forEach((id, i) => {
    sum += (indexMap.get(id) ?? 1) * (i + 3);
  });
  return POTION_RECIPES[sum % POTION_RECIPES.length];
}

export class CauldronGame implements ActivityController {
  readonly id = 'cauldron' as const;
  private readonly deps: ActivityDeps;
  private readonly onRequestClose: () => void;

  private openState = false;
  private selected: IngredientDef['id'][] = [];
  private backdropEl: HTMLElement | null = null;
  private ghostEl: HTMLElement | null = null;
  private activeDragId: IngredientDef['id'] | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private isDragging = false;
  private stirAccum = 0;
  private lastStirAngle: number | null = null;
  private suppressNextClickUntil = 0;
  private lastResultText = 'Tap or drag 3 silly ingredients into Winnie\'s pot!';
  private timers: number[] = [];

  private readonly onWindowPointerMove = (e: PointerEvent) => this.handleDragMove(e);
  private readonly onWindowPointerUp = (e: PointerEvent) => this.handleDragEnd(e);

  constructor(deps: ActivityDeps, onRequestClose: () => void) {
    this.deps = deps;
    this.onRequestClose = onRequestClose;
  }

  isOpen(): boolean {
    return this.openState;
  }

  open(): void {
    if (this.openState) return;
    this.openState = true;
    this.selected = [];
    this.stirAccum = 0;
    this.lastStirAngle = null;
    this.lastResultText = 'Tap or drag 3 silly ingredients into Winnie\'s pot!';

    this.deps.worldEvents.setPaused(true);
    this.deps.banterDirector.setActivityMode(true);
    this.render('.ingredient-btn');

    window.addEventListener('pointermove', this.onWindowPointerMove);
    window.addEventListener('pointerup', this.onWindowPointerUp);
    window.addEventListener('pointercancel', this.onWindowPointerUp);
  }

  close(): void {
    if (!this.openState) return;
    this.openState = false;
    this.cleanupDrag();
    for (const id of this.timers) {
      window.clearTimeout(id);
    }
    this.timers = [];
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    window.removeEventListener('pointerup', this.onWindowPointerUp);
    window.removeEventListener('pointercancel', this.onWindowPointerUp);

    this.backdropEl?.remove();
    this.backdropEl = null;
    this.deps.stageFxLayer.innerHTML = '';
    this.deps.voiceManager.stopAll();
    this.deps.banterDirector.setActivityMode(false);
    this.deps.worldEvents.setPaused(false);
  }

  private render(focusSelector?: string): void {
    this.deps.activityLayer.innerHTML = '';
    const backdrop = document.createElement('div');
    backdrop.className = 'activity-backdrop';
    this.backdropEl = backdrop;

    const state = gameState.get();
    const discoveredSet = new Set(state.potionsDiscovered);
    const winnieSvg = renderCreatureArtSvg('winnie', state.equippedCostumes.winnie ?? null);

    const brewColor =
      this.selected.length === 0
        ? '#a4ff42'
        : INGREDIENTS.find((i) => i.id === this.selected[this.selected.length - 1])?.color ??
          '#a4ff42';

    const slotsHtml = [0, 1, 2]
      .map((idx) => {
        const ingId = this.selected[idx];
        const ing = INGREDIENTS.find((item) => item.id === ingId);
        return `<div class="cauldron-slot ${ing ? 'is-filled' : ''}" aria-label="${
          ing ? ing.name : `Empty slot ${idx + 1}`
        }">${ing ? ing.emoji : '✨'}</div>`;
      })
      .join('');

    const shelfHtml = INGREDIENTS.map(
      (ing) => `
      <button
        type="button"
        class="ingredient-btn"
        data-ingredient="${ing.id}"
        ${this.selected.length >= 3 ? 'disabled' : ''}
        aria-label="Add ${ing.name}"
      >
        <span class="ingredient-emoji" aria-hidden="true">${ing.emoji}</span>
        <span>${ing.name}</span>
      </button>
    `,
    ).join('');

    const spellsHtml = POTION_RECIPES.map((recipe) => {
      const unlocked = discoveredSet.has(recipe.id);
      const hintEmojis = recipe.canonical
        .map((id) => INGREDIENTS.find((ing) => ing.id === id)?.emoji ?? '✨')
        .join(' ');
      const easyHintEmoji =
        INGREDIENTS.find((ing) => ing.id === recipe.canonical[0])?.emoji ?? '✨';
      const subtitle = unlocked
        ? `${hintEmojis} · Tap to brew`
        : state.ageMode === 'easy'
          ? `Hint: ${easyHintEmoji} + ? + ?`
          : 'Mix 3 to discover!';

      return `
        <button
          type="button"
          class="spell-card ${unlocked ? 'is-discovered' : ''}"
          data-recipe-id="${recipe.id}"
          ${unlocked ? '' : 'disabled'}
        >
          <span class="spell-card-top">
            <span aria-hidden="true">${unlocked ? recipe.emoji : '❓'}</span>
            <span>${unlocked ? recipe.name : 'Mystery Spell'}</span>
          </span>
          <span>${subtitle}</span>
        </button>
      `;
    }).join('');

    const canBrew = this.selected.length === 3;
    const stirHint = canBrew
      ? 'Swirl inside the pot OR tap Brew Spell!'
      : `Pick ${3 - this.selected.length} more silly ingredient${
          3 - this.selected.length === 1 ? '' : 's'
        }!`;

    backdrop.innerHTML = `
      <section class="activity-card" role="dialog" aria-modal="true" aria-labelledby="cauldron-title">
        <div class="activity-header">
          <div class="activity-title-group">
            <span class="activity-title-emoji" aria-hidden="true">🧪</span>
            <div>
              <h2 id="cauldron-title" class="activity-title">Winnie's Wacky Cauldron</h2>
              <p class="activity-subtitle">Discover all ${POTION_RECIPES.length} silly Halloween spells!</p>
            </div>
          </div>
          <button type="button" class="activity-close-btn" aria-label="Close cauldron">✕</button>
        </div>

        <div class="cauldron-layout">
          <div class="cauldron-workbench">
            <div class="cauldron-top-row">
              <div class="cauldron-winnie-mini">${winnieSvg}</div>
              <div class="cauldron-slots">${slotsHtml}</div>
            </div>

            <div class="cauldron-pot-zone ${canBrew ? 'is-drop-ready' : ''}" id="cauldron-pot-zone">
              <svg class="cauldron-pot-svg" viewBox="-90 -75 180 140" aria-hidden="true">
                <rect x="-46" y="40" width="92" height="14" rx="7" fill="#543022" stroke="#26120b" stroke-width="2.5" />
                <path d="M-34,46 Q-24,14 -10,40 Q0,8 14,38 Q26,16 36,46 Z" fill="#ff7c1f" />
                <path d="M-18,46 Q-10,24 0,42 Q10,22 20,46 Z" fill="#ffe156" />
                <ellipse cx="0" cy="8" rx="64" ry="44" fill="#2c2540" stroke="#151024" stroke-width="4.5" />
                <g class="cauldron-ladle" transform="translate(18, -40) rotate(18)">
                  <rect x="-5" y="-26" width="10" height="46" rx="5" fill="#b8743f" stroke="#3b1d0c" stroke-width="2.5" />
                </g>
                <ellipse cx="0" cy="-24" rx="58" ry="16" fill="#3b3254" stroke="#151024" stroke-width="4" />
                <ellipse cx="0" cy="-24" rx="48" ry="11" fill="${brewColor}" />
              </svg>
            </div>

            <p class="cauldron-stir-hint">${stirHint}</p>

            <div class="ingredient-shelf">${shelfHtml}</div>

            <div class="cauldron-actions">
              <button type="button" class="kid-secondary-btn" id="cauldron-clear-btn" ${
                this.selected.length === 0 ? 'disabled' : ''
              }>
                🔄 Empty Pot
              </button>
              <button type="button" class="kid-action-btn" id="cauldron-brew-btn" ${
                canBrew ? '' : 'disabled'
              }>
                🪄 Brew Spell!
              </button>
            </div>
          </div>

          <div class="spellbook-panel">
            <h3 class="spellbook-heading">
              <span>📖 Spell Book</span>
              <span>${discoveredSet.size} / ${POTION_RECIPES.length}</span>
            </h3>
            <div class="spellbook-grid">${spellsHtml}</div>
            <div class="spell-banner" role="status">${this.lastResultText}</div>
          </div>
        </div>
      </section>
    `;

    this.deps.activityLayer.appendChild(backdrop);
    this.bindRenderedControls();
    if (focusSelector) {
      backdrop.querySelector<HTMLElement>(focusSelector)?.focus();
    }
  }

  private bindRenderedControls(): void {
    if (!this.backdropEl) return;

    this.backdropEl
      .querySelector('.activity-close-btn')
      ?.addEventListener('click', () => this.onRequestClose());

    this.backdropEl.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) {
        this.onRequestClose();
      }
    });

    this.backdropEl.querySelectorAll<HTMLButtonElement>('.ingredient-btn').forEach((btn) => {
      const ingId = btn.dataset.ingredient as IngredientDef['id'] | undefined;
      if (!ingId) return;

      btn.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || this.selected.length >= 3) return;
        this.activeDragId = ingId;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.isDragging = false;
      });

      btn.addEventListener('click', () => {
        // Keyboard Enter/Space or direct click when drag did not consume
        if (this.isDragging || performance.now() < this.suppressNextClickUntil) return;
        this.addIngredient(ingId, btn.getBoundingClientRect());
      });
    });

    const potZone = this.backdropEl.querySelector<HTMLElement>('#cauldron-pot-zone');
    potZone?.addEventListener('pointermove', (e) => {
      if (this.selected.length < 3 || this.activeDragId) return;
      const rect = potZone.getBoundingClientRect();
      const angle = Math.atan2(
        e.clientY - (rect.top + rect.height * 0.5),
        e.clientX - (rect.left + rect.width * 0.5),
      );
      if (this.lastStirAngle !== null) {
        let delta = angle - this.lastStirAngle;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        this.stirAccum += Math.abs(delta);
        potZone.classList.add('is-stirring');
        if (this.stirAccum >= Math.PI * 2.1) {
          this.stirAccum = 0;
          this.lastStirAngle = null;
          this.brewCurrentPotion();
        }
      }
      this.lastStirAngle = angle;
    });

    this.backdropEl.querySelector('#cauldron-clear-btn')?.addEventListener('click', () => {
      audioEngine.playBubblePop(0);
      this.selected = [];
      this.stirAccum = 0;
      this.render('.ingredient-btn');
    });

    this.backdropEl.querySelector('#cauldron-brew-btn')?.addEventListener('click', () => {
      this.brewCurrentPotion();
    });

    this.backdropEl.querySelectorAll<HTMLButtonElement>('.spell-card.is-discovered').forEach((card) => {
      card.addEventListener('click', () => {
        const recipe = POTION_RECIPES.find((r) => r.id === card.dataset.recipeId);
        if (!recipe) return;
        this.selected = [...recipe.canonical];
        audioEngine.playIngredientDrop(2);
        this.render('#cauldron-brew-btn');
      });
    });
  }

  private handleDragMove(e: PointerEvent): void {
    if (!this.activeDragId) return;
    const dist = Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY);
    if (!this.isDragging && dist > 6) {
      this.isDragging = true;
      const ing = INGREDIENTS.find((i) => i.id === this.activeDragId);
      if (ing) {
        this.ghostEl = document.createElement('div');
        this.ghostEl.className = 'cauldron-drag-ghost';
        this.ghostEl.textContent = ing.emoji;
        document.body.appendChild(this.ghostEl);
      }
    }
    if (this.isDragging && this.ghostEl) {
      this.ghostEl.style.left = `${e.clientX}px`;
      this.ghostEl.style.top = `${e.clientY}px`;
      const pot = this.backdropEl?.querySelector('#cauldron-pot-zone');
      if (pot) {
        const r = pot.getBoundingClientRect();
        const inside =
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom;
        pot.classList.toggle('is-drop-ready', inside);
      }
    }
  }

  private handleDragEnd(e: PointerEvent): void {
    if (!this.activeDragId) return;
    const ingId = this.activeDragId;
    const wasDragging = this.isDragging;
    if (wasDragging) {
      this.suppressNextClickUntil = performance.now() + 200;
    }
    this.cleanupDrag();

    if (wasDragging) {
      const pot = this.backdropEl?.querySelector('#cauldron-pot-zone');
      if (pot) {
        const r = pot.getBoundingClientRect();
        const inside =
          e.clientX >= r.left - 24 &&
          e.clientX <= r.right + 24 &&
          e.clientY >= r.top - 24 &&
          e.clientY <= r.bottom + 24;
        if (inside) {
          this.addIngredient(ingId, r);
        }
      }
    }
  }

  private cleanupDrag(): void {
    this.activeDragId = null;
    this.isDragging = false;
    this.ghostEl?.remove();
    this.ghostEl = null;
  }

  private addIngredient(ingId: IngredientDef['id'], sourceRect: DOMRect): void {
    if (this.selected.length >= 3) return;
    const ing = INGREDIENTS.find((item) => item.id === ingId);
    if (!ing) return;

    this.selected.push(ingId);
    audioEngine.playIngredientDrop(this.selected.length - 1);
    this.deps.particles.spawnBurst(
      sourceRect.left + sourceRect.width * 0.5,
      sourceRect.top + sourceRect.height * 0.5,
      [ing.color, '#ffffff', '#ffd166'],
      10,
      'bubble',
    );
    this.render(
      this.selected.length === 3 ? '#cauldron-brew-btn' : `[data-ingredient="${ingId}"]`,
    );
  }

  private brewCurrentPotion(): void {
    if (this.selected.length !== 3) return;
    const recipe = resolveRecipe(this.selected);
    const isNew = gameState.discoverPotion(recipe.id);
    const reward = isNew ? 8 : 5;

    audioEngine.playCauldronSplash();
    audioEngine.playPotionBrew();
    this.triggerSpellEffect(recipe);

    const winnie = this.deps.banterDirector.getCreature('winnie');
    if (winnie) {
      void this.deps.voiceManager.speakCategory(winnie, 'tap_gag', {
        bubblePos: { x: window.innerWidth * 0.5, y: 120 },
        animateCreature: false,
      });
    }

    const potRect = this.backdropEl?.querySelector('#cauldron-pot-zone')?.getBoundingClientRect();
    const cx = potRect ? potRect.left + potRect.width * 0.5 : window.innerWidth * 0.5;
    const cy = potRect ? potRect.top + potRect.height * 0.35 : window.innerHeight * 0.5;
    gameState.addCandy(reward, cx, cy, `potion:${recipe.id}`);

    this.lastResultText = `${recipe.emoji} ${recipe.name}! ${recipe.caption} (+${reward} 🍬${
      isNew ? ' · NEW SPELL!' : ''
    })`;
    this.selected = [];
    this.stirAccum = 0;
    this.render('.ingredient-btn');
  }

  private triggerSpellEffect(recipe: PotionRecipe): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    eventBus.emit('world:burst', {
      x: w * 0.5,
      y: h * 0.45,
      colors: [recipe.brewColor, '#ffd166', '#ffffff', '#ff7eb6'],
      count: 28,
      shape: 'star',
    });

    switch (recipe.id) {
      case 'bubble-explosion':
        this.deps.particles.spawnBubbleStorm(22);
        break;
      case 'star-shower':
        this.deps.particles.spawnShootingStars(8);
        [0.25, 0.5, 0.75].forEach((ratio, idx) => {
          this.timers.push(
            window.setTimeout(() => {
              this.deps.particles.spawnBurst(
                w * ratio,
                h * 0.3,
                ['#ffd166', '#fff7b0', '#72d6ff'],
                22,
                'star',
              );
            }, idx * 180),
          );
        });
        break;
      case 'candy-fountain':
        gameState.addCandy(3, w * 0.5, h * 0.45, 'potion:candy-bonus');
        [0.35, 0.5, 0.65].forEach((ratio, idx) => {
          this.timers.push(
            window.setTimeout(() => {
              this.deps.particles.spawnBurst(
                w * ratio,
                h * 0.45,
                ['#ff9234', '#ffd166', '#ff7eb6', '#6ef3b3'],
                22,
                'candy',
              );
            }, idx * 140),
          );
        });
        break;
      case 'frog-hop': {
        audioEngine.playPumpkinBoing();
        this.deps.stageFxLayer.innerHTML = '';
        for (let i = 0; i < 7; i++) {
          const frog = document.createElement('div');
          frog.className = 'frog-hopper';
          frog.textContent = '🐸';
          frog.style.left = `${10 + i * 11}%`;
          frog.style.animationDelay = `${i * 120}ms`;
          this.deps.stageFxLayer.appendChild(frog);
        }
        this.timers.push(
          window.setTimeout(() => {
            this.deps.stageFxLayer.innerHTML = '';
          }, 2800),
        );
        break;
      }
      case 'rainbow-glitter':
        [0.2, 0.35, 0.5, 0.65, 0.8].forEach((ratio, idx) => {
          this.timers.push(
            window.setTimeout(() => {
              this.deps.particles.spawnBurst(
                w * ratio,
                h * (0.28 + (idx % 2) * 0.2),
                ['#ff7eb6', '#ffd166', '#6ef3b3', '#7ef9ff', '#b892ff'],
                20,
                'sparkle',
              );
            }, idx * 120),
          );
        });
        break;
      case 'giggle-hiccups':
        audioEngine.playBushGiggle();
        this.deps.particles.spawnBubbleStorm(14);
        break;
      case 'cheese-moonbeam':
        audioEngine.playMoonYawn();
        this.deps.particles.spawnShootingStars(5);
        this.deps.particles.spawnBurst(w * 0.5, h * 0.3, ['#ffe878', '#ffd166', '#ffffff'], 30, 'star');
        break;
      default:
        audioEngine.playSparkleChime();
        this.deps.particles.spawnBurst(w * 0.3, h * 0.4, ['#a4ff42', '#7ef9ff', '#ffd166'], 24, 'sparkle');
        this.deps.particles.spawnBurst(w * 0.7, h * 0.4, ['#a4ff42', '#7ef9ff', '#ffd166'], 24, 'sparkle');
        break;
    }
  }
}
