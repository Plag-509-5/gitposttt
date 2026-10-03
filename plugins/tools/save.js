const { jidNormalizedUser, downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function downloadMediaBuffer(mediaObj, type) {
  try {
    const stream = await downloadContentFromMessage(mediaObj, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
  } catch (err) {
    console.error(`[SAVE] Error downloading media stream (${type}):`, err?.message || err);
    return null;
  }
}

module.exports = {
  name: 'save',
  alias: ['sauvegarder', 'vv', 'rvo', 'readviewonce', 'status'],
  category: 'tools',
  description: 'Sauvegarde et renvoie un média éphémère (Vue Unique), statut ou message cité dans votre chat privé',
  usage: '.save (en répondant à un média ou statut) ou via réaction emoji',
  async execute({ socket, msg, from, sender, senderNumber, isOwner, quotedMsg, contextInfo }) {
    // 1. Extraire la source du média (priorité au message cité / déballé)
    let candidate = quotedMsg
      || contextInfo?.quotedMessage
      || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
      || msg.message?.stickerMessage?.contextInfo?.quotedMessage
      || msg.quoted?.msg;

    // Si aucun quoted n'est trouvé, vérifier si le message lui-même contient directement un média
    if (!candidate && msg.message) {
      candidate = msg.message;
    }

    // Déballer récursivement les conteneurs (ephemeralMessage, viewOnceMessage, viewOnceMessageV2, documentWithCaptionMessage)
    let unwrapped = candidate;
    while (unwrapped && (
      unwrapped.ephemeralMessage 
      || unwrapped.viewOnceMessage 
      || unwrapped.viewOnceMessageV2 
      || unwrapped.documentWithCaptionMessage
    )) {
      unwrapped = unwrapped.ephemeralMessage?.message 
        || unwrapped.viewOnceMessage?.message 
        || unwrapped.viewOnceMessageV2?.message 
        || unwrapped.documentWithCaptionMessage?.message;
    }

    const isImage = Boolean(unwrapped?.imageMessage);
    const isVideo = Boolean(unwrapped?.videoMessage);
    const isAudio = Boolean(unwrapped?.audioMessage);
    const isSticker = Boolean(unwrapped?.stickerMessage);
    const isDocument = Boolean(unwrapped?.documentMessage);
    
    const textRaw = unwrapped?.conversation || unwrapped?.extendedTextMessage?.text || '';
    const isPureCommand = Boolean(textRaw && /^[./!#]save\b/i.test(textRaw.trim()));
    const isTextStatus = Boolean(textRaw && !isPureCommand && (quotedMsg || contextInfo?.quotedMessage));

    // Si aucun média ni statut texte cité n'est présent
    if (!unwrapped || (!isImage && !isVideo && !isAudio && !isSticker && !isDocument && !isTextStatus)) {
      return await socket.sendMessage(from, {
        text: '❌ *Veuillez répondre à un média (photo, vidéo, audio, statut ou vue unique) avec .save*'
      }, { quoted: msg });
    }

    try {
      const userJid = jidNormalizedUser(socket.user.id);
      const isBroadcast = from === 'status@broadcast' || from.includes('broadcast');
      const recipientJid = (from.endsWith('@g.us') || isBroadcast) ? (sender || userJid) : from;

      // ── IMAGE ──
      if (isImage) {
        const mediaObj = unwrapped.imageMessage;
        const caption = mediaObj.caption || '💾 *Photo sauvegardée avec succès*';
        const buffer = await downloadMediaBuffer(mediaObj, 'image');
        if (buffer && buffer.length > 0) {
          await socket.sendMessage(recipientJid, { image: buffer, caption });
        } else {
          const safeMsg = { ...unwrapped };
          if (safeMsg.imageMessage) safeMsg.imageMessage.viewOnce = false;
          await socket.sendMessage(recipientJid, {
            forward: { key: { remoteJid: from, fromMe: false, id: `SAVE_${Date.now()}` }, message: safeMsg }
          });
        }
      }
      // ── VIDÉO ──
      else if (isVideo) {
        const mediaObj = unwrapped.videoMessage;
        const caption = mediaObj.caption || '💾 *Vidéo sauvegardée avec succès*';
        const buffer = await downloadMediaBuffer(mediaObj, 'video');
        if (buffer && buffer.length > 0) {
          await socket.sendMessage(recipientJid, {
            video: buffer,
            caption,
            mimetype: mediaObj.mimetype || 'video/mp4'
          });
        } else {
          const safeMsg = { ...unwrapped };
          if (safeMsg.videoMessage) safeMsg.videoMessage.viewOnce = false;
          await socket.sendMessage(recipientJid, {
            forward: { key: { remoteJid: from, fromMe: false, id: `SAVE_${Date.now()}` }, message: safeMsg }
          });
        }
      }
      // ── AUDIO / VOCAL ──
      else if (isAudio) {
        const mediaObj = unwrapped.audioMessage;
        const buffer = await downloadMediaBuffer(mediaObj, 'audio');
        if (buffer && buffer.length > 0) {
          await socket.sendMessage(recipientJid, {
            audio: buffer,
            mimetype: mediaObj.mimetype || 'audio/mp4',
            ptt: Boolean(mediaObj.ptt)
          });
        }
      }
      // ── STICKER ──
      else if (isSticker) {
        const mediaObj = unwrapped.stickerMessage;
        const buffer = await downloadMediaBuffer(mediaObj, 'sticker');
        if (buffer && buffer.length > 0) {
          await socket.sendMessage(recipientJid, {
            sticker: buffer
          });
        }
      }
      // ── DOCUMENT ──
      else if (isDocument) {
        const mediaObj = unwrapped.documentMessage;
        const buffer = await downloadMediaBuffer(mediaObj, 'document');
        if (buffer && buffer.length > 0) {
          await socket.sendMessage(recipientJid, {
            document: buffer,
            mimetype: mediaObj.mimetype || 'application/octet-stream',
            fileName: mediaObj.fileName || 'document'
          });
        }
      }
      // ── STATUT TEXTE CITÉ ──
      else if (isTextStatus) {
        await socket.sendMessage(recipientJid, {
          text: `📝 *Statut texte sauvegardé :*\n\n${textRaw}`
        });
      }

      // Notification discrète dans le groupe si renvoyé en privé
      if (from.endsWith('@g.us') && recipientJid !== from) {
        try {
          await socket.sendMessage(from, {
            text: `✅ *Média sauvegardé et envoyé dans vos messages privés.*`
          }, { quoted: msg });
        } catch(e){}
      }

      // Réaction de confirmation
      if (msg.key && msg.key.remoteJid) {
        try {
          await socket.sendMessage(msg.key.remoteJid, {
            react: { text: '💾', key: msg.key }
          });
        } catch (e) {}
      }

    } catch (err) {
      console.error('[SAVE PLUGIN ERROR]', err);
      await socket.sendMessage(from, {
        text: `❌ Impossible de sauvegarder le média : ${err.message || err}`
      }, { quoted: msg });
    }
  }
};
