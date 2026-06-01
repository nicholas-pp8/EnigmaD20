const mumaker = require('mumaker');

// 💥 Direct Ephoto360 URLs Mapping (ALL 34 EFFECTS) 💥
const ephotoEffects = {
    '1917style': 'https://en.ephoto360.com/1917-style-text-effect-online-free-582.html',
    'advancedglow': 'https://en.ephoto360.com/advanced-glow-text-effect-online-free-581.html',
    'blackpinklogo': 'https://en.ephoto360.com/create-blackpink-logo-online-free-607.html',
    'blackpinkstyle': 'https://en.ephoto360.com/online-blackpink-style-logo-maker-effect-711.html',
    'cartoonstyle': 'https://en.ephoto360.com/create-a-cartoon-style-text-effect-online-free-624.html',
    'deletingtext': 'https://en.ephoto360.com/create-a-deleting-text-effect-online-free-625.html',
    'dragonball': 'https://en.ephoto360.com/create-dragon-ball-style-text-effects-online-589.html',
    'effectclouds': 'https://en.ephoto360.com/create-a-cloud-text-effect-online-free-578.html',
    'flag3dtext': 'https://en.ephoto360.com/create-a-3d-flag-text-effect-online-free-618.html',
    'flagtext': 'https://en.ephoto360.com/create-a-flag-text-effect-online-free-617.html',
    'freecreate': 'https://en.ephoto360.com/free-create-a-3d-text-effect-online-616.html',
    'galaxystyle': 'https://en.ephoto360.com/create-a-galaxy-style-text-effect-online-free-615.html',
    'galaxywallpaper': 'https://en.ephoto360.com/create-a-galaxy-wallpaper-text-effect-online-free-613.html',
    'glitchtext': 'https://en.ephoto360.com/create-a-glitch-text-effect-online-free-614.html',
    'glowingtext': 'https://en.ephoto360.com/create-a-glowing-text-effect-online-free-612.html',
    'gradienttext': 'https://en.ephoto360.com/create-a-gradient-text-effect-online-free-577.html',
    'graffiti': 'https://en.ephoto360.com/create-a-graffiti-text-effect-online-free-611.html',
    'incandescent': 'https://en.ephoto360.com/create-an-incandescent-text-effect-online-free-610.html',
    'lighteffects': 'https://en.ephoto360.com/create-light-effects-text-online-free-609.html',
    'logomaker': 'https://en.ephoto360.com/free-logo-maker-online-608.html',
    'luxurygold': 'https://en.ephoto360.com/create-a-luxury-gold-text-effect-online-free-593.html',
    'makingneon': 'https://en.ephoto360.com/make-a-neon-light-effect-online-free-594.html',
    'matrix': 'https://en.ephoto360.com/matrix-text-effect-online-free-592.html',
    'multicoloredneon': 'https://en.ephoto360.com/create-a-multicolored-neon-light-text-effect-online-free-591.html',
    'neonglitch': 'https://en.ephoto360.com/create-a-neon-glitch-text-effect-online-free-590.html',
    'papercutstyle': 'https://en.ephoto360.com/paper-cut-style-text-effect-online-free-580.html',
    'pixelglitch': 'https://en.ephoto360.com/create-a-pixel-glitch-text-effect-online-free-588.html',
    'royaltext': 'https://en.ephoto360.com/create-a-royal-text-effect-online-free-587.html',
    'sand': 'https://en.ephoto360.com/write-in-sand-text-effect-online-free-575.html',
    'summerbeach': 'https://en.ephoto360.com/summer-beach-text-effect-online-free-576.html',
    'topography': 'https://en.ephoto360.com/create-a-topography-text-effect-online-free-586.html',
    'typography': 'https://en.ephoto360.com/create-typography-text-effect-online-free-584.html',
    'watercolortext': 'https://en.ephoto360.com/watercolor-text-effect-online-free-579.html',
    'writetext': 'https://en.ephoto360.com/write-text-on-wet-glass-online-free-583.html'
};

async function handleEphoto(sock, from, msg, command, text) {
    if (!text) {
        return await sock.sendMessage(from, { text: `⚠️ Please provide text for the effect!\n*Example:* .${command} Rohan` }, { quoted: msg });
    }

    const url = ephotoEffects[command];
    
    if (!url) {
        return await sock.sendMessage(from, { text: `❌ Effect *${command}* is currently not mapped or under maintenance.` }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: `🎨 Generating your *${command}* effect... _(Please wait 10-15s)_` }, { quoted: msg });

    try {
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

