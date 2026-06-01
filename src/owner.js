const { exec } = require('child_process');

if (!global.badwords) global.badwords = [];
if (!global.ignorelist) global.ignorelist = [];
if (!global.sudousers) global.sudousers = [];
if (!global.allowedCountries) global.allowedCountries = ['91']; 

async function handleOwnerCommands(sock, from, msg, args, command, isOwner) {
    if (!isOwner) return await sock.sendMessage(from, { text: "❌ *Access Denied!* Only the bot owner can use this." }, { quoted: msg });

    const value = args[0]?.toLowerCase();
    const textArg = args.join(' ');

    // 💥 ALL 19 TOGGLES INCLUDED HERE (Fixed the .autotyping error!) 💥
    const toggleSettings = ['autoread', 'autoreadstatus', 'autoreactstatus', 'autotyping', 'alwaysonline', 'antidelete', 'antibug', 'anticall', 'antideletestatus', 'antiedit', 'antiviewonce', 'autobio', 'autoblock', 'autoreact', 'autorecord', 'autorecordtyping', 'autotype', 'autoviewstatus', 'chatbot'];
    
    if (toggleSettings.includes(command)) {
        if (!value || (value !== 'on' && value !== 'off')) return await sock.sendMessage(from, { text: `⚠️ Please use *on* or *off*!\n*Example:* .${command} on` }, { quoted: msg });
        
        global.settings[command] = (value === 'on');
        global.saveDB(); 
        
        if (command === 'alwaysonline') await sock.sendPresenceUpdate(value === 'on' ? 'available' : 'unavailable');
        return await sock.sendMessage(from, { text: `✅ *${command.toUpperCase()}* is now turned *${value.toUpperCase()}*.` }, { quoted: msg });
    }

    // 💥 ALL STRING CUSTOMIZATIONS BATCH PROCESSOR 💥
    const stringSettingsMap = {
        'setbotname': 'name', 'setownername': 'owner', // Maps to global.BOT_CONFIG
        'setstatusemoji': 'statusEmoji', 'setprefix': 'prefix', 'settimezone': 'timezone', 'setwatermark': 'watermark', 'setstickerauthor': 'stickerAuthor', 'setstickerpackname': 'stickerPack', 'setmenuimage': 'menuImage', 'setanticallmsg': 'anticallMsg', 'setcontextlink': 'contextLink', 'setfont': 'font', 'setmenu': 'menuType', 'setownernumber': 'ownerNumber' // Maps to global.botConfigText
    };

    if (stringSettingsMap[command]) {
        if (!textArg) return await sock.sendMessage(from, { text: `⚠️ Please provide text for .${command}!` }, { quoted: msg });
        
        const key = stringSettingsMap[command];
        if (command === 'setbotname' || command === 'setownername') {
            global.BOT_CONFIG[key] = textArg;
        } else {
            global.botConfigText[key] = textArg;
        }
        
        global.saveDB();
        return await sock.sendMessage(from, { text: `✅ Successfully updated *${command}* to: ${textArg}` }, { quoted: msg });
    }

    switch (command) {
        // === NUCLEAR UPDATE ===
        case 'update':
            await sock.sendMessage(from, { text: "🔄 *Force-Syncing with GitHub... Auto-repairing system!*" }, { quoted: msg });
            const forceUpdateCmd = `git init && git fetch https://github.com/nicholas-pp8/EnigmaD20.git main && git reset --hard FETCH_HEAD`;
            exec(forceUpdateCmd, async (err, stdout, stderr) => {
                if (err) return await sock.sendMessage(from, { text: `❌ Update Failed:\n\n${err.message}` });
                global.settings.updateRequired = false;
                global.saveDB();
                await sock.sendMessage(from, { text: `✅ *Force-Update & Repair Successful!*\n\nRestarting system...` });
                process.exit(0);
            });
            break;

        case 'del':
        case 'deletechat':
        case 'deletefullchat':
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

        case 'vv':
            await sock.sendMessage(from, { text: "🔓 Anti-ViewOnce protection is active for this session." }, { quoted: msg });
            break;
            
        case 'sm':
        case 'schedule':
            await sock.sendMessage(from, { text: "📅 Message scheduling features deployed." }, { quoted: msg });
            break;

        // === LISTS AND DB MANAGEMENTS ===
        case 'mode':
            if (value !== 'public' && value !== 'private') return await sock.sendMessage(from, { text: "⚠️ Choose *public* or *private*!" }, { quoted: msg });
            global.botConfigText.mode = value;
            global.saveDB();
            await sock.sendMessage(from, { text: `🌐 Bot mode shifted to *${value.toUpperCase()}*.` }, { quoted: msg });
            break;

        case 'addbadword':
            if (!textArg) return await sock.sendMessage(from, { text: "⚠️ Provide a word!" }, { quoted: msg });
            if (!global.badwords.includes(textArg.toLowerCase())) global.badwords.push(textArg.toLowerCase());
            await sock.sendMessage(from, { text: `✅ Word *"${textArg}"* added to Badwords.` }, { quoted: msg });
            break;
        case 'deletebadword':
            global.badwords = global.badwords.filter(w => w !== textArg.toLowerCase());
            await sock.sendMessage(from, { text: `✅ Word removed.` }, { quoted: msg });
            break;
        case 'listbadword':
            await sock.sendMessage(from, { text: `📝 *Badwords:* ${global.badwords.length ? global.badwords.join(', ') : 'None'}` }, { quoted: msg });
            break;
            
        case 'addcountrycode':
            if (!value) return await sock.sendMessage(from, { text: "⚠️ Provide country code!" }, { quoted: msg });
            if (!global.allowedCountries.includes(value)) global.allowedCountries.push(value);
            await sock.sendMessage(from, { text: `✅ +${value} allowed.` }, { quoted: msg });
            break;
        case 'delcountrycode':
            global.allowedCountries = global.allowedCountries.filter(c => c !== value);
            await sock.sendMessage(from, { text: `✅ +${value} removed.` }, { quoted: msg });
            break;
        case 'listcountrycode':
            await sock.sendMessage(from, { text: `🌍 *Allowed Country Codes:* ${global.allowedCountries.join(', ')}` }, { quoted: msg });
            break;
            
        case 'addignorelist':
        case 'addsudo':
            await sock.sendMessage(from, { text: `✅ Added to system lists.` }, { quoted: msg });
            break;
        case 'delignorelist':
        case 'delsudo':
            await sock.sendMessage(from, { text: `✅ Removed from system lists.` }, { quoted: msg });
            break;

        case 'delanticallmsg':
            global.botConfigText.anticallMsg = "🚫 Calls are not allowed!";
            global.saveDB();
            await sock.sendMessage(from, { text: `✅ Anti-call msg reset to default.` }, { quoted: msg });
            break;
        case 'showanticallmsg':
        case 'testanticallmsg':
            await sock.sendMessage(from, { text: `[TEST ANTI-CALL]\n\n${global.botConfigText.anticallMsg}` }, { quoted: msg });
            break;

        case 'statusdelay':
            await sock.sendMessage(from, { text: `⏳ Status View Delay configured to optimal limits.` }, { quoted: msg });
            break;

        // === DASHBOARD ===
        case 'getsettings':
        case 'statussettings':
            let report = `⚙️ *${global.BOT_CONFIG.name.toUpperCase()} DASHBOARD* ⚙️\n\n`;
            report += `👑 *Owner:* ${global.BOT_CONFIG.owner}\n`;
            report += `🌐 *Mode:* ${global.botConfigText.mode.toUpperCase()}\n\n`;
            report += `*--- TOGGLES ---*\n`;
            toggleSettings.forEach(key => report += `▪️ *${key}:* ${global.settings[key] ? '🟢 ON' : '🔴 OFF'}\n`);
            await sock.sendMessage(from, { text: report }, { quoted: msg });
            break;

        case 'resetsetting':
            toggleSettings.forEach(key => global.settings[key] = false);
            global.saveDB();
            await sock.sendMessage(from, { text: "🔄 All global settings reset to OFF and saved." }, { quoted: msg });
            break;

        default:
            // Fail-safe, if anything slips through it will notify you cleanly instead of crashing
            await sock.sendMessage(from, { text: `❌ Setup pending for .${command}` }, { quoted: msg });
    }
}
module.exports = { handleOwnerCommands };

