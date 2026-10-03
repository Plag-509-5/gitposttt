const { startTicTacToe, deleteGame, extractUserId } = require('../../files/tictactoe');

module.exports = {
  name: 'tictactoe',
  alias: ['ttt', 'morpion', 'delttt', 'removettt', 'cancelttt'],
  category: 'games',
  description: 'Lance une partie interactive de Morpion (Tic-Tac-Toe) avec mentions dynamiques',
  usage: '.ttt @adversaire (ou en répondant à son message) | .delttt pour annuler',
  async execute({ socket, msg, from, sender, args, command, quotedMsg, contextInfo }) {
    // 1. Commande d'annulation explicite
    if (command === 'delttt' || command === 'removettt' || command === 'cancelttt' || args[0] === 'del' || args[0] === 'cancel' || args[0] === 'abandon' || args[0] === 'ff') {
      const deleted = deleteGame(from);
      if (deleted) {
        return await socket.sendMessage(from, {
          text: '🛑 *La partie de Morpion a été annulée avec succès.*'
        }, { quoted: msg });
      } else {
        return await socket.sendMessage(from, {
          text: '❌ *Aucune partie de Morpion active dans ce salon.*'
        }, { quoted: msg });
      }
    }

    // 2. Résolution de l'adversaire (Quoted, Mentions, ou Numéro en argument)
    let opponentJid = null;

    // A. Via message cité (Reply)
    if (contextInfo?.participant) {
      opponentJid = contextInfo.participant;
    } else if (msg.message?.extendedTextMessage?.contextInfo?.participant) {
      opponentJid = msg.message.extendedTextMessage.contextInfo.participant;
    }

    // B. Via Mention @user
    if (!opponentJid && contextInfo?.mentionedJid && contextInfo.mentionedJid.length > 0) {
      opponentJid = contextInfo.mentionedJid[0];
    } else if (!opponentJid && msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
      opponentJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
    }

    // C. Via Numéro passé en argument
    let preferredStart = null;
    if (args && args.length > 0) {
      for (const arg of args) {
        const cleanDigits = arg.replace(/[^0-9]/g, '');
        if (cleanDigits.length >= 7 && !opponentJid) {
          opponentJid = `${cleanDigits}@s.whatsapp.net`;
        }
        if (arg.toLowerCase() === 'random' || arg.toLowerCase() === 'x' || arg.toLowerCase() === 'o' || arg.toLowerCase() === '2') {
          preferredStart = arg.toLowerCase();
        }
      }
    }

    // 3. Si aucun adversaire n'a pu être résolu
    if (!opponentJid) {
      return await socket.sendMessage(from, {
        text: `🎮 *JEU DU MORPION (TIC-TAC-TOE)* 🎮\n\n` +
              `📌 *Comment lancer un duel :*\n` +
              `• Mentionnez un ami : \`.ttt @ami\`\n` +
              `• Ou répondez à un message avec \`.ttt\`\n` +
              `• Avec tirage au sort : \`.ttt @ami random\`\n\n` +
              `💡 *Commandes de jeu :*\n` +
              `• Envoyez un chiffre (*1 à 9*) sur la grille pour jouer\n` +
              `• \`.delttt\` ou tapez \`abandon\` pour déclarer forfait`
      }, { quoted: msg });
    }

    await startTicTacToe(socket, msg, from, sender, opponentJid, preferredStart);
  }
};
