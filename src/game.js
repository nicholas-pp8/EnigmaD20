const fs = require('fs');

// ==========================================
// 🕹️ TIC-TAC-TOE LOGIC (PURANA WALA)
// ==========================================
const tttGames = {};

async function handleTtt(sock, from, msg, args, senderNum) {
    if (tttGames[from]) return await sock.sendMessage(from, { text: "⚠️ Game already chal raha hai!" }, { quoted: msg });
    
    tttGames[from] = { board: ['1', '2', '3', '4', '5', '6', '7', '8', '9'], turn: 'X', players: [senderNum] };
    const boardStr = `Tic-Tac-Toe Start!\n\n${tttGames[from].board.slice(0,3).join(' | ')}\n${tttGames[from].board.slice(3,6).join(' | ')}\n${tttGames[from].board.slice(6,9).join(' | ')}\n\nType .move <1-9>`;
    await sock.sendMessage(from, { text: boardStr }, { quoted: msg });
}

async function handleMove(sock, from, msg, args, senderNum) {
    const game = tttGames[from];
    if (!game) return await sock.sendMessage(from, { text: "⚠️ Pehle .ttt se game start karo." }, { quoted: msg });
    
    const pos = parseInt(args[0]) - 1;
    if (isNaN(pos) || pos < 0 || pos > 8 || game.board[pos] === 'X' || game.board[pos] === 'O') {
        return await sock.sendMessage(from, { text: "❌ Invalid move!" }, { quoted: msg });
    }

    game.board[pos] = game.turn;
    game.turn = game.turn === 'X' ? 'O' : 'X';
    
    const boardStr = `${game.board.slice(0,3).join(' | ')}\n${game.board.slice(3,6).join(' | ')}\n${game.board.slice(6,9).join(' | ')}`;
    await sock.sendMessage(from, { text: `Move played:\n\n${boardStr}` }, { quoted: msg });
}

// ==========================================
// 🔠 WORD SCRAMBLE GAME (MEGA EDITION)
// ==========================================
const scrambleGames = {};

// 100+ Words ka Ultimate Collection
const wordsList = [
    // Original Words
    "developer", "javascript", "nodejs", "programming", "romance", "forever", 
    "together", "wonderland", "kolkata", "hooghly", "howrah", "sunflower",
    "internet", "computer", "keyboard", "chocolate", "beautiful", "starlight", 
    "destiny", "loyalty",
    
    // Tech & Science
    "algorithm", "database", "interface", "backend", "frontend", "server", 
    "network", "terminal", "variable", "function", "galaxy", "universe", 
    "astronaut", "telescope", "gravity", "asteroid", "nebula", "physics", 
    "chemistry", "biology",
    
    // Emotions & Abstract
    "happiness", "freedom", "courage", "harmony", "wisdom", "passion", 
    "eternity", "illusion", "memory", "adventure", "treasure", "journey", 
    "festival", "symphony", "whisper", "shadow", "crystal", "diamond", 
    "platinum", "sapphire",
    
    // Nature & Animals
    "elephant", "dolphin", "mountain", "ocean", "waterfall", "butterfly", 
    "panther", "kangaroo", "thunderstorm", "volcano", "sunlight", "moonlight",
    
    // Food & Daily Objects
    "strawberry", "pizza", "hamburger", "vanilla", "cinnamon", "avocado", 
    "espresso", "pancake", "blueberry", "caramel", "umbrella", "backpack", 
    "blanket", "lantern", "mirror", "guitar", "compass", "notebook", "scissors",
    
    // Complex & Adjectives
    "marvelous", "gorgeous", "spectacular", "brilliant", "mysterious", 
    "invisible", "fantastic", "incredible", "magnificent", "hilarious",
    "architecture", "photography", "vocabulary", "dictionary", "philosophy", 
    "psychology", "imagination", "literature", "technology", "university",
    
    // Kolkata/Desi Special
    "rasgulla", "victoria", "tram", "monsoon", "bengali", "phuchka", 
    "adda", "maidan", "darjeeling", "sundarbans", "biryani",

    // 💀 THE BOSS LEVEL WORD
    "supercalifragilisticexpialidocious"
];

// Word ko scramble (jumble) karne ka function
function shuffleWord(word) {
    let shuffled = word.split('').sort(() => 0.5 - Math.random()).join('');
    // Agar shuffle hone ke baad bhi word same rahe, toh wapas shuffle karo
    while (shuffled === word && word.length > 1) {
        shuffled = word.split('').sort(() => 0.5 - Math.random()).join('');
    }
    return shuffled;
}

async function handleScramble(sock, from, msg, args) {
    if (scrambleGames[from]) {
        return await sock.sendMessage(from, { text: "⚠️ Ek Word Scramble game pehle se chal raha hai! Jawab do." }, { quoted: msg });
    }

    const randomWord = wordsList[Math.floor(Math.random() * wordsList.length)];
    const scrambled = shuffleWord(randomWord);

    scrambleGames[from] = { 
        word: randomWord, 
        attempts: 3 
    };

    const textMsg = `🔠 *WORD SCRAMBLE* 🔠\n\nIs word ko un-scramble karo:\n👉 *${scrambled.toUpperCase()}*\n\nType *.ans <word>* to guess!\n💡 Attempts left: 3`;
    await sock.sendMessage(from, { text: textMsg }, { quoted: msg });
}

async function handleAnswer(sock, from, msg, args) {
    if (!scrambleGames[from]) {
        return await sock.sendMessage(from, { text: "⚠️ Abhi koi Scramble game nahi chal raha. Naya game start karne ke liye *.scramble* likhein." }, { quoted: msg });
    }

    if (args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Jawab toh likho! Jaise: *.ans hello*" }, { quoted: msg });
    }

    const userAnswer = args[0].toLowerCase();
    const game = scrambleGames[from];

    if (userAnswer === game.word) {
        await sock.sendMessage(from, { text: `🎉 *BINGO!* Ekdum Sahi Jawab!\n\nSahi word tha: *${game.word.toUpperCase()}*\n\nGame Over! Naya khelne ke liye wapas *.scramble* bhejein. 🥳` }, { quoted: msg });
        delete scrambleGames[from]; 
    } else {
        game.attempts -= 1;
        if (game.attempts > 0) {
            await sock.sendMessage(from, { text: `❌ Galat Jawab! Try again.\n💡 Attempts left: ${game.attempts}` }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: `💔 *Game Over!* Tum haar gaye.\n\nSahi word tha: *${game.word.toUpperCase()}*` }, { quoted: msg });
            delete scrambleGames[from]; 
        }
    }
}

module.exports = { 
    handleTtt, 
    handleMove, 
    handleScramble, 
    handleAnswer 
};

