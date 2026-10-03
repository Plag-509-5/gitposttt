// ============================================================
// KAIDO-MD — MOTEUR DE JEU MORPION (TIC-TAC-TOE) AMÉLIORÉ
// ============================================================

const activeGames = new Map(); // chatJid -> GameState

/**
 * Extrait uniquement les chiffres d'un JID (insensible aux LIDs, :1, @s.whatsapp.net, etc.)
 */
function extractUserId(jid) {
  if (!jid) return '';
  return String(jid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

/**
 * Normalise un JID propre pour les mentions WhatsApp
 */
function normalizeJid(jid) {
  const id = extractUserId(jid);
  return id ? `${id}@s.whatsapp.net` : '';
}

/**
 * Rendu visuel textuel de la grille 3x3
 */
function renderBoard(board) {
  const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
  const emojis = board.map((cell, index) => {
    if (cell === 'X') return '❌';
    if (cell === 'O') return '⭕';
    return numberEmojis[index];
  });

  return `       ${emojis[0]}  ┃  ${emojis[1]}  ┃  ${emojis[2]}\n` +
         `      ━━━━╋━━━━╋━━━━\n` +
         `       ${emojis[3]}  ┃  ${emojis[4]}  ┃  ${emojis[5]}\n` +
         `      ━━━━╋━━━━╋━━━━\n` +
         `       ${emojis[6]}  ┃  ${emojis[7]}  ┃  ${emojis[8]}`;
}

/**
 * Vérifie l'état de la partie (Gagnant 'X'/'O', Match nul 'tie', ou en cours null)
 */
function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Lignes
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Colonnes
    [0, 4, 8], [2, 4, 6]             // Diagonales
  ];
  
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  
  if (board.every(cell => cell !== null)) {
    return 'tie';
  }
  
  return null;
}

/**
 * Réinitialise le minuteur d'inactivité (2 minutes)
 */
function resetGameTimeout(socket, from, game) {
  if (game.timeout) clearTimeout(game.timeout);
  game.timeout = setTimeout(async () => {
    if (activeGames.has(from)) {
      activeGames.delete(from);
      try {
        await socket.sendMessage(from, {
          text: `⏱️ *Partie de Morpion expirée pour inactivité (2 minutes sans coup).*`
        });
      } catch (e) {}
    }
  }, 120000);
}

/**
 * GESTIONNAIRE SANS PRÉFIXE DES COUPS (1-9)
 */
async function handleTicTacToeMove(socket, msg, from, sender, text) {
  const rawText = String(text || '').trim();
  if (!/^[1-9]$/.test(rawText)) return false;

  const game = activeGames.get(from);
  if (!game) return false;

  const senderId = extractUserId(sender);
  const p1Id = extractUserId(game.playerX.jid);
  const p2Id = extractUserId(game.playerO.jid);

  // Si l'auteur du message ne fait pas partie des joueurs, ignorer silencieusement pour ne pas perturber le groupe
  if (senderId !== p1Id && senderId !== p2Id) {
    return false;
  }

  const currentTurnId = extractUserId(game.currentTurn.jid);

  // Vérification stricte du tour de jeu
  if (senderId !== currentTurnId) {
    await socket.sendMessage(from, {
      text: `⏳ @${senderId}, ce n'est pas votre tour ! Veuillez attendre votre adversaire.`,
      mentions: [normalizeJid(sender)]
    }, { quoted: msg });
    return true;
  }

  const move = parseInt(rawText);
  const index = move - 1;

  // Case déjà occupée
  if (game.board[index] !== null) {
    await socket.sendMessage(from, {
      text: `🚫 *Case déjà occupée !* Choisissez un chiffre encore disponible sur la grille.`,
      mentions: [game.playerX.jid, game.playerO.jid]
    }, { quoted: msg });
    return true;
  }

  // Application du coup
  game.board[index] = game.turnSymbol;
  const winner = checkWinner(game.board);

  // Déclaration du résultat final
  if (winner) {
    if (game.timeout) clearTimeout(game.timeout);
    activeGames.delete(from);

    let endText = `╭───「 🎮 *MORPION — RÉSULTAT* 」───\n│\n` +
                  `${renderBoard(game.board)}\n│\n`;

    if (winner === 'tie') {
      endText += `│ 🤝 *MATCH NUL !*\n│ Belle égalité entre @${p1Id} et @${p2Id} !\n╰────────────────────────☉`;
    } else {
      const winnerPlayer = winner === 'X' ? game.playerX : game.playerO;
      const loserPlayer = winner === 'X' ? game.playerO : game.playerX;
      endText += `│ 🏆 *VICTOIRE ÉCRASANTE !*\n` +
                 `│ 🎉 Gagnant : @${extractUserId(winnerPlayer.jid)} (${winner === 'X' ? '❌' : '⭕'})\n` +
                 `│ 💀 Perdant : @${extractUserId(loserPlayer.jid)}\n╰────────────────────────☉`;
    }

    await socket.sendMessage(from, {
      text: endText,
      mentions: [game.playerX.jid, game.playerO.jid]
    }, { quoted: msg });
    return true;
  }

  // Changement de tour
  const nextPlayer = currentTurnId === p1Id ? game.playerO : game.playerX;
  const nextSymbol = game.turnSymbol === 'X' ? 'O' : 'X';

  game.currentTurn = nextPlayer;
  game.turnSymbol = nextSymbol;

  // Relancer le timer d'inactivité
  resetGameTimeout(socket, from, game);

  const nextText = `╭───「 🎮 *MORPION EN COURS* 」───\n│\n` +
                   `${renderBoard(game.board)}\n│\n` +
                   `│ ❌ *Joueur 1 :* @${p1Id}\n` +
                   `│ ⭕ *Joueur 2 :* @${p2Id}\n│\n` +
                   `│ 👉 *Au tour de :* @${extractUserId(nextPlayer.jid)} (${nextSymbol === 'X' ? '❌' : '⭕'})\n` +
                   `│ 💡 _Envoyez un chiffre entre 1 et 9._\n` +
                   `╰────────────────────────☉`;

  await socket.sendMessage(from, {
    text: nextText,
    mentions: [game.playerX.jid, game.playerO.jid]
  }, { quoted: msg });

  return true;
}

/**
 * INITIALISATION D'UNE NOUVELLE PARTIE
 */
async function startTicTacToe(socket, msg, from, sender, opponentJid) {
  if (!opponentJid) {
    return await socket.sendMessage(from, {
      text: `❌ *Adversaire non spécifié.*\n\n💡 *Exemples :*\n• Mentionner : \`.ttt @user\`\n• Répondre : Répondez au message de votre adversaire avec \`.ttt\``
    }, { quoted: msg });
  }

  const p1Id = extractUserId(sender);
  const p2Id = extractUserId(opponentJid);

  if (!p2Id) {
    return await socket.sendMessage(from, {
      text: `❌ Numéro d'adversaire introuvable.`
    }, { quoted: msg });
  }

  // Ne pas jouer contre soi-même
  if (p1Id === p2Id) {
    return await socket.sendMessage(from, {
      text: `🍁 *Vous ne pouvez pas jouer au Morpion contre vous-même !* Défi un ami dans le groupe.`
    }, { quoted: msg });
  }

  // Partie déjà en cours dans le chat
  if (activeGames.has(from)) {
    return await socket.sendMessage(from, {
      text: `⚠️ *Une partie est déjà en cours dans ce salon.* Tapez \`.delttt\` pour l'annuler.`
    }, { quoted: msg });
  }

  const playerX = { id: p1Id, jid: normalizeJid(sender) };
  const playerO = { id: p2Id, jid: normalizeJid(opponentJid) };

  const newGame = {
    board: Array(9).fill(null),
    playerX,
    playerO,
    currentTurn: playerX,
    turnSymbol: 'X',
    timeout: null
  };

  activeGames.set(from, newGame);
  resetGameTimeout(socket, from, newGame);

  const startText = `╭───「 🎮 *DUEL MORPION LANCÉ !* 」───\n│\n` +
                    `${renderBoard(Array(9).fill(null))}\n│\n` +
                    `│ ❌ *Joueur 1 :* @${p1Id}\n` +
                    `│ ⭕ *Joueur 2 :* @${p2Id}\n│\n` +
                    `│ 👉 *Premier coup :* @${p1Id} (❌)\n` +
                    `│ 📌 Envoyez directement un chiffre (*1 à 9*) dans le chat.\n` +
                    `╰────────────────────────☉`;

  await socket.sendMessage(from, {
    text: startText,
    mentions: [playerX.jid, playerO.jid]
  }, { quoted: msg });
}

/**
 * ANNULATION D'UNE PARTIE
 */
function deleteGame(from) {
  if (activeGames.has(from)) {
    const game = activeGames.get(from);
    if (game.timeout) clearTimeout(game.timeout);
    activeGames.delete(from);
    return true;
  }
  return false;
}

module.exports = {
  handleTicTacToeMove,
  startTicTacToe,
  deleteGame
};
