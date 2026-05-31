const ab = require('ab-downloader'); // Naya superfast engine
const yts = require('yt-search');

async function handlePlay(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide a song name!\nExample: .play saanson ko" }, { quoted: msg });
    }

    const query = args.join(' ');

    try {
        // 1. YouTube se song search karo
        const searchResults = await yts(query);
        if (!searchResults || !searchResults.videos.length) {
            return await sock.sendMessage(from, { text: "❌ Song not found on YouTube." }, { quoted: msg });
        }

        const video = searchResults.videos[0];

        // 2. Processing Message
        const processingMsg = await sock.sendMessage(from, { 
            image: { url: video.thumbnail },
            caption: `*${video.title}*\n\n⬇️ Processing audio via AB-Downloader (Ultra Fast)...` 
        }, { quoted: msg });

        // 3. 💥 Smart AB-Downloader Magic 💥
        let data;
        
        // Auto-detecting the correct method since scraper APIs can vary
        if (typeof ab.ytmp3 === 'function') {
            data = await ab.ytmp3(video.url);
        } else if (typeof ab.yta === 'function') {
            data = await ab.yta(video.url);
        } else if (typeof ab.youtube === 'function') {
            data = await ab.youtube(video.url);
        } else if (typeof ab.download === 'function') {
            data = await ab.download(video.url);
        } else {
            throw new Error("Could not find the correct audio extraction function.");
        }

        // Direct audio link nikalna
        let audioLink = data.url || data.mp3 || data.audio || data.download || (data.data && data.data.url) || (data.data && data.data.audio);
        
        if (!audioLink) {
             throw new Error("Direct audio link not found from AB-Downloader API.");
        }

        // 4. Seedha WhatsApp par direct link bhej do
        await sock.sendMessage(from, { 
            audio: { url: audioLink }, 
            mimetype: 'audio/mp4', 
            ptt: false 
        }, { quoted: processingMsg });

    } catch (error) {
        console.error("AB-Downloader Error:", error);
        await sock.sendMessage(from, { text: "❌ AB-Downloader engine failed to fetch audio. Please try again later." }, { quoted: msg });
    }
}

// Lyrics wala function same rahega
async function handleLyrics(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide a song name!\nExample: .lyrics saanson ko" }, { quoted: msg });
    }
    const query = args.join(' ');
    await sock.sendMessage(from, { text: `🔍 Searching lyrics for: *${query}*...` }, { quoted: msg });
}

module.exports = { handlePlay, handleLyrics };

