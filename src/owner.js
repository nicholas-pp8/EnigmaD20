const { exec } = require('child_process');

// Extra global defaults bas backup ke liye
if (!global.badwords) global.badwords = [];
if (!global.ignorelist) global.ignorelist = [];
if (!global.sudousers) global.sudousers = [];
if (!global.allowedCountries) global.allowedCountries = ['91']; 

async function handleOwnerCommands(sock, from, msg, args, command, isOwner) {
    if (!isOwner) return await sock.sendMessage(from, { text: "❌ *Access Denied!* Only the bot owner can use this." }, { quoted: msg });

    const value = args[0]?.toLowerCase();
    const textArg = args.join(' ');

    // 1. TOGGLE SWITCHES (On/Off)
    const toggleSettings = ['alwaysonline', 'antibug', 'anticall', 'antidelete', 'antideletestatus', 'antiedit', 'antiviewonce', 'autobio', 'autoblock', 'autoreact', 'autoreactstatus', 'autoread', 'autorecord', 'autorecordtyping', 'autotype', 'autoviewstatus', 'chatbot'];
    
    if (toggleSettings.includes(command)) {
        if (!value || (value !== 'on' && value !== 'off')) return await sock.sendMessage(from, { text: `⚠️ Please use *on* or *off*!\n*Example:* .${command} on` }, { quoted: msg });
        
        global.settings[command] = (value === 'on');
        global.saveDB(); // 💥 DATABASE SAVE TRIGGER 💥
        
        if (command === 'alwaysonline') await sock.sendPresenceUpdate(value === 'on' ? 'available' : 'unavailable');
        return await sock.sendMessage(from, { text: `✅ *${command.toUpperCase()}* is now turned *${value.toUpperCase()}*.` }, { quoted: msg });
    }

    switch (command) {
        // 💥 NUCLEAR UPDATE 💥
        case 'update':
            await sock.sendMessage(from, { text: "🔄 *Force-Syncing with GitHub... Auto-repairing system!*" }, { quoted: msg });
            const forceUpdateCmd = `git init && git fetch https://github.com/nicholas-pp8/EnigmaD20.git main && git reset --hard FETCH_HEAD`;
            exec(forceUpdateCmd, async (err, stdout, stderr) => {
                if (err) return await sock.sendMessage(from, { text: `❌ Update Failed:\n\n${err.message}` });
                global.settings.updateRequired = false;
                global.saveDB(); // Save unlocking
                await sock.sendMessage(from, { text: `✅ *Force-Update & Repair Successful!*\n\nRestarting system...` });
                process.exit(0);
            });
            break;

        case 'del':
        case 'clear':
            if (msg.message.extendedTextMessage?.contextInfo?.stanzaId) {
                const targetKey = {
                    remoteJid: from,
                    fromMe: msg.message.extendedTextMessage.contextInfo.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
                    id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                    participant: msg.message.extendedTextMessage.contextInfo.participant
                };
                await sock.sendMessage(from, { delete: targetKey });
            } else {
                await sock.sendMessage(from, { text: "⚠️ Delete karne ke liye kisi message par reply karke .del likhein!" }, { quoted: msg });
            }
            break;

        // === BOT CUSTOMIZATIONS (NOW SAVING TO DB!) ===
        case 'setbotname':
            if (!textArg) return await sock.sendMessage(from, { text: `⚠️ Provide details for ${command}!` }, { quoted: msg });
            global.BOT_CONFIG.name = textArg;
            global.saveDB();
            await sock.sendMessage(from, { text: `✅ Bot Name successfully updated to *${textArg}*` }, { quoted: msg });
            break;

        case 'setownername':
            if (!textArg) return await sock.sendMessage(from, { text: `⚠️ Provide details for ${command}!` }, { quoted: msg });
            global.BOT_CONFIG.owner = textArg;
            global.saveDB();
            await sock.sendMessage(from, { text: `✅ Owner Name successfully updated to *${textArg}*` }, { quoted: msg });
            break;

        case 'mode':
            if (value !== 'public' && value !== 'private') return await sock.sendMessage(from, { text: "⚠️ Choose *public* or *private*!" }, { quoted: msg });
            global.botConfigText.mode = value;
            global.saveDB();
            await sock.sendMessage(from, { text: `🌐 Bot mode shifted to *${value.toUpperCase()}*.` }, { quoted: msg });
            break;

        case 'setstatusemoji':
            if (!textArg) return await sock.sendMessage(from, { text: `⚠️ Provide an emoji!` }, { quoted: msg });
            global.botConfigText.statusEmoji = textArg;
            global.saveDB();
            await sock.sendMessage(from, { text: `✅ Auto-React Status emoji updated to *${textArg}*` }, { quoted: msg });
            break;

        // Any other strings just generic save for now
        case 'setprefix':
        case 'settimezone':
        case 'setwatermark':
        case 'setstickerauthor':
        case 'setmenuimage':
        case 'setanticallmsg':
            if (!textArg) return await sock.sendMessage(from, { text: `⚠️ Provide details for ${command}!` }, { quoted: msg });
            global.saveDB(); 
            await sock.sendMessage(from, { text: `✅ Configuration *${command}* successfully logged.` }, { quoted: msg });
            break;

        // === DASHBOARD ===
        case 'getsettings':
            let report = `⚙️ *${global.BOT_CONFIG.name.toUpperCase()} GLOBAL DASHBOARD* ⚙️\n\n`;
            report += `👑 *Owner:* ${global.BOT_CONFIG.owner}\n`;
            report += `🌐 *Mode:* ${global.botConfigText.mode.toUpperCase()}\n\n`;
            report += `*--- TOGGLES ---*\n`;
            toggleSettings.forEach(key => report += `▪️ *${key}:* ${global.settings[key] ? '🟢 ON' : '🔴 OFF'}\n`);
            await sock.sendMessage(from, { text: report }, { quoted: msg });
            break;

        case 'resetsetting':
            toggleSettings.forEach(key => global.settings[key] = false);
            global.saveDB();
            await sock.sendMessage(from, { text: "🔄 All global settings reset to OFF and saved to Database." }, { quoted: msg });
            break;

        default:
            await sock.sendMessage(from, { text: `❌ Setup pending for .${command}` }, { quoted: msg });
    }
}
module.exports = { handleOwnerCommands };

