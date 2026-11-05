import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';

const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const key = 'courtside-phone-v1';

function element() {
  return {
    style: { setProperty() {} },
    children: [],
    attributes: {},
    value: '',
    textContent: '',
    contains(node) { return this === node || this.children.some(child => child.contains(node)); },
    append(...nodes) {
      for (const node of nodes) {
        node.remove();
        node.parentNode = this;
        this.children.push(node);
      }
    },
    insertBefore(node, reference) {
      node.remove();
      const index = this.children.indexOf(reference);
      node.parentNode = this;
      this.children.splice(index < 0 ? this.children.length : index, 0, node);
    },
    remove() {
      if (this.parentNode) {
        this.parentNode.children = this.parentNode.children.filter(node => node !== this);
        this.parentNode = null;
      }
    },
    replaceChildren() { this.children = []; },
    setAttribute(name, value) { this.attributes[name] = value; },
    showModal() { this.open = true; },
    close() { this.open = false; },
  };
}

function page(storage = new Map(), landscape = false) {
  // Only IDs present in the real HTML exist initially. Dynamic IDs are found
  // by walking the rendered tree, so missing elements cannot silently pass.
  const elements = new Map(
    [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, element()]),
  );
  function find(node, id) {
    if (node.id === id) return node;
    for (const child of node.children) {
      const match = find(child, id);
      if (match) return match;
    }
    return null;
  }
  const get = id => {
    if (elements.has(id)) return elements.get(id);
    for (const node of elements.values()) {
      const match = find(node, id);
      if (match) return match;
    }
    return null;
  };
  const layoutListeners = [];
  const layout = {
    matches: landscape,
    addEventListener(event, listener) {
      if (event === 'change') layoutListeners.push(listener);
    },
  };
  const context = vm.createContext({
    matchMedia: () => layout,
    document: { getElementById: get, createElement: element },
    localStorage: {
      getItem: k => storage.get(k) ?? null,
      setItem: (k, value) => storage.set(k, value),
    },
    navigator: {},
  });
  vm.runInContext(source, context);
  return {
    get,
    storage,
    run: code => vm.runInContext(code, context),
    rotate(landscape) {
      layout.matches = landscape;
      layoutListeners.forEach(listener => listener());
    },
    click(id) {
      const button = get(id);
      assert.ok(button, `Missing button: ${id}`);
      assert.ok(!button.disabled, `Disabled button: ${id}`);
      button.onclick();
    },
    saveSettings() { get('settingsForm').onsubmit({ preventDefault() {} }); },
  };
}

test('landscape controls relocate and restore when rotating without losing match state', () => {
  const p = page(new Map(), true);
  const controls = p.get('controls');
  assert.ok(controls.contains(p.get('settings')));
  assert.ok(controls.contains(p.get('next')));
  assert.ok(p.get('landscapeSet').contains(p.get('set')));
  p.click('settings');
  assert.equal(p.get('settingsDialog').open, true);
  p.click('cancelSettings');
  p.run('data.scores = [21, 19]; render()');
  assert.equal(p.get('next').hidden, false);
  p.click('next');
  assert.equal(p.get('set').textContent, 'SET 2');

  p.rotate(false);
  assert.ok(p.get('matchHeader').contains(p.get('settings')));
  assert.ok(p.get('matchSummary').contains(p.get('set')));
  assert.ok(p.get('scoreboard').contains(p.get('next')));
  assert.ok(!controls.contains(p.get('settings')));
  assert.ok(!controls.contains(p.get('next')));
  assert.equal(p.get('set').textContent, 'SET 2');

  p.rotate(true);
  assert.ok(controls.contains(p.get('settings')));
  assert.ok(p.get('landscapeSet').contains(p.get('set')));
  assert.equal(p.get('team-0-sets').textContent, '1');
});

test('scoring, serving selection and undo', () => {
  const p = page();
  assert.equal(p.run('data.best'), 3);
  assert.equal(p.run('data.points'), 21);
  assert.equal(p.get('does-not-exist'), null);
  p.click('team-1-point');
  assert.equal(p.get('team-1-score').textContent, '01');
  assert.equal(p.get('team-1-serve').attributes['aria-pressed'], 'true');
  p.click('undo');
  assert.equal(p.get('team-1-score').textContent, '00');
  p.click('team-1-serve');
  assert.equal(p.run('data.serving'), 1);
  p.click('undo');
  assert.equal(p.run('data.serving'), 0);
});

test('deuce, set transition and undo', () => {
  const p = page();
  p.run('data.scores = [20, 20]; render()');
  p.click('team-0-point');
  assert.equal(p.run('winner()'), undefined);
  p.click('team-0-point');
  assert.equal(p.run('winner()'), 0);
  assert.equal(p.get('team-1-point').disabled, true);
  p.click('next');
  assert.equal(p.get('team-0-sets').textContent, '1');
  assert.equal(p.get('team-0-score').textContent, '00');
  assert.equal(p.get('set').textContent, 'SET 2');
  assert.equal(p.run('data.serving'), 1);
  p.click('settings');
  assert.equal(p.get('rules').disabled, true);
  p.click('cancelSettings');
  p.click('undo');
  assert.equal(p.get('team-0-score').textContent, '22');
  assert.equal(p.get('team-0-sets').textContent, '0');
  assert.equal(p.get('set').textContent, 'SET 1');
});

for (const best of [3, 5]) {
  for (const points of [11, 15, 21, 25]) {
    test(`best of ${best}, ${points} points: settings, deciding set and finish`, () => {
      const p = page();
      p.click('settings');
      p.get('best').value = String(best);
      p.get('points').value = String(points);
      p.saveSettings();
      assert.equal(p.run('target()'), points);
      p.run(`data.scores = [${points - 1}, ${points - 2}]; render()`);
      p.click('team-0-point');
      assert.equal(p.run('winner()'), 0);

      const tiedSets = (best - 1) / 2;
      const target = points <= 15 ? 11 : 15;
      p.run(`data.sets = [${tiedSets}, ${tiedSets}]; data.scores = [${target - 1}, ${target - 1}]; render()`);
      assert.equal(p.run('target()'), target);
      p.click('team-0-point');
      assert.equal(p.run('winner()'), undefined);
      p.click('team-0-point');
      assert.equal(p.get('next').textContent, 'Finish match');
      p.click('next');
      assert.equal(p.run('finished()'), true);
      assert.equal(p.get('next').hidden, true);
      assert.match(p.get('status').textContent, /Home wins the match/);
      p.click('undo');
      assert.equal(p.run('finished()'), false);
      assert.equal(p.run('target()'), target);
      assert.equal(p.run('data.scores[0]'), target + 1);
    });
  }
}

test('new match confirmation preserves settings and clears undo', () => {
  const p = page();
  p.click('settings');
  p.get('home').value = 'Falcons';
  p.get('points').value = '15';
  p.saveSettings();
  p.click('team-0-point');
  p.click('reset');
  assert.equal(p.get('resetDialog').open, true);
  p.click('cancelReset');
  assert.equal(p.get('team-0-score').textContent, '01');
  p.click('reset');
  p.click('confirmReset');
  assert.equal(p.get('team-0-score').textContent, '00');
  assert.equal(p.get('team-0-serve').textContent, 'Falcons');
  assert.equal(p.run('target()'), 15);
  assert.equal(p.get('undo').disabled, true);
});

test('swapping and reloading preserve team identities and scores', () => {
  const p = page();
  p.run('data.sets = [1, 0]; data.scores = [3, 7]; render()');
  p.click('swap');
  const reloaded = page(p.storage);
  const firstCard = reloaded.get('teams').children[0];
  assert.ok(firstCard.contains(reloaded.get('team-1-score')));
  assert.equal(reloaded.get('team-1-score').textContent, '07');
  assert.equal(reloaded.get('team-0-sets').textContent, '1');
  assert.equal(reloaded.get('team-1-sets').textContent, '0');
  assert.equal(reloaded.get('undo').disabled, true);
});

test('old saves retain matches while dropping redundant history', () => {
  const p = page();
  const saved = JSON.parse(p.storage.get(key));
  Object.assign(saved, { sets: [1, 0], scores: [3, 7], history: [[21, 19]] });
  const storage = new Map([[key, JSON.stringify(saved)]]);
  const migrated = page(storage);
  assert.equal(migrated.get('set').textContent, 'SET 2');
  assert.equal(migrated.get('team-1-score').textContent, '07');
  assert.equal(Object.hasOwn(JSON.parse(storage.get(key)), 'history'), false);
  migrated.click('settings');
  assert.equal(migrated.get('rules').disabled, true);
  assert.equal(page(storage).get('set').textContent, 'SET 2');
});

test('invalid storage falls back to a fresh match', () => {
  for (const saved of ['{invalid', '{}', '{"scores":[-1,0]}']) {
    const p = page(new Map([[key, saved]]));
    assert.equal(p.get('team-0-score').textContent, '00');
    assert.equal(p.get('set').textContent, 'SET 1');
  }
});
