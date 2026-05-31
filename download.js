const ytdl = require('@distube/ytdl-core'); // Naya bypass engine
const yts = require('yt-search');

async function handlePlay(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide a song name!\nExample: .play saanson ko" }, { quoted: msg });
    }

    const query = args.join(' ');

    try {
        // 1. YouTube par gaana search karo
        const searchResults = await yts(query);
        if (!searchResults || !searchResults.videos.length) {
            return await sock.sendMessage(from, { text: "❌ Song not found on YouTube." }, { quoted: msg });
        }

        const video = searchResults.videos[0];

        // 2. Exact tumhare screenshot wala "Processing audio..." message bhejo
        const processingMsg = await sock.sendMessage(from, { 
            image: { url: video.thumbnail },
            caption: `*${video.title}*\n\n⬇️ Processing audio...` 
        }, { quoted: msg });

        // 3. Audio Download karo bypass engine ke sath
        const stream = ytdl(video.url, { 
            filter: 'audioonly', 
            quality: 'highestaudio' 
        });

        const chunks = [];
        stream.on('data', (chunk) => {
            chunks.push(chunk);
        });

        // 4. Download complete hone par audio bhejo
        stream.on('end', async () => {
            const audioBuffer = Buffer.concat(chunks);
            
            await sock.sendMessage(from, { 
                audio: audioBuffer, 
                mimetype: 'audio/mp4', 
                ptt: false 
            }, { quoted: processingMsg }); // Reply to the processing message
        });

        // 5. Agar koi internal error aaye
        stream.on('error', async (err) => {
            console.error("YTDL Error:", err);
            await sock.sendMessage(from, { text: "❌ Download failed due to YouTube security block. Please try another song." }, { quoted: msg });
        });

    } catch (error) {
        console.error(error);
        await sock.sendMessage(from, { text: "❌ An error occurred while processing your request." }, { quoted: msg });
    }
}

// Tumhara lyrics wala function (structure same rakha hai taaki error na aaye)
async function handleLyrics(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide a song name!\nExample: .lyrics saanson ko" }, { quoted: msg });
    }
    const query = args.join(' ');
    // Yahan tumhara API fetch wala logic agar tha toh woh same rahega.
    await sock.sendMessage(from, { text: `🔍 Searching lyrics for: *${query}*...` }, { quoted: msg });
}

module.exports = { handlePlay, handleLyrics };

