'use strict';

// Vérifie que le chargeur de plugins expose bien les commandes et alias
// demandés (play, playvideo, ig, fb, ssweb, swgc, setcmd).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadPlugins, getPlugins, getAllPluginsList } = require('../src/core/pluginLoader');

const EXPECTED = {
  play: 'play',
  playvideo: 'play',
  playaudio: 'play',
  playptt: 'play',
  ig: 'instagram',
  instagram: 'instagram',
  fb: 'facebook',
  facebook: 'facebook',
  fbdl: 'facebook',
  ssweb: 'ssweb',
  swgc: 'swgc',
  setcmd: 'setcmd',
  listcmd: 'setcmd'
};

test('le chargeur enregistre chaque commande et alias attendu vers le bon plugin', () => {
  loadPlugins(false);
  const map = getPlugins();
  for (const [alias, target] of Object.entries(EXPECTED)) {
    const plugin = map.get(alias);
    assert.ok(plugin, `alias introuvable : ${alias}`);
    assert.equal(plugin.name, target, `${alias} doit pointer vers ${target}`);
    assert.equal(typeof plugin.execute, 'function', `${target} sans execute()`);
  }
});

test('chaque plugin chargé vient bien du dossier src/plugins', () => {
  loadPlugins(false);
  const pluginsDir = path.join(__dirname, '..', 'src', 'plugins');
  for (const plugin of getAllPluginsList()) {
    assert.ok(plugin.filePath.startsWith(pluginsDir), `${plugin.name} hors de src/plugins`);
  }
});
