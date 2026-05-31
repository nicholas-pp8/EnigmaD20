const { exec } = require('child_process');
const fs = require('fs');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

async function handleOwnerCommands(sock, from, msg, args, command, isOwner) {
    
    // 1. Ownership Check
    if (!isOwner) {
        return await sock.sendMessage(from, { text: "❌ Only the Owner can use this command!" }, { quoted: msg });
    }

    // 2. Schedule Message (.sm)
    if (command === 'sm' || command === 'schedule') {
        if (args.length < 5) {
            return await sock.sendMessage(from, { 
                text: "⚠️ *Syntax Error!*\n\nUse format:\n*.sm <number> <DD/MM/YYYY> <hh:mm> <AM/PM> <message>*\n\nExample:\n.sm 916290371061 01/06/2026 02:30 PM Hello bhai!" 
            }, { quoted: msg });
        }

        const targetNumber = args[0];
        const datePart = args[1]; 
        const timePart = args[2]; 
        const ampm = args[3].toUpperCase();
        const messageBody = args.slice(4).join(' ');

        const targetJid = targetNumber.includes('@s.whatsapp.net') ? targetNumber : `${targetNumber}@s.whatsapp.net`;

        if (!datePart.includes('/') || !timePart.includes(':') || !['AM', 'PM'].includes(ampm)) {
            return await sock.sendMessage(from, { 
                text: "❌ *Invalid Format!*\nPlease check your date or time format." 
            }, { quoted: msg });
        }

        let [day, month, year] = datePart.split('/');
        day = day.padStart(2, '0');
        month = month.padStart(2, '0');

        let [hour, minute] = timePart.split(':');
        hour = parseInt(hour, 10);
        minute = minute.padStart(2, '0');

        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        const hourStr = hour.toString().padStart(2, '0');
        const targetDateStr = `${year}-${month}-${day}T${hourStr}:${minute}:00+05:30`;
        const targetTimeMs = new Date(targetDateStr).getTime();
        const currentTimeMs = Date.now();

        if (isNaN(targetTimeMs)) {
            return await sock.sendMessage(from, { text: "❌ *Invalid date or time!*" }, { quoted: msg });
        }

        const delay = targetTimeMs - currentTimeMs;

        if (delay <= 0) {
            return await sock.sendMessage(from, { text: "❌ You cannot schedule a message for the past!" }, { quoted: msg });
        }

        await sock.sendMessage(from, { 
            text: `✅ *Message Scheduled Successfully!*\n\n📅 *Date:* ${datePart}\n⏰ *Time:* ${timePart} ${ampm}\n👤 *To:* ${targetNumber}\n💬 *Message:* ${messageBody}` 
        }, { quoted: msg });

        setTimeout(async () => {
            try {
                await sock.sendMessage(targetJid, { text: messageBody });
                await sock.sendMessage(from, { text: `✅ Your scheduled message to ${targetNumber} was delivered!` });
            } catch (err) {
                console.error("Scheduled msg error:", err);
            }
        }, delay);
        return;
    }

    // 3. 💥 UNIVERSAL VIEW ONCE BYPASS (.vv) 💥
    if (command === 'vv') {
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted) {
            return await sock.sendMessage(from, { text: "⚠️ Please *reply* to a View Once message with .vv to bypass it!" }, { quoted: msg });
        }

        let mediaType = null;
        let mediaContent = null;

        // Condition 1: Check for old direct flag structure
        if (quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce) {
            mediaType = Object.keys(quoted).find(k => ['imageMessage', 'videoMessage', 'audioMessage'].includes(k));
            mediaContent = quoted[mediaType];
        } 
        // Condition 2: Check for nested ViewOnce structures
        else {
            const vOnce = quoted.viewOnceMessage || quoted.viewOnceMessageV2 || quoted.viewOnceMessageV2Extension;
            if (vOnce) {
                // Sometimes Baileys nests it under .message, sometimes directly
                const msgObj = vOnce.message || vOnce; 
                mediaType = Object.keys(msgObj).find(k => ['imageMessage', 'videoMessage', 'audioMessage'].includes(k));
                if (mediaType) {
                    mediaContent = msgObj[mediaType];
                }
            }
        }

        if (!mediaContent || !mediaType) {
            return await sock.sendMessage(from, { text: "❌ The message you replied to is NOT a View Once message!" }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: "🔓 *Decrypting View Once Message...*" }, { quoted: msg });

        try {
            const stream = await downloadContentFromMessage(mediaContent, mediaType.replace('Message', ''));
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const captionText = `🔓 *View Once Bypassed*\n\n` + (mediaContent.caption ? `💬 *Caption:* ${mediaContent.caption}` : '');

            if (mediaType === 'imageMessage') {
                await sock.sendMessage(from, { image: buffer, caption: captionText }, { quoted: msg });
            } else if (mediaType === 'videoMessage') {
                await sock.sendMessage(from, { video: buffer, caption: captionText, mimetype: 'video/mp4' }, { quoted: msg });
            } else if (mediaType === 'audioMessage') {
                await sock.sendMessage(from, { audio: buffer, mimetype: 'audio/mp4', ptt: false }, { quoted: msg });
            }
            return;
        } catch (err) {
            console.error("View Once Bypass Error:", err);
            return await sock.sendMessage(from, { text: "❌ Failed to download the View Once media." }, { quoted: msg });
        }
    }

    // 4. BULLETPROOF AUTO-UPDATE
    if (command === 'update') {
        await sock.sendMessage(from, { text: "🔄 System checking Git repository...\n⚠️ Using Force-Sync to ignore conflicts." }, { quoted: msg });
        
        const repoUrl = "https://github.com/nicholas-pp8/EnigmaD20.git";
        
        if (!fs.existsSync('.git')) {
            await sock.sendMessage(from, { text: "⚙️ Git missing on server. Running automatic system repair..." }, { quoted: msg });
            const initScript = `git init && git remote add origin ${repoUrl} && git branch -M main && git fetch --all && git reset --hard origin/main`;
            exec(initScript, async (err, stdout, stderr) => {
                if (err) return await sock.sendMessage(from, { text: `❌ Auto-Repair Failed:\n\n${err.message}` }, { quoted: msg });
                await sock.sendMessage(from, { text: "✅ Git repository successfully repaired!\n\n⚠️ Restarting bot..." }, { quoted: msg });
                setTimeout(() => { process.exit(1); }, 2000);
            });
        } else {
            const forcePullScript = `git remote set-url origin ${repoUrl} && git clean -fd && git reset --hard HEAD && git pull origin main`;
            exec(forcePullScript, async (err, stdout, stderr) => {
                if (err) return await sock.sendMessage(from, { text: `❌ Update Failed:\n\n${err.message}` }, { quoted: msg });
                if (stdout.includes('Already up to date.')) return await sock.sendMessage(from, { text: "✅ The bot is already on the latest version!" }, { quoted: msg });
                await sock.sendMessage(from, { text: `✅ Force Update Successful!\n\n${stdout}\n\n⚠️ Restarting...` }, { quoted: msg });
                setTimeout(() => { process.exit(1); }, 2000);
            });
        }
        return;
    }

    // 5. System Settings Toggles 
    const toggles = ['autoread', 'autoreadstatus', 'autoreactstatus', 'autotyping', 'alwaysonline', 'antidelete'];
    if (toggles.includes(command)) {
        const state = args[0]?.toLowerCase() === 'on';
        global.settings[command] = state;
        
        if (command === 'alwaysonline') {
            await sock.sendPresenceUpdate(state ? 'available' : 'unavailable');
        }
        await sock.sendMessage(from, { text: `✅ Setting *${command}* has been turned ${state ? 'ON' : 'OFF'}.` }, { quoted: msg });
        return;
    }

    // 6. Delete Bot's Message (.del)
    if (command === 'del' || command === 'delete') {
        if (!msg.message.extendedTextMessage?.contextInfo?.stanzaId) {
            return await sock.sendMessage(from, { text: "⚠️ Reply to a message sent by the bot to delete it." }, { quoted: msg });
        }
        const key = { remoteJid: from, fromMe: true, id: msg.message.extendedTextMessage.contextInfo.stanzaId };
        await sock.sendMessage(from, { delete: key });
        return;
    }
}

module.exports = { handleOwnerCommands };

