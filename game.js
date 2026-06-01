// --- Game State Storage ---
const tttSessions = new Map();
const scrambleSessions = new Map();

const words = [
    "javascript", "developer", "whatsapp", "enigma", "programming",
    "hacker", "termux", "linux", "server", "database", "network",
    "bot", "github", "coding", "python", "application"
];

// 🎮 1. TIC-TAC-TOE LOGIC
async function handleTtt(sock, from, msg, args, senderNum) {
    if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid) {
        const player2 = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        const player1 = `${senderNum}@s.whatsapp.net`;
        
        if (player1 === player2) {
            return await sock.sendMessage(from, { text: "⚠️ You cannot play with yourself!" }, { quoted: msg });
        }

        tttSessions.set(from, {
            board: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            turn: player1,
            player1,
            player2
        });

        const boardMsg = `🎮 *TIC-TAC-TOE STARTED* 🎮\n\nPlayer 1: @${player1.split('@')[0]} (❌)\nPlayer 2: @${player2.split('@')[0]} (⭕)\n\n1️⃣ | 2️⃣ | 3️⃣\n4️⃣ | 5️⃣ | 6️⃣\n7️⃣ | 8️⃣ | 9️⃣\n\n*Turn:* @${player1.split('@')[0]}\n_Type .move <number> to play_`;
        
        await sock.sendMessage(from, { text: boardMsg, mentions: [player1, player2] }, { quoted: msg });
    } else {
        await sock.sendMessage(from, { text: "⚠️ Please tag a user to play with!\n*Example:* .ttt @user" }, { quoted: msg });
    }
}

async function handleMove(sock, from, msg, args, senderNum) {
    const session = tttSessions.get(from);
    if (!session) return await sock.sendMessage(from, { text: "⚠️ No active Tic-Tac-Toe game in this chat!" }, { quoted: msg });

    const player = `${senderNum}@s.whatsapp.net`;
    if (session.turn !== player) return await sock.sendMessage(from, { text: "⚠️ It's not your turn!" }, { quoted: msg });

    const move = parseInt(args[0]);
    if (isNaN(move) || move < 1 || move > 9 || session.board[move - 1] === '❌' || session.board[move - 1] === '⭕') {
        return await sock.sendMessage(from, { text: "⚠️ Invalid move! Please choose an empty block number (1-9)." }, { quoted: msg });
    }

    const mark = player === session.player1 ? '❌' : '⭕';
    session.board[move - 1] = mark;

    const b = session.board;
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    let winner = null;
    for (let p of winPatterns) {
        if (b[p[0]] === b[p[1]] && b[p[1]] === b[p[2]]) {
            winner = player;
            break;
        }
    }

    const isDraw = !winner && b.every(cell => cell === '❌' || cell === '⭕');
    
    const displayBoard = b.map(c => c === '❌' ? '❌' : (c === '⭕' ? '⭕' : ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'][parseInt(c)-1]));
    const boardStr = `${displayBoard[0]} | ${displayBoard[1]} | ${displayBoard[2]}\n${displayBoard[3]} | ${displayBoard[4]} | ${displayBoard[5]}\n${displayBoard[6]} | ${displayBoard[7]} | ${displayBoard[8]}`;

    if (winner) {
        await sock.sendMessage(from, { text: `🏆 *GAME OVER!* 🏆\n\n${boardStr}\n\n🎉 Winner: @${winner.split('@')[0]}`, mentions: [winner] }, { quoted: msg });
        tttSessions.delete(from);
    } else if (isDraw) {
        await sock.sendMessage(from, { text: `🤝 *GAME OVER! It's a DRAW!*\n\n${boardStr}` }, { quoted: msg });
        tttSessions.delete(from);
    } else {
        session.turn = player === session.player1 ? session.player2 : session.player1;
        await sock.sendMessage(from, { text: `🎮 *TIC-TAC-TOE* 🎮\n\n${boardStr}\n\n*Turn:* @${session.turn.split('@')[0]}`, mentions: [session.turn] }, { quoted: msg });
    }
}

// 🔠 2. WORD SCRAMBLE LOGIC
async function handleScramble(sock, from, msg, args) {
    if (scrambleSessions.has(from)) {
        return await sock.sendMessage(from, { text: "⚠️ A scramble game is already active! Type .ans <word> to guess." }, { quoted: msg });
    }

    const word = words[Math.floor(Math.random() * words.length)];
    const scrambled = word.split('').sort(() => 0.5 - Math.random()).join('');
    
    scrambleSessions.set(from, { word });

    await sock.sendMessage(from, { text: `🔠 *WORD SCRAMBLE* 🔠\n\nUnscramble this word: *${scrambled.toUpperCase()}*\n\n_Reply with .ans <your_guess>_` }, { quoted: msg });
}

async function handleAnswer(sock, from, msg, args) {
    const session = scrambleSessions.get(from);
    if (!session) return await sock.sendMessage(from, { text: "⚠️ No active scramble game! Start one with .scramble" }, { quoted: msg });

    if (!args || args.length === 0) return await sock.sendMessage(from, { text: "⚠️ Please provide your guess!\n*Example:* .ans hello" }, { quoted: msg });

    const guess = args[0].toLowerCase();
    
    if (guess === session.word) {
        await sock.sendMessage(from, { text: `🎉 *CORRECT!* 🎉\n\nThe word was *${session.word.toUpperCase()}*!` }, { quoted: msg });
        scrambleSessions.delete(from);
    } else {
        await sock.sendMessage(from, { text: `❌ *WRONG GUESS!* Try again.\n_Hint: It starts with '${session.word[0].toUpperCase()}'_` }, { quoted: msg });
    }
}

// 🪨📄✂️ 3. ROCK PAPER SCISSORS LOGIC
async function handleRps(sock, from, msg, args, senderNum) {
    const choices = ['rock', 'paper', 'scissors'];
    const emojis = { 'rock': '🪨', 'paper': '📄', 'scissors': '✂️' };

    if (!args || args.length === 0 || !choices.includes(args[0].toLowerCase())) {
        return await sock.sendMessage(from, { 
            text: "⚠️ Please choose rock, paper, or scissors!\n\n*Example:* .rps rock" 
        }, { quoted: msg });
    }

    const userChoice = args[0].toLowerCase();
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    let result = "";
    if (userChoice === botChoice) {
        result = "It's a TIE! 🤝";
    } else if (
        (userChoice === 'rock' && botChoice === 'scissors') ||
        (userChoice === 'paper' && botChoice === 'rock') ||
        (userChoice === 'scissors' && botChoice === 'paper')
    ) {
        result = "YOU WIN! 🎉";
    } else {
        result = "I WIN! 😎";
    }

    const replyText = `🎮 *ROCK PAPER SCISSORS* 🎮\n\n👤 *You chose:* ${emojis[userChoice]} ${userChoice}\n🤖 *I chose:* ${emojis[botChoice]} ${botChoice}\n\n*Result:* ${result}`;
    
    await sock.sendMessage(from, { text: replyText }, { quoted: msg });
}

// 💥 EXPORTING ALL GAMES 💥
module.exports = { handleTtt, handleMove, handleScramble, handleAnswer, handleRps };

