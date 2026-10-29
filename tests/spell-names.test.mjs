import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as nodeModule from 'node:module';
nodeModule.registerHooks?.({ load(url, context, nextLoad) {
  return nextLoad(url, url.includes('/spell-arsenal/scripts/') ? { ...context, format: 'module' } : context);
} });
const { spellNameMatches, spellNames } = await import('../scripts/spell-names.js');
const { missingDefaults, hasTemplate } = await import('../scripts/rules.js');

test('exact names still match case-insensitively', () => {
  assert.ok(spellNameMatches('Corrosive Muck', ' corrosive muck '));
  assert.ok(!spellNameMatches('Corrosive Muck', 'Corrosive'));
  assert.ok(!spellNameMatches('', ''));
});

test('bilingual Babele names match either part', () => {
  assert.ok(spellNameMatches('Corrosive Muck', 'Разъедающая грязь / Corrosive Muck'));
  assert.ok(spellNameMatches('Разъедающая грязь / Corrosive Muck', 'Corrosive Muck'));
  assert.ok(spellNameMatches('Разъедающая грязь', 'Разъедающая грязь / Corrosive Muck'));
  assert.ok(!spellNameMatches('Fireball', 'Разъедающая грязь / Corrosive Muck'));
  assert.deepEqual(spellNames('A / B'), ['a / b', 'a', 'b']);
});

test('translated items match by original name or slug', () => {
  assert.ok(spellNameMatches('Corrosive Muck', { name: 'Разъедающая грязь', flags: { babele: { originalName: 'Corrosive Muck' } } }));
  assert.ok(spellNameMatches('Corrosive Muck', { name: 'Разъедающая грязь', system: { slug: 'corrosive-muck' } }));
  assert.ok(!spellNameMatches('Разъедающая грязь', { name: 'Fireball', system: { slug: 'fireball' } }));
  assert.ok(!spellNameMatches('Corrosive Muck', undefined, null, {}));
});

test('defaults are not duplicated for translated rules', () => {
  const existing = [{ id: 'a', spell: 'Огненный шар / Fireball' }];
  const added = missingDefaults(existing, [{ id: 'fireball', spell: 'Fireball' }, { id: 'grease', spell: 'Grease' }]);
  assert.deepEqual(added.map(rule => rule.id), ['grease']);
  assert.ok(hasTemplate({ spell: 'Огненный шар / Fireball' }));
});
