const sessionLanguages = new Map(); // sessionId -> langCode

/**
 * Sauvegarde la langue d'une session dans le cache et en base si possible
 */
async function saveSessionLanguage(sessionId, langCode) {
  const cleanId = String(sessionId).replace(/[^0-9]/g, '');
  const cleanLang = String(langCode || 'fr').toLowerCase().trim();
  sessionLanguages.set(cleanId, cleanLang);
}

/**
 * Récupère la langue d'une session (rapide et synchrone en mémoire)
 */
async function getSessionLanguage(sessionId) {
  const cleanId = String(sessionId).replace(/[^0-9]/g, '');
  return sessionLanguages.get(cleanId) || 'fr';
}

/**
 * Injecte le wrapper de traduction sur l'envoi de messages du socket
 */
async function setupTranslationWrapper(socket, number) {
  if (!socket || !socket.sendMessage) {
    return;
  }

  // Sauvegarde de la méthode originale de Baileys
  const originalSendMessage = socket.sendMessage.bind(socket);

  // Surcharge/Interception de sendMessage sans blocage
  socket.sendMessage = async (jid, content, options = {}) => {
    try {
      const sessionId = String(number || socket.user?.id || '').split(':')[0].replace(/[^0-9]/g, '');
      const targetLang = sessionLanguages.get(sessionId) || 'fr';

      // On ne traduit que si la langue demandée n'est pas le français
      if (targetLang && targetLang !== 'fr') {
        const { translate } = require('@vitalets/google-translate-api');
        
        // 1. Traduction du texte brut (content.text)
        if (content && typeof content.text === 'string' && content.text.trim().length > 0) {
          const translated = await translate(content.text, { to: targetLang, autoCorrect: true }).catch(() => null);
          if (translated?.text) content.text = translated.text;
        }
        
        // 2. Traduction de la légende de médias (content.caption)
        if (content && typeof content.caption === 'string' && content.caption.trim().length > 0) {
          const translated = await translate(content.caption, { to: targetLang, autoCorrect: true }).catch(() => null);
          if (translated?.text) content.caption = translated.text;
        }
      }
    } catch (transErr) {
      // Ignorer l'erreur pour ne jamais bloquer l'envoi du message
    }

    // Exécution de l'envoi original Baileys
    return await originalSendMessage(jid, content, options);
  };
}

module.exports = {
  saveSessionLanguage,
  getSessionLanguage,
  setupTranslationWrapper
};
