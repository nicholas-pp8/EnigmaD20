const { exec } = require('child_process');

async function handleOwnerCommands(sock, from, msg, args, command, isOwner) {
    if (!isOwner) return;

    // Helper function taaki baar-baar same code na likhna pade
    const toggleSetting = async (settingName, trueMsg, falseMsg) => {
        const state = args[0]?.toLowerCase();
        if (state === 'on') {
            global.settings[settingName] = true;
            await sock.sendMessage(from, { text: trueMsg }, { quoted: msg });
        } else if (state === 'off') {
            global.settings[settingName] = false;
            await sock.sendMessage(from, { text: falseMsg }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: `⚠️ Sahi format: .${command} on/off\nCurrent Status: *${global.settings[settingName] ? 'ON 🟢' : 'OFF 🔴'}*` }, { quoted: msg });
        }
    };

    switch (command) {
        case 'autoread':
            await toggleSetting('autoread', '👁️ Autoread is now ON.', '👁️ Autoread is now OFF.');
            break;
        case 'autoreadstatus':
            await toggleSetting('autoreadstatus', '🖼️ Auto-Read Status is now ON.', '🖼️ Auto-Read Status is now OFF.');
            break;
        case 'autoreactstatus':
            await toggleSetting('autoreactstatus', '🔥 Auto-React Status is now ON.', '🔥 Auto-React Status is now OFF.');
            break;
        case 'autotyping':
            await toggleSetting('autotyping', '⌨️ Auto-Typing is now ON.', '⌨️ Auto-Typing is now OFF.');
            break;

        // 👉 YAHAN NAYA ALWAYS ONLINE LOGIC ADD KIYA HAI
        case 'alwaysonline':
            const state = args[0]?.toLowerCase();
            if (state === 'on') {
                global.settings.alwaysonline = true;
                await sock.sendPresenceUpdate('available'); // WhatsApp server ko "Online" bhejo
                await sock.sendMessage(from, { text: "🟢 *Always Online* is now *ON*.\n(Bot sabko 24/7 online dikhega)" }, { quoted: msg });
            } else if (state === 'off') {
                global.settings.alwaysonline = false;
                await sock.sendPresenceUpdate('unavailable'); // WhatsApp server ko "Offline" bhejo
                await sock.sendMessage(from, { text: "🔴 *Always Online* is now *OFF*.\n(Bot dusron ko offline dikhega)" }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { text: `⚠️ Sahi format: .alwaysonline on/off\nCurrent Status: *${global.settings.alwaysonline ? 'ON 🟢' : 'OFF 🔴'}*` }, { quoted: msg });
            }
            break;

        case 'del':
        case 'deletechat':
            if (msg.message.extendedTextMessage?.contextInfo?.stanzaId) {
                const key = {
                    remoteJid: from,
                    fromMe: msg.message.extendedTextMessage.contextInfo.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
                    id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                    participant: msg.message.extendedTextMessage.contextInfo.participant
                };
                await sock.sendMessage(from, { delete: key });
            } else {
                await sock.sendMessage(from, { text: "⚠️ Kisi message ko reply karke .del likho!" });
            }
            break;

        case 'clear':
        case 'deletefullchat':
            await sock.chatModify({ delete: true, lastMessages: [{ key: msg.key, messageTimestamp: msg.messageTimestamp }] }, from);
            await sock.sendMessage(from, { text: "🧹 Chat cleared!" });
            break;

        case 'update':
            await sock.sendMessage(from, { text: "🔄 GitHub se naye updates check kar raha hu..." });
            exec('git pull origin main', async (err, stdout, stderr) => {
                if (err) {
                    await sock.sendMessage(from, { text: `❌ Update Failed:\n\n${stderr}` });
                } else {
                    await sock.sendMessage(from, { text: `✅ Update Success:\n\n${stdout}\n\nRestarting bot...` });
                    process.exit(1);
                }
            });
            break;
            
        default:
            break;
    }
}

module.exports = { handleOwnerCommands };

