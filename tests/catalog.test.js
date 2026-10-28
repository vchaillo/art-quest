import test from 'node:test';
import assert from 'node:assert/strict';
import { artists, works } from '../data.js';

test('catalog references unique painters and verified public-domain works', () => {
  assert.ok(artists.length >= 20);
  assert.ok(works.length >= 40);
  assert.equal(new Set(artists.map(a => a.id)).size, artists.length);
  assert.equal(new Set(works.map(w => w.id)).size, works.length);
  for (const artist of artists) {
    assert.ok(works.some(w => w.artistId === artist.id && w.id === artist.cover), artist.name);
  }
  for (const work of works) {
    assert.ok(artists.some(a => a.id === work.artistId));
    assert.equal(work.publicDomain, true);
    assert.equal(new URL(work.source).hostname, 'www.metmuseum.org');
    assert.ok(work.image.startsWith('https://'));
  }
});
