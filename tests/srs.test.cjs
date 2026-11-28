const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function setup(initial) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const start = html.indexOf('class SRS {');
  const end = html.indexOf('// ==================== CHARTS', start);
  assert.ok(start !== -1 && end !== -1, 'SRS and Stats classes are present');
  let saved = structuredClone(initial);
  let reads = 0;
  const Storage = {
    getSRS() { reads++; return structuredClone(saved); },
    setSRS(value) { saved = structuredClone(value); }
  };
  const context = vm.createContext({ Storage });
  vm.runInContext(html.slice(start, end) + '\nglobalThis.subject = { SRS, Stats };', context);
  return { ...context.subject, get reads() { return reads; } };
}

test('bulk due words and distribution use current saved progress', () => {
  const fixture = setup({
    due: { level: 2, reviewCount: 2, correctCount: 1, nextReview: 1 },
    future: { level: 1, reviewCount: 1, correctCount: 1, nextReview: Date.now() + 86400000 },
    unreviewed: { level: 3, reviewCount: 0, correctCount: 0, nextReview: 0 }
  });
  const words = ['due', 'future', 'unreviewed', 'new'].map(id => ({ id }));
  const before = fixture.reads;
  assert.deepEqual(Array.from(fixture.SRS.getDueWords(words), w => w.id), ['due']);
  assert.equal(fixture.reads - before, 1);
  const next = fixture.reads;
  assert.deepEqual(Array.from(fixture.Stats.getDist(words)), [1, 1, 1, 1]);
  assert.equal(fixture.reads - next, 1);

  fixture.SRS.review('new', 2);
  assert.equal(fixture.SRS.getState('new').reviewCount, 1);
  assert.equal(fixture.SRS.getState('new').level, 1);
  assert.equal(fixture.SRS.isDue('new'), false);
  assert.deepEqual(Array.from(fixture.Stats.getDist(words)), [0, 2, 1, 1]);
});

test('missing words retain independent default state', () => {
  const { SRS } = setup({});
  const first = SRS.getState('first');
  first.level = 3;
  assert.equal(SRS.getState('first').level, 0);
  assert.equal(SRS.getState('second').level, 0);
});
