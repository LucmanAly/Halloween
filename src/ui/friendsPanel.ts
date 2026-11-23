import { eventBus } from '../core/eventBus.ts';
import { gameState } from '../core/state.ts';
import type { BanterDirector } from '../creatures/banterDirector.ts';
import { renderCreatureArtSvg } from '../creatures/creatureRig.ts';
import { CREATURE_ROSTER } from '../creatures/creatureRoster.ts';
import type { CreatureId } from '../creatures/types.ts';

export function initFriendsPanel(director: BanterDirector): void {
  const welcome = document.getElementById('welcome-cast');
  const button = document.getElementById('friends-btn');
  const panel = document.getElementById('friends-panel');
  const grid = document.getElementById('friends-grid');
  if (!welcome || !button || !panel || !grid) return;

  welcome.insertAdjacentHTML('beforeend', CREATURE_ROSTER.map((friend) =>
    `<div class="welcome-friend welcome-friend--${friend.id}">${renderCreatureArtSvg(friend.id)}</div>`,
  ).join(''));

  const portrait = (id: CreatureId) => renderCreatureArtSvg(id, gameState.get().equippedCostumes[id]);
  grid.innerHTML = CREATURE_ROSTER.map(({ id, name, title, bubbleColor }) => `
    <button type="button" class="friend-card" data-friend="${id}" aria-label="Talk to ${title}" style="--friend-accent: ${bubbleColor}">
      <span class="friend-art">${portrait(id)}</span>
      <span>${name}</span>
    </button>`,
  ).join('');

  const compact = window.matchMedia('(max-aspect-ratio: 1/1)');
  const systemMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let expanded = compact.matches;
  let inActivity = false;

  const render = () => {
    panel.hidden = !expanded || inActivity;
    button.setAttribute('aria-expanded', String(expanded && !inActivity));
  };

  render();

  button.addEventListener('click', () => {
    expanded = !expanded;
    render();
    if (expanded) grid.querySelector<HTMLButtonElement>('button')?.focus();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || panel.hidden) return;
    if (document.getElementById('settings-dialog')?.hasAttribute('open')) return;
    const focusWasInside = panel.contains(document.activeElement);
    expanded = false;
    render();
    if (focusWasInside) button.focus();
  });

  compact.addEventListener('change', () => {
    expanded = compact.matches;
    if (!expanded && panel.contains(document.activeElement)) button.focus();
    render();
  });

  eventBus.on('activity:change', ({ active }) => {
    inActivity = active !== null;
    render();
  });

  for (const friend of CREATURE_ROSTER) {
    const card = grid.querySelector<HTMLButtonElement>(`[data-friend="${friend.id}"]`);
    const art = card?.querySelector('.friend-art');
    if (!card || !art) continue;

    card.addEventListener('click', () => {
      director.talkTo(friend.id);
      if (gameState.get().reducedMotion || systemMotion.matches) return;
      art.getAnimations().forEach((animation) => animation.cancel());
      art.animate([
        { transform: 'translateY(0)' },
        { transform: 'translateY(-7px) rotate(-5deg)', offset: .42 },
        { transform: 'translateY(0)' },
      ], { duration: 370, easing: 'ease-out' });
    });

    const updatePortrait = () => { art.innerHTML = portrait(friend.id); };
    eventBus.on('costume:equipped', ({ creatureId }) => {
      if (creatureId === friend.id) updatePortrait();
    });
    eventBus.on('state:reset', updatePortrait);
  }
}
