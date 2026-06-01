const mumaker = require('mumaker');

// 💥 Direct Ephoto360 URLs Mapping 💥
const ephotoEffects = {
    'glitchtext': 'https://en.ephoto360.com/create-a-glitch-text-effect-online-free-614.html',
    'blackpinkstyle': 'https://en.ephoto360.com/create-blackpink-logo-online-free-607.html',
    'makingneon': 'https://en.ephoto360.com/make-a-neon-light-effect-online-free-594.html',
    'luxurygold': 'https://en.ephoto360.com/create-a-luxury-gold-text-effect-online-free-593.html',
    'matrix': 'https://en.ephoto360.com/matrix-text-effect-online-free-592.html',
    'dragonball': 'https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-589.html',
    'typography': 'https://en.ephoto360.com/create-typography-text-effect-online-free-584.html',
    '1917style': 'https://en.ephoto360.com/1917-style-text-effect-online-free-582.html',
    'advancedglow': 'https://en.ephoto360.com/advanced-glow-text-effect-online-free-581.html',
    'papercutstyle': 'https://en.ephoto360.com/paper-cut-style-text-effect-online-free-580.html',
    'watercolortext': 'https://en.ephoto360.com/watercolor-text-effect-online-free-579.html',
    'effectclouds': 'https://en.ephoto360.com/create-a-cloud-text-effect-online-free-578.html',
    'gradienttext': 'https://en.ephoto360.com/create-a-gradient-text-effect-online-free-577.html',
    'summerbeach': 'https://en.ephoto360.com/summer-beach-text-effect-online-free-576.html',
    'sand': 'https://en.ephoto360.com/write-in-sand-text-effect-online-free-575.html'
};

async function handleEphoto(sock, from, msg, command, text) {
    if (!text) {
        return await sock.sendMessage(from, { text: `⚠️ Please provide text for the effect!\n*Example:* .${command} Rohan` }, { quoted: msg });
    }

    const url = ephotoEffects[command];
    
    // Agar command map mein nahi mili (Graceful Fallback)
    if (!url) {
        return await sock.sendMessage(from, { text: `❌ Effect *${command}* is currently not mapped or under maintenance.` }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: `🎨 Generating your *${command}* effect... _(Please wait 10-15s)_` }, { quoted: msg });

    try {
        // Mumaker API Call
        const result = await mumaker.ephoto(url, text);
        const imgUrl = result.image || result;
        
        await sock.sendMessage(from, { 
            image: { url: imgUrl }, 
            caption: `✅ Effect: *${command}*\n✨ Powered by Enigma D20` 
        }, { quoted: msg });
    } catch (error) {
        console.error("Ephoto360 Error:", error);
        await sock.sendMessage(from, { text: `❌ Failed to generate effect.\n_Error: API Timeout or Invalid Data._` }, { quoted: msg });
    }
}

module.exports = { handleEphoto };

