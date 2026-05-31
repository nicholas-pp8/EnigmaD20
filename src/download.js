const play = require('play-dl');
const yts = require('yt-search');

async function handlePlay(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide a song name!\nExample: .play saanson ko" }, { quoted: msg });
    }

    const query = args.join(' ');

    try {
        // 1. YouTube par search karo
        const searchResults = await yts(query);
        if (!searchResults || !searchResults.videos.length) {
            return await sock.sendMessage(from, { text: "❌ Song not found on YouTube." }, { quoted: msg });
        }

        const video = searchResults.videos[0];

        const processingMsg = await sock.sendMessage(from, { 
            image: { url: video.thumbnail },
            caption: `*${video.title}*\n\n⬇️ Processing audio via Advanced Bypass...` 
        }, { quoted: msg });

        // 2. Play-dl Bypass Engine Activate
        const streamInfo = await play.stream(video.url);

        const chunks = [];
        streamInfo.stream.on('data', (chunk) => {
            chunks.push(chunk);
        });

        streamInfo.stream.on('end', async () => {
            const audioBuffer = Buffer.concat(chunks);
            
            await sock.sendMessage(from, { 
                audio: audioBuffer, 
                mimetype: 'audio/mp4', 
                ptt: false 
            }, { quoted: processingMsg });
        });

        streamInfo.stream.on('error', async (err) => {
            console.error("Play-DL Stream Error:", err);
            await sock.sendMessage(from, { text: "❌ Stream broken. Please try another song." }, { quoted: msg });
        });

    } catch (error) {
        console.error("Play-DL Main Error:", error);
        await sock.sendMessage(from, { text: "❌ Engine blocked by YouTube Server IP Ban. Try again later." }, { quoted: msg });
    }
}

// Lyrics function waisa ka waisa hi
async function handleLyrics(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide a song name!\nExample: .lyrics saanson ko" }, { quoted: msg });
    }
    const query = args.join(' ');
    await sock.sendMessage(from, { text: `🔍 Searching lyrics for: *${query}*...` }, { quoted: msg });
}

module.exports = { handlePlay, handleLyrics };

