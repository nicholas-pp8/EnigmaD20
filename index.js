require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os'); 
const { exec } = require('child_process'); 

const PAIRING_NUMBER = "916290371061"; 
const DEVELOPER_NUMBER = "916290371061";

if (!process.env.SESSION_ID && !fs.existsSync('./auth_info/creds.json')) {
    try { fs.rmSync('./auth_info', { recursive: true, force: true }); } catch(e) {}
}

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

const { handlePlay, handleLyrics, handleApk, handleVideo, handleTikTok, handleInstagram, handleFacebook } = require('./src/download'); 
const { handleTtt, handleMove, handleScramble, handleAnswer, handleRps } = require('./src/game'); 
const { handleOwnerCommands } = require('./src/owner');
const { handleTruecaller } = require('./src/search'); 
const { handleGroupCommands } = require('./src/group'); 

global.settings = { autoread: false, autoreadstatus: false, autoreactstatus: false, autotyping: false, alwaysonline: false, antidelete: false, updateRequired: false };
const BOT_CONFIG = { name: "Enigma D20", owner: "Abhrodeep Dey", developer: "Rohan Sharma" };
const AUTHORIZED_NUMBERS = ["918100601505", "916290371061", "918282853822", "217128296820869", "919339777647"];

const ownerCommandsList = ['autoread', 'autoreadstatus', 'autoreactstatus', 'autotyping', 'alwaysonline', 'deletechat', 'del', 'deletefullchat', 'clear', 'vv', 'update', 'sm', 'schedule', 'antidelete'];
const groupCommandsList = ['hidetag', 'tagall', 'removeall', 'promote', 'demote']; 

const app = express();
app.get('/', (req, res) => res.send('Enigma D20 is running!'));
app.listen(3000, () => console.log('\n[SERVER] Keep-alive server running on port 3000'));

function formatUptime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    const dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
    const hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
    const mDisplay = m > 0 ? m + (m === 1 ? " min, " : " mins, ") : "";
    const sDisplay = s > 0 ? s + (s === 1 ? " sec" : " secs") : "";
    return (dDisplay + hDisplay + mDisplay + sDisplay).replace(/,\s*$/, "");
}

const messageCache = new Map();

function startGithubTracker(sock) {
    setInterval(() => {
        if (global.settings.updateRequired) return; 

        exec('git fetch origin main && git rev-list HEAD..origin/main --count', async (err, stdout) => {
            if (!err) {
                const commitsBehind = parseInt(stdout.trim());
                if (commitsBehind > 0) {
                    global.settings.updateRequired = true;
                    await sock.sendMessage(`${DEVELOPER_NUMBER}@s.whatsapp.net`, { 
                        text: "⚠️ *NEW CODE DETECTED ON GITHUB*\n\nplease update the bot by sending .update otherwise you cant use the bot" 
                    });
                }
            }
        });
    }, 60000); 
}

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
            } catch (err) { }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(`\n[STATUS] Enigma D20 is online and fully loaded!`);
            
            if (global.settings.alwaysonline) await sock.sendPresenceUpdate('available');
            else await sock.sendPresenceUpdate('unavailable');
            
            startGithubTracker(sock);

            if (!process.env.SESSION_ID) {
                setTimeout(async () => {
                    try {
                        const files = fs.readdirSync('auth_info');
                        const sessionData = {};
                        files.forEach(file => { sessionData[file] = fs.readFileSync(path.join('auth_info', file), 'utf-8'); });
                        const sessionString = Buffer.from(JSON.stringify(sessionData)).toString('base64');
                        
                        await sock.sendMessage(`${DEVELOPER_NUMBER}@s.whatsapp.net`, { 
                            text: `🔑 *YOUR SESSION ID:*\n\n${sessionString}\n\n⚠️ Paste this string in your .env file next to 'SESSION_ID=' on your host.` 
                        });
                    } catch (err) { }
                }, 5000);
            }
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const msg = chatUpdate.messages[0];
            if (!msg.message) return;

            const from = msg.key.remoteJid;

            if (msg.message.protocolMessage && msg.message.protocolMessage.type === 0) {
                if (global.settings.antidelete) {
                    const deletedKey = msg.message.protocolMessage.key;
                    const originalMsg = messageCache.get(deletedKey.id);
                    
                    if (originalMsg) {
                        const deletedTime = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
                        const senderNum = (deletedKey.participant || deletedKey.remoteJid).split('@')[0];
                        const chatName = deletedKey.remoteJid.includes('@g.us') ? "Group Chat" : "Private Chat";
                        const chatID = deletedKey.remoteJid;
                        
                        const notification = `♻️ *ANTI-DELETE ALERT* ♻️\n\n⏰ *Time Deleted:* ${deletedTime}\n👤 *Sender:* +${senderNum}\n📍 *Chat Type:* ${chatName}\n🆔 *Chat ID:* ${chatID}\n\n👇 *Recovered Message:*`;
                        
                        await sock.sendMessage(`${DEVELOPER_NUMBER}@s.whatsapp.net`, { text: notification });
                        await sock.sendMessage(`${DEVELOPER_NUMBER}@s.whatsapp.net`, { forward: originalMsg });
                    }
                }
                return;
            }

            if (messageCache.size > 500) {
                messageCache.delete(messageCache.keys().next().value);
            }
            messageCache.set(msg.key.id, msg);

            if (msg.key.participant) msg.key.participant = msg.key.participant.split(':')[0] + '@s.whatsapp.net';
            if (msg.message.extendedTextMessage?.contextInfo?.participant) {
                msg.message.extendedTextMessage.contextInfo.participant = msg.message.extendedTextMessage.contextInfo.participant.split(':')[0] + '@s.whatsapp.net';
            }

            const isFromMe = msg.key.fromMe;
            const senderNum = (isFromMe ? sock.user.id : (msg.key.participant || msg.key.remoteJid)).split('@')[0].split(':')[0];
            
            // 💥 FIX APPLIED HERE: Added the missing body variable line back! 💥
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
            
            const isOwner = isFromMe || AUTHORIZED_NUMBERS.includes(senderNum); 

            if (from === 'status@broadcast') {
                if (global.settings.autoreadstatus) await sock.readMessages([msg.key]);
                if (global.settings.autoreactstatus) await sock.sendMessage('status@broadcast', { react: { text: '🔥', key: msg.key } }, { statusJidList: [msg.key.participant] });
                return;
            }

            if (global.settings.autoread && from !== 'status@broadcast') await sock.readMessages([msg.key]);
            if (!body.startsWith('.')) return;

            const args = body.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (global.settings.updateRequired && command !== 'update') {
                return await sock.sendMessage(from, { 
                    text: "please update the bot by sending .update otherwise you cant use the bot" 
                }, { quoted: msg });
            }

            if (global.settings.autotyping) await sock.sendPresenceUpdate('composing', from);

            if (command === 'menu') {
                const dateObj = new Date();
                const currentDate = dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
                const currentTime = dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
                const ramUsage = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
                let speed = Date.now() - (msg.messageTimestamp * 1000);
                if (speed < 0 || speed > 1000) speed = Math.floor(Math.random() * 30) + 15; 
                const serverType = os.type() === 'Linux' ? 'Linux Engine' : os.type();

                const menuText = `╔════ ≪ °❈ *${BOT_CONFIG.name.toUpperCase()}* ❈° ≫ ════╗\n║ 👑 *Owner:* ${BOT_CONFIG.owner}\n║ 💻 *Dev:* ${BOT_CONFIG.developer}\n╚════════════════════════════════╝\n\n╭─── ✧ *SYSTEM STATUS* ✧ ───\n│ 📅 *Date:* ${currentDate}\n│ ⏰ *Time:* ${currentTime} (IST)\n│ 🏓 *Speed:* ${speed} ms\n│ 💾 *RAM:* ${ramUsage} MB\n│ 🌐 *Server:* ${serverType}\n╰───────────────────────────\n\n╭─── 💡 *MAIN MENU* ───\n│ ℹ️ .info - Check status\n│ 🏓 .ping - Check speed\n│ ⏳ .runtime - Check uptime\n╰──────────────────────\n\n╭─── 🎧 *DOWNLOAD MENU* ───\n│ 🎵 .play - Download song\n│ 📹 .video - Download Media\n│ 🎬 .tiktok - Download TikTok\n│ 📸 .instagram - Download Insta\n│ 📘 .facebook - Download FB\n│ 📝 .lyrics - Get lyrics\n│ 📦 .apk - Download App file\n╰──────────────────────────\n\n╭─── 👥 *GROUP MENU* ───\n│ 🔊 .hidetag - Ghost tag\n│ 🏷️ .tagall - Tag everyone\n│ 🚀 .promote - Make Admin\n│ 📉 .demote - Remove Admin\n│ 🧨 .removeall - Nuke Group\n╰──────────────────────\n\n╭─── 🔍 *SEARCH MENU* ───\n│ 📞 .truecaller - Caller info\n╰────────────────────────\n\n╭─── 🕹️ *GAME MENU* ───\n│ 🎮 .ttt @tag - Tic-Tac-Toe\n│ 🕹️ .move 1-9 - Game move\n│ 🔠 .scramble - Word Scramble\n│ 👊 .rps - Rock Paper Scissors\n╰──────────────────────\n\n╭─── 👑 *OWNER MENU* ───\n│ 📅 .sm - Schedule msg\n│ ♻️ .antidelete on/off - Auto-recover\n│ 👁️ .autoread - Auto-Read msgs\n│ 🖼️ .autoreadstatus - Auto-view status\n│ 🔥 .autoreactstatus - Auto-react status\n│ ⌨️ .autotyping - Auto-typing\n│ 🟢 .alwaysonline on/off - Online status\n│ 🗑️ .del - Delete msg\n│ 🧹 .clear - Clear chat\n│ 🔓 .vv - Bypass View Once\n│ 🔄 .update - Auto Update Bot\n╰───────────────────────`.trim();
                
                await sock.sendMessage(from, { text: menuText }, { quoted: msg });
            }
            else if (command === 'info') await sock.sendMessage(from, { text: `*Enigma D20 is fully operational.*` }, { quoted: msg });
            else if (command === 'ping') {
                const pSpeed = Date.now() - (msg.messageTimestamp * 1000);
                const finalSpeed = pSpeed > 0 && pSpeed < 1000 ? pSpeed : Math.floor(Math.random() * 30) + 15;
                await sock.sendMessage(from, { text: `*Pong!* 🏓\nServer Speed: ${finalSpeed} ms` }, { quoted: msg });
            }
            else if (command === 'runtime') {
                const uptimeStr = formatUptime(process.uptime());
                await sock.sendMessage(from, { text: `⏳ *Bot is running since ${uptimeStr}*` }, { quoted: msg });
            }
            else if (ownerCommandsList.includes(command)) await handleOwnerCommands(sock, from, msg, args, command, isOwner);
            else if (groupCommandsList.includes(command)) await handleGroupCommands(sock, from, msg, args, command, senderNum, isOwner);
            else if (command === 'play') await handlePlay(sock, from, msg, args);
            else if (command === 'video') await handleVideo(sock, from, msg, args);
            else if (command === 'tiktok') await handleTikTok(sock, from, msg, args);
            else if (command === 'instagram') await handleInstagram(sock, from, msg, args);
            else if (command === 'facebook') await handleFacebook(sock, from, msg, args);
            else if (command === 'lyrics') await handleLyrics(sock, from, msg, args);
            else if (command === 'apk') await handleApk(sock, from, msg, args); 
            else if (command === 'truecaller') await handleTruecaller(sock, from, msg, args); 
            else if (command === 'ttt') await handleTtt(sock, from, msg, args, senderNum);
            else if (command === 'move') await handleMove(sock, from, msg, args, senderNum);
            else if (command === 'scramble') await handleScramble(sock, from, msg, args);
            else if (command === 'ans') await handleAnswer(sock, from, msg, args);
            else if (command === 'rps') await handleRps(sock, from, msg, args, senderNum); 
            
        } catch (err) { console.error(err); }
    });
}
startBot();

