const { exec } = require('child_process');
const fs = require('fs');

async function handleOwnerCommands(sock, from, msg, args, command, isOwner) {
    
    // 1. Ownership Check
    if (!isOwner) {
        return await sock.sendMessage(from, { text: "❌ Only the Owner can use this command!" }, { quoted: msg });
    }

    // 2. The Smart Auto-Update Logic
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

    // 3. System Settings Toggles (FIXED: Added immediate presence update)
    const toggles = ['autoread', 'autoreadstatus', 'autoreactstatus', 'autotyping', 'alwaysonline'];
    if (toggles.includes(command)) {
        const state = args[0]?.toLowerCase() === 'on';
        global.settings[command] = state;
        
        // FIX: If alwaysonline is toggled, apply it to WhatsApp immediately
        if (command === 'alwaysonline') {
            await sock.sendPresenceUpdate(state ? 'available' : 'unavailable');
        }
        
        await sock.sendMessage(from, { text: `✅ Setting *${command}* has been turned ${state ? 'ON' : 'OFF'}.` }, { quoted: msg });
        return;
    }

    // 4. Delete Bot's Message (.del)
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

