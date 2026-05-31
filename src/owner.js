const { exec } = require('child_process');

async function handleOwnerCommands(sock, from, msg, args, command, isOwner) {
    
    if (!isOwner) {
        return await sock.sendMessage(from, { text: "❌ Only the Owner can use this command!" }, { quoted: msg });
    }

    if (command === 'update') {
        await sock.sendMessage(from, { text: "🔄 Fetching the latest code from GitHub..." }, { quoted: msg });
        
        exec('git pull origin main', async (err, stdout, stderr) => {
            if (err) {
                return await sock.sendMessage(from, { text: `❌ Update Failed:\n\n${err.message}` }, { quoted: msg });
            }
            if (stdout.includes('Already up to date.')) {
                return await sock.sendMessage(from, { text: "✅ The bot is already on the latest version!" }, { quoted: msg });
            }
            
            await sock.sendMessage(from, { text: `✅ Update Successful!\n\n${stdout}\n\n⚠️ Restarting the bot to apply the new code...` }, { quoted: msg });
            
            setTimeout(() => {
                process.exit(1); 
            }, 2000);
        });
        return;
    }

    const toggles = ['autoread', 'autoreadstatus', 'autoreactstatus', 'autotyping', 'alwaysonline'];
    if (toggles.includes(command)) {
        const state = args[0]?.toLowerCase() === 'on';
        global.settings[command] = state;
        await sock.sendMessage(from, { text: `✅ Setting *${command}* has been turned ${state ? 'ON' : 'OFF'}.` }, { quoted: msg });
        return;
    }

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

