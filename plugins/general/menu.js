const moment = require('moment-timezone');

function formatUptime(seconds) {
  let total = Math.floor(seconds);
  const days = Math.floor(total / 86400); total %= 86400;
  const hours = Math.floor(total / 3600); total %= 3600;
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (secs || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
}

module.exports = {
  name: 'menu',
  alias: ['menu2', 'm', 'mainmenu'],
  category: 'general',
  description: 'Affiche le menu principal officiel du bot KAIDO-MD',
  usage: '.menu',
  async execute({ socket, msg, from, sender, senderNumber, prefix, config, sessionCfg, activeSockets }) {
    try {
      await socket.sendMessage(from, { react: { text: '🐉', key: msg.key } });
    } catch (e) {}

    try {
      const userJid = msg?.key?.participant ?? msg?.key?.remoteJid ?? sender;
      const userShort = senderNumber || (typeof userJid === 'string' ? userJid.split('@')[0] : 'user');

      const uptimeStr = formatUptime(process.uptime());
      const botName = sessionCfg?.botName || config?.BOT_NAME || 'KAIDO-MD';
      const footer = config?.BOT_FOOTER || '© 2026 KAIDO-MD';
      const version = config?.BOT_VERSION || '1.0.0';
      const activeCount = (activeSockets && activeSockets.size) ? activeSockets.size : 1;
      const p = prefix || '.';

      const metaQuote = {
        key: {
          remoteJid: 'status@broadcast',
          participant: '0@s.whatsapp.net',
          fromMe: false,
          id: 'META_AI_PING'
        },
        message: {
          contactMessage: {
            displayName: botName,
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${botName};;;;\nFN:${botName}\nORG:Meta Platforms\nTEL;type=CELL;type=VOICE;waid=13135550002:+1 313 555 0002\nEND:VCARD`
          }
        }
      };

      const text = `
⛩️  𝐊𝐀𝐈𝐃𝐎 - 𝐌𝐃  ⛩️
             ─── ᵇʸ ᑭ𝗹𝖺𝘨 ───

\`❦︎ ᴀᴛ 1ꪜᦓ1 𝑎𝑙𝑤𝑎𝑦𝑠 ᵇᵉᵗ ᵒⁿ ᵏᵃⁱᵈᵒ ❦︎\`

｢ 👤 𝐔𝐭𝐢𝐥𝐢𝐬𝐚𝐭𝐞𝐮𝐫 : @${userShort} ｣
｢ 🔰 𝐒𝐞𝐬𝐬𝐢𝐨𝐧𝐬 𝐚𝐜𝐭𝐢𝐯𝐞𝐬 : ${activeCount} ｣
｢ 📜 𝐂𝐨𝐦𝐦𝐚𝐧𝐝𝐞𝐬 : 57 ｣

✵ Ⓟ︎ : 𝖯𝖱𝖤𝖬𝖨𝖴𝖬
✵ Ⓛ︎ : 𝖫𝖨𝖬𝖨𝖳𝖤𝖲 𝖰𝖴𝖮𝖳

**site officiel** : https://kaidomd-byplag.mooo.com/

> 〢  𝐌𝐄𝐍𝐔 𝐏𝐑𝐈𝐍𝐂𝐈𝐏𝐀𝐋 ✿︎

> ・ ${p}menu
> ・ ${p}ping
> ・ ${p}aide / ${p}help
> ・ ${p}owner

> 〢 𝐆𝐑𝐎𝐔𝐏𝐄 ᯽

> ・ ${p}kick
> ・ ${p}add
> ・ ${p}leave
> ・ ${p}tagall
> ・ ${p}hidetag / ${p}h
> ・ ${p}mute
> ・ ${p}unmute
> ・ ${p}swgc
> ・ ${p}setgpp
> ・ ${p}listadmin
> ・ ${p}creategroup
> ・ ${p}acceptall
> ・ ${p}revokeall
> ・ ${p}listactive
> ・ ${p}listinactive
> ・ ${p}kickinactive
> ・ ${p}kickall
> ・ ${p}antilink
> ・ ${p}antistatusmention

> 〢 𝐉𝐄𝐔𝐗 🎮

> ・ ${p}tictactoe / ${p}ttt

> 〢 𝐎𝐔𝐓𝐈𝐋𝐒 ⚒️

> ・ ${p}sticker
> ・ ${p}take
> ・ ${p}trt
> ・ ${p}tovn
> ・ ${p}save
> ・ ${p}vv
> ・ ${p}bible
> ・ ${p}upch
> ・ ${p}img
> ・ ${p}jid
> ・ ${p}cjid
> ・ ${p}rch Ⓟ︎
> ・ ${p}code
> ・ ${p}getpp
> ・ ${p}setpp
> ・ ${p}setlang
> ・ ${p}ssweb
> ・ ${p}checkban
> ・ ${p}shazam
> ・ ${p}mediafire
> ・ ${p}setcmd
> ・ ${p}listcmd
> ・ ${p}delcmd

> 〢 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 ✿︎

> ・ ${p}play Ⓛ︎
> ・ ${p}playvideo Ⓛ︎
> ・ ${p}playptt Ⓛ︎
> ・ ${p}tiktok
> ・ ${p}facebook
> ・ ${p}ig
> ・ ${p}modapk

> 〢 𝐏𝐀𝐑𝐀𝐌𝐒 𖣘

> ・ ${p}mode (public/private)
> ・ ${p}config show
> ・ ${p}config autoview
> ・ ${p}config autolike
> ・ ${p}config autorec
> ・ ${p}config setemoji
> ・ ${p}config setprefix



━━━━━━━━━━━━━━━━━━━━━━━━
                🐉-𝑲𝒊𝒏𝒈 𝒐𝒇 𝒕𝒉𝒆 𝒃𝒆𝒂𝒔𝒕 -🐉
━━━━━━━━━━━━━━━━━━━━━━━━

*STATUT BOT*
• Uptime: ${uptimeStr}
• Prefix: ${p}
• Version: ${version}

${footer}
`.trim();

      const logoUrl = sessionCfg?.logo || config?.RCD_IMAGE_PATH || 'https://files.catbox.moe/l1lzbx.png';

      await socket.sendMessage(from, {
        text: text,
        contextInfo: {
          mentionedJid: [userJid],
          forwardingScore: 999,
          isForwarded: true,
          externalAdReply: {
            title: `${botName} - ON 🔥`,
            body: `Prefix: ${p} | Uptime: ${uptimeStr}`,
            thumbnailUrl: logoUrl,
            sourceUrl: 'https://whatsapp.com',
            mediaType: 1,
            renderLargerThumbnail: true
          }
        }
      }, { quoted: metaQuote });

    } catch (err) {
      console.error('menu error:', err);
      await socket.sendMessage(from, {
        text: '📋 *MENU PRINCIPAL*\n\n' +
              `.menu, .ping, .help, .owner\n` +
              `.save, .sticker, .tovn, .play, .tiktok\n` +
              `.kick, .add, .tagall, .hidetag, .mute\n` +
              `\nUtilisez .help pour la liste détaillée.`
      }, { quoted: msg });
    }
  }
};
