// ============================================================
// KAIDO-MD — MOTEUR DE JEU DU MORPION (TIC-TAC-TOE) ÉLÉGANT & ROBUSTE
// ============================================================

const activeGames = new Map(); // chatJid -> GameState

/**
 * Extrait uniquement les chiffres d'un JID (supporte LIDs, devices :1, etc.)
 */
function extractUserId(jid) {
  if (!jid) return '';
  return String(jid).split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
}

/**
 * Normalise un JID standard pour les mentions WhatsApp (@s.whatsapp.net)
 */
function normalizeJid(jid) {
  const id = extractUserId(jid);
  return id ? `${id}@s.whatsapp.net` : '';
}

/**
 * Rendu textuel visuel et soigné de la grille 3x3
 */
function renderBoard(board) {
  const numEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
  const cells = board.map((cell, idx) => {
    if (cell === 'X') return '❌';
    if (cell === 'O') return '⭕';
    return numEmojis[idx];
  });

  return `       ${cells[0]}  ┃  ${cells[1]}  ┃  ${cells[2]}\n` +
         `      ━━━━╋━━━━╋━━━━\n` +
         `       ${cells[3]}  ┃  ${cells[4]}  ┃  ${cells[5]}\n` +
         `      ━━━━╋━━━━╋━━━━\n` +
         `       ${cells[6]}  ┃  ${cells[7]}  ┃  ${cells[8]}`;
}

/**
 * Vérifie l'état de la grille : 'X', 'O', 'tie' (match nul) ou null (en cours)
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
 * Minuteur d'inactivité (2 minutes)
 */
function resetGameTimeout(socket, from, game) {
  if (game.timeout) clearTimeout(game.timeout);
  game.timeout = setTimeout(async () => {
    if (activeGames.has(from)) {
      activeGames.delete(from);
      try {
        await socket.sendMessage(from, {
          text: `⏱️ *Partie de Morpion expirée pour inactivité (2 minutes sans coup).*\n> La grille a été réinitialisée.`,
          mentions: [game.playerX.jid, game.playerO.jid]
        });
      } catch (e) {}
    }
  }, 120000);
}

/**
 * Traite un coup joué (1 à 9) ou une commande d'abandon
 */
async function handleTicTacToeMove(socket, msg, from, sender, text) {
  const rawText = String(text || '').trim().toLowerCase();
  const game = activeGames.get(from);
  if (!game) return false;

  const senderId = extractUserId(sender);
  const p1Id = extractUserId(game.playerX.jid);
  const p2Id = extractUserId(game.playerO.jid);

  // Si l'émetteur n'est pas l'un des deux joueurs, ignorer silencieusement
  if (senderId !== p1Id && senderId !== p2Id) {
    return false;
  }

  // Gestion de l'abandon en plein jeu
  if (rawText === 'ff' || rawText === 'abandon' || rawText === 'surrender' || rawText === '.delttt' || rawText === 'delttt') {
    if (game.timeout) clearTimeout(game.timeout);
    activeGames.delete(from);

    const winner = senderId === p1Id ? game.playerO : game.playerX;
    const loserId = senderId;
    const winnerId = extractUserId(winner.jid);

    await socket.sendMessage(from, {
      text: `🏳️ *ABANDON DÉCLARÉ !*\n\n` +
            `💀 @${loserId} a déclaré forfait.\n` +
            `🏆 Victoire par abandon attribuée à @${winnerId} !`,
      mentions: [game.playerX.jid, game.playerO.jid]
    }, { quoted: msg });
    return true;
  }

  // Vérifier si le texte correspond à un chiffre 1-9
  if (!/^[1-9]$/.test(rawText)) {
    return false;
  }

  const currentTurnId = extractUserId(game.currentTurn.jid);

  // Vérification stricte du tour de jeu
  if (senderId !== currentTurnId) {
    await socket.sendMessage(from, {
      text: `⏳ @${senderId}, ce n'est pas encore votre tour !\n> Veuillez patienter que @${currentTurnId} joue son coup.`,
      mentions: [normalizeJid(sender), game.currentTurn.jid]
    }, { quoted: msg });
    return true;
  }

  const index = parseInt(rawText, 10) - 1;

  // Case déjà occupée
  if (game.board[index] !== null) {
    await socket.sendMessage(from, {
      text: `🚫 *Case ${rawText} déjà occupée !*\n> Veuillez choisir un autre numéro disponible sur la grille.`,
      mentions: [game.playerX.jid, game.playerO.jid]
    }, { quoted: msg });
    return true;
  }

  // Enregistrer le coup
  game.board[index] = game.turnSymbol;
  const result = checkWinner(game.board);

  // Fin de partie (Victoire ou Nul)
  if (result) {
    if (game.timeout) clearTimeout(game.timeout);
    activeGames.delete(from);

    let endText = `╭───「 🎮 *MORPION — FIN DE PARTIE* 」───\n│\n` +
                  `${renderBoard(game.board)}\n│\n`;

    if (result === 'tie') {
      endText += `│ 🤝 *MATCH NUL !*\n` +
                 `│ Aucun vainqueur entre @${p1Id} (❌) et @${p2Id} (⭕).\n` +
                 `╰────────────────────────☉`;
    } else {
      const winner = result === 'X' ? game.playerX : game.playerO;
      const loser = result === 'X' ? game.playerO : game.playerX;
      endText += `│ 🏆 *VICTOIRE ÉCLATANTE !*\n` +
                 `│ 🎉 Vainqueur : @${extractUserId(winner.jid)} (${result === 'X' ? '❌' : '⭕'})\n` +
                 `│ 💀 Perdant : @${extractUserId(loser.jid)}\n` +
                 `╰────────────────────────☉`;
    }

    await socket.sendMessage(from, {
      text: endText,
      mentions: [game.playerX.jid, game.playerO.jid]
    }, { quoted: msg });

    return true;
  }

  // Alternance des tours
  const nextPlayer = currentTurnId === p1Id ? game.playerO : game.playerX;
  const nextSymbol = game.turnSymbol === 'X' ? 'O' : 'X';

  game.currentTurn = nextPlayer;
  game.turnSymbol = nextSymbol;

  // Réinitialiser le timeout
  resetGameTimeout(socket, from, game);

  const nextText = `╭───「 🎮 *MORPION EN COURS* 」───\n│\n` +
                   `${renderBoard(game.board)}\n│\n` +
                   `│ ❌ *Joueur 1 :* @${p1Id}\n` +
                   `│ ⭕ *Joueur 2 :* @${p2Id}\n│\n` +
                   `│ 👉 *Au tour de :* @${extractUserId(nextPlayer.jid)} (${nextSymbol === 'X' ? '❌' : '⭕'})\n` +
                   `│ 💡 _Envoyez directement le chiffre (1-9) de votre choix._\n` +
                   `╰────────────────────────☉`;

  await socket.sendMessage(from, {
    text: nextText,
    mentions: [game.playerX.jid, game.playerO.jid]
  }, { quoted: msg });

  return true;
}

/**
 * Lance une nouvelle partie de Morpion
 */
async function startTicTacToe(socket, msg, from, sender, opponentJid, preferredStart = null) {
  if (!opponentJid) {
    return await socket.sendMessage(from, {
      text: `❌ *Adversaire non spécifié.*\n\n💡 *Exemples :*\n• Mentionner : \`.ttt @user\`\n• Répondre : Répondez au message d'un ami avec \`.ttt\``
    }, { quoted: msg });
  }

  const p1Id = extractUserId(sender);
  const p2Id = extractUserId(opponentJid);

  if (!p2Id) {
    return await socket.sendMessage(from, {
      text: `❌ *Numéro d'adversaire invalide.*`
    }, { quoted: msg });
  }

  if (p1Id === p2Id) {
    return await socket.sendMessage(from, {
      text: `🍁 *Vous ne pouvez pas jouer contre vous-même !*\n> Défiez un autre membre du groupe.`
    }, { quoted: msg });
  }

  if (activeGames.has(from)) {
    return await socket.sendMessage(from, {
      text: `⚠️ *Une partie de Morpion est déjà en cours dans ce salon.*\n> Tapez \`.delttt\` pour l'annuler ou terminez-la.`
    }, { quoted: msg });
  }

  const playerX = { id: p1Id, jid: normalizeJid(sender) };
  const playerO = { id: p2Id, jid: normalizeJid(opponentJid) };

  // Choix du premier joueur (si spécifié ou aléatoire équilibré)
  let starter = playerX;
  if (preferredStart === 'O' || preferredStart === '2' || preferredStart === 'o') {
    starter = playerO;
  } else if (preferredStart === 'random') {
    starter = Math.random() > 0.5 ? playerX : playerO;
  }

  const newGame = {
    board: Array(9).fill(null),
    playerX,
    playerO,
    currentTurn: starter,
    turnSymbol: starter === playerX ? 'X' : 'O',
    timeout: null
  };

  activeGames.set(from, newGame);
  resetGameTimeout(socket, from, newGame);

  const starterId = extractUserId(starter.jid);
  const symbol = starter === playerX ? '❌' : '⭕';

  const startText = `╭───「 🎮 *DUEL MORPION LANCÉ !* 」───\n│\n` +
                    `${renderBoard(Array(9).fill(null))}\n│\n` +
                    `│ ❌ *Joueur 1 :* @${p1Id}\n` +
                    `│ ⭕ *Joueur 2 :* @${p2Id}\n│\n` +
                    `│ 👉 *Premier coup :* @${starterId} (${symbol})\n` +
                    `│ 📌 _Envoyez directement un chiffre (*1 à 9*) dans le chat._\n` +
                    `╰────────────────────────☉`;

  await socket.sendMessage(from, {
    text: startText,
    mentions: [playerX.jid, playerO.jid]
  }, { quoted: msg });
}

/**
 * Annule la partie en cours
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
  deleteGame,
  extractUserId,
  normalizeJid
};
