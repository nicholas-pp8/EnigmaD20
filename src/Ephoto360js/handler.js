const { ephoto } = require('ephoto360-scraper');

async function handleEphoto(sock, from, msg, command, text) {
    if (!text) {
        return await sock.sendMessage(from, { text: `⚠️ Please provide text for the effect!\n*Example:* .${command} Enigma` }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: `🎨 Generating your *${command}* effect...` }, { quoted: msg });

    try {
        // Dynamic command mapping
        const result = await ephoto(command, text);
        
        await sock.sendMessage(from, { 
            image: { url: result.url }, 
            caption: `✅ Effect: *${command}*` 
        }, { quoted: msg });
    } catch (error) {
        await sock.sendMessage(from, { text: `❌ Failed to generate effect.\n_Error: ${error.message}_` }, { quoted: msg });
    }
}

module.exports = { handleEphoto };

