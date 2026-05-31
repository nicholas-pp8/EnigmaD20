const { exec } = require('child_process');
const fs = require('fs');

async function handleOwnerCommands(sock, from, msg, args, command, isOwner) {
    
    // 1. Ownership Check
    if (!isOwner) {
        return await sock.sendMessage(from, { text: "❌ Only the Owner can use this command!" }, { quoted: msg });
    }

    // 2. Schedule Message (.sm) - UPDATED TO 12-HOUR & DD/MM/YYYY FORMAT
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
                text: "❌ *Invalid Format!*\nPlease check your date or time format.\n\nExample: .sm 916290371061 01/06/2026 02:30 PM Hello!" 
            }, { quoted: msg });
        }

        // Parsing Date (DD/MM/YYYY)
        let [day, month, year] = datePart.split('/');
        day = day.padStart(2, '0');
        month = month.padStart(2, '0');

        // Parsing Time (12-hour to 24-hour conversion)
        let [hour, minute] = timePart.split(':');
        hour = parseInt(hour, 10);
        minute = minute.padStart(2, '0');

        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        const hourStr = hour.toString().padStart(2, '0');
        
        // Locking strictly to IST (+05:30)
        const targetDateStr = `${year}-${month}-${day}T${hourStr}:${minute}:00+05:30`;
        const targetTimeMs = new Date(targetDateStr).getTime();
        const currentTimeMs = Date.now();

        if (isNaN(targetTimeMs)) {
            return await sock.sendMessage(from, { 
                text: "❌ *Invalid date or time!* Make sure you use a valid calendar date." 
            }, { quoted: msg });
        }

        const delay = targetTimeMs - currentTimeMs;

        if (delay <= 0) {
            return await sock.sendMessage(from, { 
                text: "❌ You cannot schedule a message for the past! Please provide a future time." 
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { 
            text: `✅ *Message Scheduled Successfully!*\n\n📅 *Date:* ${datePart}\n⏰ *Time:* ${timePart} ${ampm} (IST)\n👤 *To:* ${targetNumber}\n💬 *Message:* ${messageBody}\n\n_(⚠️ Note: If the bot restarts or goes offline before this time, the scheduled message will be lost.)_` 
        }, { quoted: msg });

        setTimeout(async () => {
            try {
                await sock.sendMessage(targetJid, { text: messageBody });
                await sock.sendMessage(from, { text: `✅ Your scheduled message to ${targetNumber} was just delivered successfully!` });
            } catch (err) {
                console.error("Failed to send scheduled message:", err);
            }
        }, delay);
        return;
    }

    // 3. The Smart Auto-Update Logic
    if (command === 'update') {
        await sock.sendMessage(from, { text: "🔄 System checking Git repository..." }, { quoted: msg });
        
        const repoUrl = "https://github.com/nicholas-pp8/EnigmaD20.git";
        
        if (!fs.existsSync('.git')) {
            await sock.sendMessage(from, { text: "⚙️ Git missing on server. Running automatic system repair..." }, { quoted: msg });
            
            const initScript = `git init && git remote add origin ${repoUrl} && git branch -M main && git fetch --all && git reset --hard origin/main`;
            
            exec(initScript, async (err, stdout, stderr) => {
                if (err) {
                    return await sock.sendMessage(from, { text: `❌ Auto-Repair Failed:\n\n${err.message}` }, { quoted: msg });
                }
                await sock.sendMessage(from, { text: "✅ Git repository successfully repaired!\n\n⚠️ Restarting bot to sync all fresh files..." }, { quoted: msg });
                setTimeout(() => { process.exit(1); }, 2000);
            });
        } else {
            exec(`git remote set-url origin ${repoUrl} && git pull origin main`, async (err, stdout, stderr) => {
                if (err) {
                    return await sock.sendMessage(from, { text: `❌ Update Failed:\n\n${err.message}` }, { quoted: msg });
                }
                if (stdout.includes('Already up to date.')) {
                    return await sock.sendMessage(from, { text: "✅ The bot is already on the latest version!" }, { quoted: msg });
                }
                
                await sock.sendMessage(from, { text: `✅ Update Successful!\n\n${stdout}\n\n⚠️ Restarting to apply changes...` }, { quoted: msg });
                setTimeout(() => { process.exit(1); }, 2000);
            });
        }
        return;
    }

    // 4. System Settings Toggles
    const toggles = ['autoread', 'autoreadstatus', 'autoreactstatus', 'autotyping', 'alwaysonline'];
    if (toggles.includes(command)) {
        const state = args[0]?.toLowerCase() === 'on';
        global.settings[command] = state;
        
        if (command === 'alwaysonline') {
            await sock.sendPresenceUpdate(state ? 'available' : 'unavailable');
        }
        
        await sock.sendMessage(from, { text: `✅ Setting *${command}* has been turned ${state ? 'ON' : 'OFF'}.` }, { quoted: msg });
        return;
    }

    // 5. Delete Bot's Message (.del)
    if (command === 'del' || command === 'delete') {
        if (!msg.message.extendedTextMessage?.contextInfo?.stanzaId) {
            return await sock.sendMessage(from, { text: "⚠️ Reply to a message sent by the bot to delete it." }, { quoted: msg });
        }
        const key = {
            remoteJid: from,
            fromMe: true,
            id: msg.message.extendedTextMessage.contextInfo.stanzaId
        };
        await sock.sendMessage(from, { delete: key });
        return;
    }
}

module.exports = { handleOwnerCommands };

