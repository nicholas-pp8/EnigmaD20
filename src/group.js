// 💥 GROUP MANAGEMENT FEATURES 💥

async function handleGroupCommands(sock, from, msg, args, command, senderNum, isOwner) {
    const isGroup = from.endsWith('@g.us');
    
    // Agar private chat mein group command chalaya toh bot mana kar dega
    if (!isGroup) {
        return await sock.sendMessage(from, { text: "⚠️ This command can only be used in Groups!" }, { quoted: msg });
    }

    const groupMetadata = await sock.groupMetadata(from);
    const participants = groupMetadata.participants;
    const groupAdmins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
    
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const senderId = `${senderNum}@s.whatsapp.net`;
    
    const isBotAdmin = groupAdmins.includes(botId);
    const isSenderAdmin = groupAdmins.includes(senderId) || isOwner;

    // Target nikalne ka smart function (Mentions ya Quoted message se)
    const getTarget = () => {
        let target = '';
        if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
            target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        } else if (msg.message.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
        }
        return target;
    };

    try {
        // 1. HIDETAG (Admins Only) - Messages without showing all names
        if (command === 'hidetag') {
            if (!isSenderAdmin) return await sock.sendMessage(from, { text: "⚠️ Only admins can use .hidetag!" }, { quoted: msg });
            
            const text = args.join(' ') || "Attention Everyone!";
            const participantIds = participants.map(a => a.id);
            
            await sock.sendMessage(from, { text: text, mentions: participantIds });
        }

        // 2. TAGALL (Anyone can use) - Tags everyone with a list
        else if (command === 'tagall') {
            const text = args.length > 0 ? `*Message:* ${args.join(' ')}\n\n` : '';
            let mentions = [];
            let tagMsg = `${text}*🏷️ TAGGING ALL MEMBERS 🏷️*\n\n`;
            
            for (let part of participants) {
                tagMsg += `➥ @${part.id.split('@')[0]}\n`;
                mentions.push(part.id);
            }
            
            await sock.sendMessage(from, { text: tagMsg, mentions: mentions }, { quoted: msg });
        }

        // 3. PROMOTE (Admins Only) - Make someone admin
        else if (command === 'promote') {
            if (!isBotAdmin) return await sock.sendMessage(from, { text: "⚠️ Bot must be an admin first!" }, { quoted: msg });
            if (!isSenderAdmin) return await sock.sendMessage(from, { text: "⚠️ Only admins can use .promote!" }, { quoted: msg });
            
            const target = getTarget();
            if (!target) return await sock.sendMessage(from, { text: "⚠️ Tag or quote someone to promote!\n*Example:* .promote @user" }, { quoted: msg });
            
            await sock.groupParticipantsUpdate(from, [target], "promote");
            await sock.sendMessage(from, { text: `✅ @${target.split('@')[0]} is now an Admin!`, mentions: [target] }, { quoted: msg });
        }

        // 4. DEMOTE (Admins Only) - Remove someone from admin
        else if (command === 'demote') {
            if (!isBotAdmin) return await sock.sendMessage(from, { text: "⚠️ Bot must be an admin first!" }, { quoted: msg });
            if (!isSenderAdmin) return await sock.sendMessage(from, { text: "⚠️ Only admins can use .demote!" }, { quoted: msg });
            
            const target = getTarget();
            if (!target) return await sock.sendMessage(from, { text: "⚠️ Tag or quote an admin to demote!\n*Example:* .demote @user" }, { quoted: msg });
            
            await sock.groupParticipantsUpdate(from, [target], "demote");
            await sock.sendMessage(from, { text: `📉 @${target.split('@')[0]} has been removed from Admins!`, mentions: [target] }, { quoted: msg });
        }

        // 5. REMOVEALL (Admins Only) - Nuke the group
        else if (command === 'removeall') {
            if (!isBotAdmin) return await sock.sendMessage(from, { text: "⚠️ Bot must be an admin first to kick members!" }, { quoted: msg });
            if (!isSenderAdmin) return await sock.sendMessage(from, { text: "⚠️ Only admins can use .removeall!" }, { quoted: msg });
            
            await sock.sendMessage(from, { text: "🚨 *INITIATING MASS REMOVAL!* Removing everyone from the group..." }, { quoted: msg });
            
            const ownerId = groupMetadata.owner || '';
            
            // Safeguard: Bot khud ko, message bhejne wale ko, aur group creator ko delete nahi karega
            const toRemove = participants
                .filter(p => p.id !== botId && p.id !== ownerId && p.id !== senderId)
                .map(p => p.id);

            if (toRemove.length === 0) {
                return await sock.sendMessage(from, { text: "⚠️ No one left to remove! (Skipping Bot, Owner, and You)" }, { quoted: msg });
            }

            await sock.groupParticipantsUpdate(from, toRemove, "remove");
            await sock.sendMessage(from, { text: `✅ Successfully removed ${toRemove.length} members.` }, { quoted: msg });
        }

    } catch (error) {
        console.error("Group Command Error:", error);
        await sock.sendMessage(from, { text: `❌ Failed to execute command.\n_Error: ${error.message}_` }, { quoted: msg });
    }
}

module.exports = { handleGroupCommands };

