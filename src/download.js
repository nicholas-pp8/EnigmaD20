const { youtube } = require('btch-downloader'); 
const yts = require('yt-search');

async function handlePlay(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide a song name!\nExample: .play saanson ko" }, { quoted: msg });
    }

    const query = args.join(' ');

    try {
        // 1. YouTube par song search karo
        const searchResults = await yts(query);
        if (!searchResults || !searchResults.videos.length) {
            return await sock.sendMessage(from, { text: "❌ Song not found on YouTube." }, { quoted: msg });
        }

        const video = searchResults.videos[0];

        // 2. Processing Message (tumhara purana style)
        const processingMsg = await sock.sendMessage(from, { 
            image: { url: video.thumbnail },
            caption: `*${video.title}*\n\n⬇️ Processing audio via Cypher Bypass Engine...` 
        }, { quoted: msg });

        // 3. 💥 Naya btch-downloader Magic 💥
        const data = await youtube(video.url);

        // API se aane wala direct audio link nikalna
        let audioLink = data.url || data.mp3 || data.audio || (data.data && data.data.url);
        
        if (!audioLink) {
             throw new Error("Direct audio link not found from scraper API.");
        }

        // 4. Seedha WhatsApp par direct link bhej do
        await sock.sendMessage(from, { 
            audio: { url: audioLink }, 
            mimetype: 'audio/mp4', 
            ptt: false 
        }, { quoted: processingMsg });

    } catch (error) {
        console.error("BTCH Downloader Error:", error);
        await sock.sendMessage(from, { text: "❌ Cypher engine failed to fetch audio. Please try again later." }, { quoted: msg });
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

