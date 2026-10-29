import { containedSpell } from './spell-parser.js';
import { systemAdapter } from './systems.js';
import { spellNameMatches } from './spell-names.js';
export async function resolveSpellDetails(name, sourceUuid) {
  if (!name?.trim()) return null;
  let spell;
  if (sourceUuid) {
    try { spell = containedSpell(await fromUuid(sourceUuid)); } catch { /* Fall back when original item was removed. */ }
  }
  if (!spellNameMatches(name, spell)) spell = null;
  if (!spell || sourceUuid?.startsWith('Compendium.')) {
    const actors = [...new Set([...(globalThis.canvas?.tokens?.controlled ?? []).map(token => token.actor).filter(Boolean), ...(game.actors ?? [])])];
    const items = [...(game.items ?? []), ...actors.flatMap(actor => [...(actor.items ?? [])])];
    const matches = items.map(containedSpell).filter(item => spellNameMatches(name, item));
    const configured = systemAdapter().preferredSpell(matches);
    spell = configured ?? spell ?? matches[0];
  }
  if (!spell) {
    const packs = [...game.packs].filter(pack => pack.documentName === 'Item' && /spells/i.test(pack.collection));
    for (const pack of packs) {
      try {
        const index = await pack.getIndex({ fields: ['type', 'system.slug', 'flags.babele.originalName'] });
        const entry = index.find(item => item.type === 'spell' && spellNameMatches(name, item));
        if (entry) {
          spell = await pack.getDocument(entry._id);
          if (spell?.type === 'spell') break;
        }
      } catch (error) { console.warn(`Spell Arsenal: unable to search ${pack.collection}`, error); }
    }
  }
  return spell;
}
export async function openSpellDetails(name, sourceUuid) {
  const spell = await resolveSpellDetails(name, sourceUuid);
  if (!spell?.sheet) throw new Error(`Spell details unavailable for ${name}. Drop its spell again to link the source.`);
  await spell.sheet.render(true);
}
