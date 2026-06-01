// Group Data Storage (Simulating Database)
if (!global.groupConfigs) global.groupConfigs = {};

async function handleGroupCommands(sock, from, msg, args, command, senderNum, isOwner) {
    const isGroup = from.endsWith('@g.us');
    if (!isGroup) return await sock.sendMessage(from, { text: "⚠️ This command can only be used in Groups!" }, { quoted: msg });

    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants;
    const groupAdmins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
    const senderId = `${senderNum}@s.whatsapp.net`;
    const isSenderAdmin = groupAdmins.includes(senderId) || isOwner;
    const textArg = args.join(' ');

    // Init group config if doesn't exist
    if (!global.groupConfigs[from]) {
        global.groupConfigs[from] = { welcome: "Welcome to the group!", goodbye: "Goodbye!", warns: {} };
    }
    const gc = global.groupConfigs[from];

    try {
        // --- OLD FEATURES (HIDETAG, TAGALL, PROMOTE, DEMOTE, REMOVEALL) ---
        if (command === 'hidetag' && isSenderAdmin) {
            await sock.sendMessage(from, { text: textArg || "Attention!", mentions: participants.map(a => a.id) });
        }
        else if (command === 'tagall') {
            let tagMsg = `*🏷️ TAGGING ALL MEMBERS 🏷️*\n\n`;
            participants.forEach(p => tagMsg += `➥ @${p.id.split('@')[0]}\n`);
            await sock.sendMessage(from, { text: tagMsg, mentions: participants.map(a => a.id) }, { quoted: msg });
        }
        // ... (Keep your existing promote, demote, removeall logic here) ...

        // --- NEW CYPHER SETTINGS (GROUP LEVEL) ---
        else if (command === 'setwelcome') {
            if (!isSenderAdmin) return await sock.sendMessage(from, { text: "⚠️ Only admins!" }, { quoted: msg });
            if (!textArg) return await sock.sendMessage(from, { text: "⚠️ Please enter a welcome message!" }, { quoted: msg });
            gc.welcome = textArg;
            await sock.sendMessage(from, { text: "✅ Group Welcome message updated." }, { quoted: msg });
        }
        else if (command === 'delwelcome') {
            if (!isSenderAdmin) return;
            gc.welcome = "";
            await sock.sendMessage(from, { text: "🗑️ Group Welcome message deleted." }, { quoted: msg });
        }
        else if (command === 'showwelcome' || command === 'testwelcome') {
            const displayMsg = gc.welcome ? gc.welcome : "No welcome message set.";
            await sock.sendMessage(from, { text: `[TEST WELCOME]\n\n${displayMsg}` }, { quoted: msg });
        }
        else if (command === 'setgoodbye') {
            if (!isSenderAdmin) return;
            gc.goodbye = textArg;
            await sock.sendMessage(from, { text: "✅ Group Goodbye message updated." }, { quoted: msg });
        }
        else if (command === 'testgoodbye') {
            await sock.sendMessage(from, { text: `[TEST GOODBYE]\n\n${gc.goodbye}` }, { quoted: msg });
        }
        
        // --- WARN SYSTEM ---
        else if (command === 'setwarn') {
            if (!isSenderAdmin) return;
            const target = msg.message.extendedTextMessage?.contextInfo?.participant;
            if (!target) return await sock.sendMessage(from, { text: "⚠️ Please quote the user to warn!" }, { quoted: msg });
            
            if (!gc.warns[target]) gc.warns[target] = 0;
            gc.warns[target] += 1;
            
            await sock.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} has been warned! (Total: ${gc.warns[target]}/3)`, mentions: [target] }, { quoted: msg });
            
            if (gc.warns[target] >= 3) {
                await sock.sendMessage(from, { text: `🚨 Maximum warnings reached! Kicking @${target.split('@')[0]}...`, mentions: [target] });
                // Kick logic here
            }
        }
        else if (command === 'resetwarn') {
            if (!isSenderAdmin) return;
            const target = msg.message.extendedTextMessage?.contextInfo?.participant;
            if (target) {
                gc.warns[target] = 0;
                await sock.sendMessage(from, { text: `✅ Warnings reset for user.` }, { quoted: msg });
            }
        }

    } catch (error) {
        await sock.sendMessage(from, { text: `❌ Error: ${error.message}` }, { quoted: msg });
    }
}
module.exports = { handleGroupCommands };

