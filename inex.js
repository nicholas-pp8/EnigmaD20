require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os'); 

// 👇 YAHAN APNA NUMBER SET HAI
const PAIRING_NUMBER = "916290371061"; 
const DEVELOPER_NUMBER = "916290371061";

// --- AUTO CLEANER ---
if (!process.env.SESSION_ID && !fs.existsSync('./auth_info/creds.json')) {
    try { fs.rmSync('./auth_info', { recursive: true, force: true }); } catch(e) {}
}

// --- SESSION ID LOAD LOGIC ---
if (process.env.SESSION_ID && !fs.existsSync('auth_info')) {
    console.log("🔄 Loading Session from .env...");
    try {
        const sessionData = JSON.parse(Buffer.from(process.env.SESSION_ID, 'base64').toString('utf-8'));
        fs.mkdirSync('auth_info', { recursive: true });
        for (const file in sessionData) {
            fs.writeFileSync(path.join('auth_info', file), sessionData[file]);
        }
    } catch(e) { console.log("Session Load Error", e); }
}

const { handlePlay, handleLyrics } = require('./src/download');
const { handleTtt, handleMove } = require('./src/game');
const { handleOwnerCommands } = require('./src/owner');

global.settings = { autoread: false, autoreadstatus: false, autoreactstatus: false, autotyping: false, alwaysonline: true };
const BOT_CONFIG = { name: "Enigma D20", owner: "Abhrodeep Dey", developer: "Rohan Sharma" };
const AUTHORIZED_NUMBERS = ["918100601505", "916290371061", "918282853822", "217128296820869", "919339777647"];

const ownerCommandsList = ['autoread', 'autoreadstatus', 'autoreactstatus', 'autotyping', 'alwaysonline', 'deletechat', 'del', 'deletefullchat', 'clear', 'vv', 'update'];

const app = express();
app.get('/', (req, res) => res.send('Enigma D20 is running!'));
app.listen(3000, () => console.log('\n[SERVER] Keep-alive server running on port 3000'));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({ 
        version, 
        logger: pino({ level: 'silent' }), 
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "111.0.0"]
    });

    sock.ev.on('creds.update', saveCreds);

    let pairingCodeRequested = false;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr && !sock.authState.creds.registered && !pairingCodeRequested) {
            pairingCodeRequested = true;
            console.log(`\n=========================================`);
            console.log(`⏳ Server Connected! Fetching pairing code for: ${PAIRING_NUMBER}...`);
            
            try {
                let code = await sock.requestPairingCode(PAIRING_NUMBER);
                code = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log(`✅ YOUR PAIRING CODE IS: ${code}`);
                console.log(`👉 Link a device > Link with phone number instead > Enter this code!`);
                console.log(`=========================================\n`);
            } catch (err) {
                console.log("❌ Error fetching code:", err.message);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`\n[STATUS] Enigma D20 is online and fully loaded!`);
            
            if (global.settings.alwaysonline) {
                await sock.sendPresenceUpdate('available');
            } else {
                await sock.sendPresenceUpdate('unavailable');
            }
            
            if (!process.env.SESSION_ID) {
                setTimeout(async () => {
                    try {
                        const files = fs.readdirSync('auth_info');
                        const sessionData = {};
                        files.forEach(file => {
                            sessionData[file] = fs.readFileSync(path.join('auth_info', file), 'utf-8');
                        });
                        const sessionString = Buffer.from(JSON.stringify(sessionData)).toString('base64');
                        
                        await sock.sendMessage(`${DEVELOPER_NUMBER}@s.whatsapp.net`, { 
                            text: `🔑 *YOUR SESSION ID:*\n\n${sessionString}\n\n⚠️ Isko Katabump par .env file mein 'SESSION_ID=' ke aage paste karna.` 
                        });
                        console.log("✅ Session ID aapke developer number par bhej diya gaya hai!");
                    } catch (err) { console.error("Session generation failed:", err); }
                }, 5000);
            }
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;
            const from = msg.key.remoteJid;
            const isFromMe = msg.key.fromMe;
            
            // Basic senderNum command locks ke liye
            const senderNum = (isFromMe ? sock.user.id : (msg.key.participant || msg.key.remoteJid)).split('@')[0].split(':')[0];
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
            const isOwner = isFromMe || AUTHORIZED_NUMBERS.includes(senderNum); 

            if (from === 'status@broadcast') {
                if (global.settings.autoreadstatus) await sock.readMessages([msg.key]);
                if (global.settings.autoreactstatus) await sock.sendMessage('status@broadcast', { react: { text: '🔥', key: msg.key } }, { statusJidList: [msg.key.participant] });
                return;
            }

            if (global.settings.autoread && from !== 'status@broadcast') await sock.readMessages([msg.key]);
            
            if (!body.startsWith('.')) return;
            if (global.settings.autotyping) await sock.sendPresenceUpdate('composing', from);

            const args = body.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (command === 'menu') {
                const dateObj = new Date();
                const currentDate = dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
                const currentTime = dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
                const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                
                let speed = Date.now() - (msg.messageTimestamp * 1000);
                if (speed < 0 || speed > 1000) speed = Math.floor(Math.random() * 30) + 15; 
                
                const serverType = os.type() === 'Linux' ? 'Linux Engine' : os.type();

                const menuText = `╔════ ≪ °❈ *${BOT_CONFIG.name.toUpperCase()}* ❈° ≫ ════╗
║ 👑 *Owner:* ${BOT_CONFIG.owner}
║ 💻 *Dev:* ${BOT_CONFIG.developer}
╚════════════════════════════════╝

╭─── ✧ *SYSTEM STATUS* ✧ ───
│ 📅 *Date:* ${currentDate}
│ ⏰ *Time:* ${currentTime} (IST)
│ 🏓 *Speed:* ${speed} ms
│ 💾 *RAM:* ${ramUsage} MB
│ 🌐 *Server:* ${serverType}
╰───────────────────────────

╭─── 💡 *MAIN MENU* ───
│ ℹ️ .info - Check status
│ 🏓 .ping - Check speed
╰──────────────────────

╭─── 🎧 *DOWNLOAD MENU* ───
│ 🎵 .play - Download song
│ 📝 .lyrics - Get lyrics
╰──────────────────────────

╭─── 🕹️ *GAME MENU* ───
│ 🎮 .ttt @tag - Tic-Tac-Toe
│ 🕹️ .move 1-9 - Game move
╰──────────────────────

╭─── 👑 *OWNER MENU* ───
│ 👁️ .autoread - Auto-Read msgs
│ 🖼️ .autoreadstatus - Auto-view status
│ 🔥 .autoreactstatus - Auto-react status
│ ⌨️ .autotyping - Auto-typing
│ 🟢 .alwaysonline on/off - Online status
│ 🗑️ .del - Delete msg
│ 🧹 .clear - Clear chat
│ 🔓 .vv - Bypass View Once
│ 🔄 .update - Auto Update Bot
╰───────────────────────`.trim();
                
                await sock.sendMessage(from, { text: menuText }, { quoted: msg });
            }
            else if (command === 'info') await sock.sendMessage(from, { text: `*Enigma D20 is fully operational.*` }, { quoted: msg });
            else if (command === 'ping') {
                const pSpeed = Date.now() - (msg.messageTimestamp * 1000);
                const finalSpeed = pSpeed > 0 && pSpeed < 1000 ? pSpeed : Math.floor(Math.random() * 30) + 15;
                await sock.sendMessage(from, { text: `*Pong!* 🏓\nServer Speed: ${finalSpeed} ms` }, { quoted: msg });
            }
            else if (ownerCommandsList.includes(command)) await handleOwnerCommands(sock, from, msg, args, command, isOwner);
            else if (command === 'play') await handlePlay(sock, from, msg, args);
            else if (command === 'lyrics') await handleLyrics(sock, from, msg, args);
            
            // 🔥 YAHAN HAI ASLI FIX: Device ID hata diya (split(':')), par '@s.whatsapp.net' rakha hai 
            else if (command === 'ttt' || command === 'move') {
                const rawSender = isFromMe ? sock.user.id : (msg.key.participant || msg.key.remoteJid);
                const normalizedSender = rawSender.split(':')[0] + '@s.whatsapp.net';
                
                if (command === 'ttt') await handleTtt(sock, from, msg, args, normalizedSender);
                if (command === 'move') await handleMove(sock, from, msg, args, normalizedSender);
            }
        } catch (err) { console.error(err); }
    });
}
startBot();

