const moment = require('moment-timezone');

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d > 0 ? d + 'j ' : ''}${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s}s`;
}

module.exports = {
  name: 'help',
  alias: ['aide', 'commands', 'list', 'cmdlist', 'commandes'],
  category: 'general',
  description: 'Liste détaillée de toutes les commandes avec leurs explications',
  usage: '.help ou .help <commande>',
  async execute({ socket, msg, from, sender, senderNumber, args, prefix, config, sessionCfg, getPluginsByCategory, getPlugin }) {
    const botName = sessionCfg?.botName || config?.BOT_NAME || 'KAIDO-MD';
    const ownerName = config?.OWNER_NAME || 'Mugiwara no plag';
    const timeHaiti = moment().tz('America/Port-au-Prince').format('HH:mm:ss');
    const dateHaiti = moment().tz('America/Port-au-Prince').format('DD/MM/YYYY');
    const uptime = formatUptime(process.uptime());
    const mode = sessionCfg?.MODE || 'public';

    // Si l'utilisateur demande de l'aide sur une commande spécifique (ex: .help play)
    if (args.length > 0) {
      const query = args[0].toLowerCase().replace(/^[./!#]/, '');
      const p = getPlugin ? getPlugin(query) : null;
      if (p) {
        const helpDetail = `╭───「 ℹ️ *AIDE : ${prefix}${p.name.toUpperCase()}* 」───
│
│ 📌 *Commande :* \`${prefix}${p.name}\`
│ 🏷️ *Catégorie :* ${p.category ? p.category.toUpperCase() : 'GÉNÉRAL'}
│ 📝 *Description :* ${p.description || 'Aucune description'}
│ 💡 *Usage :* \`${p.usage || prefix + p.name}\`
│ 🔀 *Alias :* ${p.alias && p.alias.length ? p.alias.map(a => '`' + prefix + a + '`').join(', ') : 'Aucun'}
│
╰────────────────────────☉`;
        return await socket.sendMessage(from, { text: helpDetail }, { quoted: msg });
      }
    }

    const categories = getPluginsByCategory ? getPluginsByCategory() : {};

    const categoryIcons = {
      general: '🌐 *GÉNÉRAL*',
      tools: '🛠️ *OUTILS & MÉDIA*',
      ai: '🧠 *INTELLIGENCE ARTIFICIELLE*',
      download: '📥 *TÉLÉCHARGEMENTS*',
      group: '👥 *GESTION DE GROUPE*',
      owner: '👑 *PROPRIÉTAIRE*'
    };

    let helpText = `╔══════════════════════╗
║     📖 *${botName} AIDE* 📖
╚══════════════════════╝

👤 *Utilisateur :* @${senderNumber}
👑 *Créateur :* ${ownerName}
⚙️ *Mode :* ${mode.toUpperCase()}
🕒 *Heure :* ${timeHaiti} (${dateHaiti})
⏱️ *Uptime :* ${uptime}
📌 *Préfixe :* [ *${prefix}* ]

> Tapez \`${prefix}help <commande>\` pour obtenir les détails d'une commande spécifique.

`;

    let totalCommands = 0;

    for (const [catKey, plugins] of Object.entries(categories)) {
      if (plugins && plugins.length > 0) {
        const catTitle = categoryIcons[catKey] || `📁 *${catKey.toUpperCase()}*`;
        helpText += `┌───「 ${catTitle} 」\n`;
        for (const p of plugins) {
          totalCommands++;
          helpText += `│ • \`${prefix}${p.name}\` : _${p.description}_\n`;
        }
        helpText += `└───\n\n`;
      }
    }

    helpText += `📊 *Total Commandes Disponibles :* ${totalCommands}
> ${config?.BOT_FOOTER || '𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 𝐏𝐋4𝐆 x TECH MONDIAL'}`;

    const imageUrl = sessionCfg?.logo || config?.IMAGE_PATH || 'https://files.catbox.moe/l1lzbx.png';

    try {
      if (imageUrl && imageUrl.startsWith('http')) {
        await socket.sendMessage(from, {
          image: { url: imageUrl },
          caption: helpText,
          mentions: [sender]
        }, { quoted: msg });
      } else {
        await socket.sendMessage(from, { text: helpText, mentions: [sender] }, { quoted: msg });
      }
    } catch (e) {
      await socket.sendMessage(from, { text: helpText, mentions: [sender] }, { quoted: msg });
    }
  }
};
