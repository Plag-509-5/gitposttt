const { startTicTacToe, deleteGame } = require('../../files/tictactoe');

module.exports = {
  name: 'tictactoe',
  alias: ['ttt', 'morpion', 'delttt', 'removettt'],
  category: 'games',
  description: 'Lance une partie de Morpion (Tic-Tac-Toe) contre un ami dans le groupe',
  usage: '.ttt @adversaire (ou en répondant à son message) | .delttt pour annuler',
  async execute({ socket, msg, from, sender, args, command }) {
    if (command === 'delttt' || command === 'removettt') {
      const deleted = deleteGame(from);
      if (deleted) {
        return await socket.sendMessage(from, {
          text: '🛑 *Partie de Morpion annulée avec succès.*'
        }, { quoted: msg });
      } else {
        return await socket.sendMessage(from, {
          text: '❌ *Aucune partie active trouvée dans ce salon.*'
        }, { quoted: msg });
      }
    }

    // 1. Recherche si l'expéditeur répond à un message (Reply)
    let opponentJid = msg.message?.extendedTextMessage?.contextInfo?.participant;

    // 2. Si ce n'est pas un reply, recherche des mentions @user
    if (!opponentJid) {
      opponentJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    }

    // 3. Si aucun adversaire spécifié
    if (!opponentJid) {
      return await socket.sendMessage(from, {
        text: `🎮 *JEU DU MORPION (TIC-TAC-TOE)* 🎮\n\n` +
              `📌 *Comment lancer une partie :*\n` +
              `• Mentionnez un joueur : \`.ttt @user\`\n` +
              `• Ou répondez à un de ses messages avec \`.ttt\`\n\n` +
              `💡 *Commandes utiles :*\n` +
              `• \`.delttt\` — Annuler la partie en cours`
      }, { quoted: msg });
    }

    await startTicTacToe(socket, msg, from, sender, opponentJid);
  }
};
