// Translations (e.g. Babele) show names as "Localized / Original" or keep the original name in flags.
const normalized = value => String(value ?? '').trim().toLowerCase();
const slugify = value => normalized(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function spellNames(value) {
  if (value == null) return [];
  if (typeof value !== 'object') {
    const name = normalized(value);
    return name ? [...new Set([name, ...name.split(/\s+\/\s+/).map(part => part.trim()).filter(Boolean)])] : [];
  }
  return [...new Set([value.name, value.flags?.babele?.originalName].flatMap(spellNames))];
}

// Accepts names or spell items; items also match on their system slug.
export function spellNameMatches(target, ...values) {
  const wanted = new Set(spellNames(target));
  if (!wanted.size) return false;
  const slugs = new Set([...wanted].map(slugify).filter(Boolean));
  return values.some(value => spellNames(value).some(name => wanted.has(name)) || Boolean(value?.system?.slug && slugs.has(value.system.slug)));
}
