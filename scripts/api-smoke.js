'use strict';

/**
 * Test de bout en bout des API externes utilisées par les commandes
 * play / playvideo / playaudio / ig / fb / ssweb.
 *
 * À lancer sur une machine qui a accès à Internet (le sandbox de développement
 * ne peut pas joindre ces services) :
 *
 *   npm run test:api
 *
 * Variables facultatives :
 *   IG_TEST_URL  lien Instagram public (reel / post)  — sinon test ignoré
 *   FB_TEST_URL  lien Facebook public (vidéo / reel)  — sinon test ignoré
 *   YT_TEST_URL  lien YouTube (défaut : une vidéo courte publique)
 *
 * Code de sortie : 0 si tous les tests exécutés passent, 1 sinon.
 */

const { requestCobalt, downloadInstagram, downloadFacebook, isHttpUrl } = require('../src/services/media-api');
const { ytmp3, ytmp4 } = require('../src/lib/youtube');
const { captureScreenshot } = require('../src/plugins/tools/ssweb')._test;

const YT_URL = process.env.YT_TEST_URL || 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const IG_URL = process.env.IG_TEST_URL || '';
const FB_URL = process.env.FB_TEST_URL || '';

const results = [];

async function check(name, fn) {
  const started = Date.now();
  try {
    const detail = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout 120 s')), 120_000).unref())
    ]);
    results.push({ name, ok: true, ms: Date.now() - started, detail });
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, detail: error.message || String(error) });
  }
}

function assertMediaUrl(value, label) {
  if (!isHttpUrl(value)) throw new Error(`${label} : lien de téléchargement invalide (${String(value).slice(0, 80)})`);
  return `${label} OK`;
}

async function main() {
  await check('ssweb : capture (movanest / thum.io)', async () => {
    const { buffer, provider } = await captureScreenshot(
      'https://example.com',
      { width: 1280, height: 720 }
    );
    if (!buffer || buffer.length < 1024) throw new Error('image trop petite');
    return `fournisseur ${provider}, ${buffer.length} octets`;
  });

  await check('play : recherche + audio (convertisseurs YouTube)', async () => {
    const data = await ytmp3(YT_URL);
    return assertMediaUrl(data.downloadUrl, 'audio');
  });

  await check('playvideo : vidéo 720p (convertisseurs YouTube)', async () => {
    const data = await ytmp4(YT_URL, '720');
    return assertMediaUrl(data.downloadUrl, 'vidéo');
  });

  await check('play / playvideo : repli Cobalt', async () => {
    const result = await requestCobalt(YT_URL, { downloadMode: 'auto', videoQuality: '720', fallbackType: 'video' });
    const item = result.media?.[0];
    return assertMediaUrl(item?.url, `cobalt (${result.provider})`);
  });

  if (IG_URL) {
    await check('ig : téléchargement Instagram (Cobalt)', async () => {
      const result = await downloadInstagram(IG_URL);
      if (!result.media?.length) throw new Error('aucun média');
      return assertMediaUrl(result.media[0].url, `média ${result.media[0].type}`);
    });
  } else {
    results.push({ name: 'ig : téléchargement Instagram', ok: null, detail: 'ignoré (définir IG_TEST_URL)' });
  }

  if (FB_URL) {
    await check('fb : téléchargement Facebook (Cobalt puis fdown)', async () => {
      const result = await downloadFacebook(FB_URL);
      const video = result.media?.find(item => item.type === 'video') || result.media?.[0];
      return assertMediaUrl(video?.url, 'vidéo');
    });
  } else {
    results.push({ name: 'fb : téléchargement Facebook', ok: null, detail: 'ignoré (définir FB_TEST_URL)' });
  }

  let failed = 0;
  for (const r of results) {
    const icon = r.ok === null ? '⏭️ ' : r.ok ? '✅' : '❌';
    if (r.ok === false) failed += 1;
    const time = r.ms ? ` (${r.ms} ms)` : '';
    console.log(`${icon} ${r.name}${time} — ${r.detail}`);
  }
  console.log(failed ? `\n${failed} test(s) en échec.` : '\nTous les tests exécutés sont passés.');
  process.exit(failed ? 1 : 0);
}

main().catch(error => {
  console.error('Erreur inattendue :', error);
  process.exit(1);
});
