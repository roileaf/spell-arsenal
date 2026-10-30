// Plays the recipe Animater resolves for a mapped spell. Animater's own
// automatic dispatch yields to Spell Arsenal for these events, so this is the only player.
const activity = [];
export function recordAnimation(spell, status, detail, source) {
  activity.unshift({ time: new Date().toLocaleTimeString(), spell, status, detail, source });
  activity.length = Math.min(activity.length, 40);
}
export function animationActivity() { return activity.map(entry => ({ ...entry })); }

export function animaterApi() {
  const module = game.modules.get('animater');
  return module?.active && module.api?.resolve ? module.api : null;
}

// Animater's play resolves with its session name once the last stage starts, not
// when it ends. Wait for that session's one-time Sequencer effects to finish.
export async function animationFinished(session, { interval = 100, limit = 30000 } = {}) {
  const manager = globalThis.Sequencer?.EffectManager;
  if (typeof session !== 'string' || !session || !manager?.getEffects) return;
  const running = () => manager.getEffects({ name: session }).filter(effect => !effect.data?.persist);
  for (const end = Date.now() + limit; running().length && Date.now() < end;) await new Promise(resolve => setTimeout(resolve, interval));
}

export async function playAnimater(event, context = {}) {
  const spell = event.item?.name ?? event.template?.name ?? 'Unknown spell';
  const source = event.template?.uuid ?? event.id;
  try {
    const api = animaterApi();
    if (!api?.play) throw new Error('Animater playback API unavailable. Enable Animater, then reload Foundry.');
    if (!event.item) throw new Error('Cannot resolve the placed area\'s source spell for Animater.');
    recordAnimation(spell, 'Resolving', `${event.type} recipe`, source);
    const recipe = api.resolve({ systemId: game.system.id, ...event });
    if (!recipe) throw new Error(`No enabled Animater ${event.type} recipe. Enable this spell's recipe or catalog entry in Animater.`);
    recordAnimation(spell, 'Playing', `${recipe.name}: ${context.targets?.length ?? 0} target(s)`, source);
    const result = await api.play(recipe, { ...event, ...context });
    await animationFinished(result);
    recordAnimation(spell, 'Completed', recipe.name, source);
    return result;
  } catch (error) {
    recordAnimation(spell, 'Blocked', error.message, source);
    throw error;
  }
}
