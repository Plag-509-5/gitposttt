const {
  getPrimaryStickerHash,
  setStickerCommand,
  deleteStickerCommand,
  getAllStickerCommands
} = require('../../files/sticker_cmd');

const {
  isEmoji,
  setReactionCommand,
  deleteReactionCommand,
  getAllReactionCommands,
  findReactionCommand
} = require('../../files/reaction_cmd');

module.exports = {
  name: 'setcmd',
  alias: ['setsticker', 'setreact', 'stickercmd', 'reactcmd', 'delcmd', 'delreact', 'listcmd', 'cmdlist'],
  category: 'owner',
  description: 'Associe un sticker OU une réaction emoji à une commande (ex: .setcmd save, ✅ ou en répondant à un sticker/emoji)',
  usage: '.setcmd <commande>, <emoji> | .setcmd <commande> (en répondant à un sticker ou emoji) | .delcmd | .listcmd',
  async execute({ socket, msg, from, sender, senderNumber, args, command, prefix, quotedMsg, contextInfo, config, isOwner }) {
    // ── VÉRIFICATION DES PERMISSIONS : Réservé exclusivement au propriétaire du bot ──
    const botNum = String(socket.user?.id || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
    const ownerNum = String(config?.OWNER_NUMBER || '').replace(/[^0-9]/g, '');
    const isBotOwner = senderNumber === botNum || senderNumber === ownerNum || msg.key.fromMe || isOwner;

    if (!isBotOwner) {
      return await socket.sendMessage(from, {
        text: '⛔ *Cette commande est strictement réservée au propriétaire du bot.*'
      }, { quoted: msg });
    }

    const quoted = quotedMsg 
      || contextInfo?.quotedMessage
      || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      || msg.message?.stickerMessage?.contextInfo?.quotedMessage
      || msg.quoted?.msg;

    const stickerMsg = quoted?.stickerMessage 
      || (quoted?.viewOnceMessage?.message?.stickerMessage) 
      || msg.message?.stickerMessage;

    // Détection de texte ou emoji dans le message cité
    const quotedText = (quoted?.conversation || quoted?.extendedTextMessage?.text || '').trim();

    const rawArgs = args.join(' ').trim();

    // ── 1. COMMANDE DE LISTING (.listcmd / .cmdlist) ──
    if (command === 'listcmd' || command === 'cmdlist') {
      const stickerList = getAllStickerCommands();
      const reactList = getAllReactionCommands();

      if (!stickerList.length && !reactList.length) {
        return await socket.sendMessage(from, {
          text: `📭 *Aucun alias enregistré.*\n\n💡 *Pour en créer :*\n• *Réaction Emoji :* \`${prefix}setcmd save, ✅\` (ou en répondant à un emoji avec \`${prefix}setcmd save\`)\n• *Sticker :* Répondez à un sticker avec \`${prefix}setcmd ping\``
        }, { quoted: msg });
      }

      let text = `╭───「 🧩 *ALIAS & RACCOURCIS DU BOT* 」───\n`;

      if (reactList.length > 0) {
        text += `│\n├──「 ✨ *RÉACTIONS EMOJIS (${reactList.length})* 」\n`;
        reactList.forEach((item, idx) => {
          text += `│ ${idx + 1}. Réaction ${item.emoji} ➔ \`${prefix}${item.command}\`\n`;
        });
      }

      if (stickerList.length > 0) {
        text += `│\n├──「 🎨 *STICKERS COMMANDES (${stickerList.length})* 」\n`;
        stickerList.forEach((item, idx) => {
          text += `│ ${idx + 1}. Sticker \`${item.hash.substring(0, 10)}...\` ➔ \`${prefix}${item.command}\`\n`;
        });
      }

      text += `│\n╰─────────────────────────☉\n> Tapez \`${prefix}delcmd <emoji|nom>\` pour supprimer un alias.`;

      return await socket.sendMessage(from, { text }, { quoted: msg });
    }

    // ── 2. COMMANDE DE SUPPRESSION (.delcmd / .delreact) ──
    if (command === 'delcmd' || command === 'delreact') {
      // Cas 1 : Suppression d'un sticker cité
      if (stickerMsg) {
        const hash = getPrimaryStickerHash(stickerMsg);
        if (hash) {
          const deleted = await deleteStickerCommand(hash);
          if (deleted) {
            return await socket.sendMessage(from, { text: '🗑️ *Sticker commande supprimé avec succès !*' }, { quoted: msg });
          }
        }
      }

      // Cas 2 : Suppression d'un emoji cité
      if (quotedText && isEmoji(quotedText)) {
        const deleted = await deleteReactionCommand(quotedText);
        if (deleted) {
          return await socket.sendMessage(from, { text: `🗑️ *Alias réaction ${quotedText} supprimé avec succès !*` }, { quoted: msg });
        }
      }

      // Cas 3 : Suppression par argument (Emoji ou nom de commande)
      const target = rawArgs.trim();
      if (!target) {
        return await socket.sendMessage(from, {
          text: `❌ *Usage :* \`${prefix}delcmd ✅\` ou \`${prefix}delcmd save\` ou répondez au sticker/emoji avec \`${prefix}delcmd\``
        }, { quoted: msg });
      }

      let deletedEmoji = false;
      let deletedSticker = false;

      if (isEmoji(target)) {
        deletedEmoji = await deleteReactionCommand(target);
      } else {
        deletedEmoji = await deleteReactionCommand(target);
        deletedSticker = await deleteStickerCommand(target);
      }

      if (deletedEmoji || deletedSticker) {
        return await socket.sendMessage(from, {
          text: `🗑️ *Alias "${target}" supprimé avec succès !*`
        }, { quoted: msg });
      } else {
        return await socket.sendMessage(from, {
          text: `❌ Aucun alias trouvé pour "${target}".`
        }, { quoted: msg });
      }
    }

    // ── 3. COMMANDE D'ENREGISTREMENT (.setcmd / .setreact) ──

    // SCÉNARIO A : Association par STICKER cité (en répondant à un sticker avec .setcmd <commande>)
    if (stickerMsg) {
      const targetCmd = rawArgs.replace(/^[./!#]/, '').trim();
      if (!targetCmd) {
        return await socket.sendMessage(from, {
          text: `❌ *Veuillez spécifier la commande à associer au sticker.* (Ex: \`${prefix}setcmd ping\`)`
        }, { quoted: msg });
      }

      const hash = getPrimaryStickerHash(stickerMsg);
      if (!hash) {
        return await socket.sendMessage(from, { text: '❌ Impossible d\'extraire l\'identifiant de ce sticker.' }, { quoted: msg });
      }

      await setStickerCommand(hash, targetCmd, senderNumber, botNum);

      return await socket.sendMessage(from, {
        text: `✅ *Sticker lié avec succès !*\n\n🎯 *Action :* Chaque fois que ce sticker sera envoyé, la commande \`${prefix}${targetCmd}\` sera exécutée.`
      }, { quoted: msg });
    }

    // SCÉNARIO B : Association par EMOJI CITÉ (en répondant à un message contenant un emoji avec .setcmd <commande>)
    if (quotedText && isEmoji(quotedText) && rawArgs) {
      const targetCmd = rawArgs.replace(/^[./!#]/, '').trim();
      if (targetCmd) {
        await setReactionCommand(quotedText, targetCmd, senderNumber, botNum);

        return await socket.sendMessage(from, {
          text: `✨ *Réaction Emoji liée avec succès !*\n\n🔮 *Emoji cité :* ${quotedText}\n🎯 *Commande cible :* \`${prefix}${targetCmd}\`\n\n💡 *Fonctionnement :* Réagissez avec ${quotedText} à n'importe quel message (texte, photo, vidéo, statut, vue unique) pour déclencher automatiquement \`${prefix}${targetCmd}\` sur ce message !`
        }, { quoted: msg });
      }
    }

    // SCÉNARIO C : Association explicite par argument (ex: .setcmd save, ✅ ou .setcmd save ✅ ou .setreact save , ❤️)
    if (rawArgs.includes(',') || rawArgs.split(/\s+/).length >= 2 || isEmoji(rawArgs)) {
      let cmdPart = '';
      let emojiPart = '';

      if (rawArgs.includes(',')) {
        const parts = rawArgs.split(',');
        cmdPart = parts[0].replace(/^[./!#]/, '').trim();
        emojiPart = parts.slice(1).join(',').trim();
      } else {
        const tokens = rawArgs.split(/\s+/);
        // Si le dernier token est un emoji
        if (isEmoji(tokens[tokens.length - 1])) {
          emojiPart = tokens[tokens.length - 1];
          cmdPart = tokens.slice(0, tokens.length - 1).join(' ').replace(/^[./!#]/, '').trim();
        } else if (isEmoji(tokens[0])) {
          emojiPart = tokens[0];
          cmdPart = tokens.slice(1).join(' ').replace(/^[./!#]/, '').trim();
        }
      }

      if (cmdPart && emojiPart && isEmoji(emojiPart)) {
        await setReactionCommand(emojiPart, cmdPart, senderNumber, botNum);

        return await socket.sendMessage(from, {
          text: `✨ *Réaction Emoji liée avec succès !*\n\n🔮 *Emoji :* ${emojiPart}\n🎯 *Commande cible :* \`${prefix}${cmdPart}\`\n\n💡 *Fonctionnement :* Réagissez avec ${emojiPart} à n'importe quel message (texte, photo, vidéo, statut, vue unique) pour déclencher automatiquement \`${prefix}${cmdPart}\` sur ce message !`
        }, { quoted: msg });
      }
    }

    // Si aucune syntaxe valide n'a été détectée
    return await socket.sendMessage(from, {
      text: `💡 *Guide d'utilisation de .setcmd :*\n\n` +
            `1️⃣ *Lier un Emoji à une commande :*\n` +
            `• \`${prefix}setcmd save, ✅\` (Réagir avec ✅ déballe et enregistre le média)\n` +
            `• Ou répondez à un message avec un emoji : \`${prefix}setcmd save\`\n\n` +
            `2️⃣ *Lier un Sticker à une commande :*\n` +
            `• Répondez à un sticker avec \`${prefix}setcmd <nom_commande>\`\n\n` +
            `3️⃣ *Gérer les alias existants :*\n` +
            `• \`${prefix}listcmd\` : Voir tous les alias enregistrés\n` +
            `• \`${prefix}delcmd <emoji|nom>\` : Supprimer un alias`
    }, { quoted: msg });
  }
};
