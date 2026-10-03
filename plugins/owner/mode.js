module.exports = {
  name: 'mode',
  alias: ['setmode', 'botmode'],
  category: 'owner',
  description: 'Change le mode du bot (public / private)',
  usage: '.mode public ou .mode private',
  async execute({ socket, msg, from, sender, senderNumber, args, prefix, config, sessionCfg, isOwner }) {
    const botNum = String(socket.user?.id || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const ownerNum = String(config?.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
    const isBotOwner = senderNumber === botNum || senderNumber === ownerNum || msg.key.fromMe || isOwner;

    if (!isBotOwner) {
      return await socket.sendMessage(from, {
        text: '⛔ *Cette commande est strictement réservée au propriétaire du bot.*'
      }, { quoted: msg });
    }

    const newMode = args[0]?.toLowerCase();
    if (!newMode || (newMode !== 'public' && newMode !== 'private')) {
      const currentMode = sessionCfg?.MODE || 'public';
      return await socket.sendMessage(from, {
        text: `⚙️ *Configuration du Mode*\n\n📌 *Statut actuel :* *${currentMode.toUpperCase()}*\n💡 *Usage :* \`${prefix}mode public\` ou \`${prefix}mode private\``
      }, { quoted: msg });
    }

    try {
      const { setUserConfigInMongo, loadUserConfigFromMongo } = require('../../pair');
      if (typeof setUserConfigInMongo === 'function') {
        const sanitized = botNum || senderNumber;
        let cfg = (typeof loadUserConfigFromMongo === 'function' ? await loadUserConfigFromMongo(sanitized) : null) || {};
        cfg.MODE = newMode;
        await setUserConfigInMongo(sanitized, cfg);
      }
    } catch (e) {
      console.warn('[MODE] Mongo update failed (using in-memory):', e?.message || e);
    }

    if (sessionCfg) {
      sessionCfg.MODE = newMode;
    }

    await socket.sendMessage(from, {
      text: `✅ *Mode mis à jour avec succès !*\nLe bot est désormais en mode : *${newMode.toUpperCase()}*`
    }, { quoted: msg });
  }
};
