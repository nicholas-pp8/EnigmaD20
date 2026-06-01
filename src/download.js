const ab = require('ab-downloader'); 
const { youtube, apk } = require('btch-downloader'); // APK extractor added here
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

async function handlePlay(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide a song name!\nExample: .play saanson ko" }, { quoted: msg });
    }

    const query = args.join(' ');

    try {
        const searchResults = await yts(query);
        if (!searchResults || !searchResults.videos.length) {
            return await sock.sendMessage(from, { text: "❌ Song not found on YouTube." }, { quoted: msg });
        }

        const video = searchResults.videos[0];

        const processingMsg = await sock.sendMessage(from, { 
            image: { url: video.thumbnail },
            caption: `*${video.title}*\n\n⬇️ Converting & downloading pure MP3 format...` 
        }, { quoted: msg });

        let data;
        if (typeof ab.ytmp3 === 'function') data = await ab.ytmp3(video.url);
        else if (typeof ab.yta === 'function') data = await ab.yta(video.url);
        else if (typeof ab.youtube === 'function') data = await ab.youtube(video.url);
        else if (typeof ab.download === 'function') data = await ab.download(video.url);
        else throw new Error("Could not find the correct audio extraction function.");

        let audioLink = data.url || data.mp3 || data.audio || data.download || (data.data && data.data.url) || (data.data && data.data.audio) || data.link;
        
        if (!audioLink) throw new Error("Direct audio link not found.");

        const timeStamp = Date.now();
        const inputPath = path.join(__dirname, `temp_${timeStamp}.webm`);
        const outputPath = path.join(__dirname, `temp_${timeStamp}.mp3`);

        const response = await axios({
            method: 'GET',
            url: audioLink,
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36' }
        });

        const writer = fs.createWriteStream(inputPath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            ffmpeg(inputPath)
                .audioBitrate(128)
                .toFormat('mp3')
                .save(outputPath)
                .on('end', async () => {
                    try {
                        const audioBuffer = fs.readFileSync(outputPath);
                        await sock.sendMessage(from, { 
                            audio: audioBuffer, 
                            mimetype: 'audio/mpeg', 
                            ptt: false 
                        }, { quoted: processingMsg });
                    } catch (e) {
                        console.error("Buffer Send Error:", e);
                    } finally {
                        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                    }
                })
                .on('error', async (err) => {
                    console.error("FFMPEG Conversion Error:", err);
                    await sock.sendMessage(from, { text: "❌ Failed to convert audio format." }, { quoted: msg });
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                });
        });

        writer.on('error', async (err) => {
            console.error("Download Error:", err);
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        });

    } catch (error) {
        console.error("Main Audio Fetch Error:", error);
        await sock.sendMessage(from, { text: "❌ Audio file fetch failed. Please try again." }, { quoted: msg });
    }
}

// 💥 NEW: POWERFUL APK DOWNLOADER FUNCTION 💥
async function handleApk(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide an app name!\nExample: .apk whatsapp" }, { quoted: msg });
    }

    const appName = args.join(' ');
    
    try {
        await sock.sendMessage(from, { text: `🔍 Searching for *${appName}* APK...` }, { quoted: msg });

        // btch-downloader se APK link fetch karna
        const appData = await apk(appName);

        if (!appData || !appData.url) {
            return await sock.sendMessage(from, { text: "❌ APK not found. Please try a different name." }, { quoted: msg });
        }

        const appTitle = appData.name || appName;
        const infoText = `📦 *APK FOUND!*\n\n📝 *Name:* ${appTitle}\n🍏 *Package:* ${appData.id || 'N/A'}\n\n⬇️ Downloading file directly into WhatsApp...`;
        
        await sock.sendMessage(from, { text: infoText }, { quoted: msg });

        // Download APK file via axios response type stream
        const response = await axios({
            method: 'GET',
            url: appData.url,
            responseType: 'arraybuffer',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        const apkBuffer = Buffer.from(response.data, 'binary');
        const cleanFileName = `${appTitle.replace(/[^a-zA-Z0-9]/g, '_')}.apk`;

        // Sending as a Document (.apk file) so user can directly click and install it
        await sock.sendMessage(from, {
            document: apkBuffer,
            mimetype: 'application/vnd.android.package-archive',
            fileName: cleanFileName
        }, { quoted: msg });

    } catch (error) {
        console.error("APK Downloader Error:", error);
        await sock.sendMessage(from, { text: "❌ Failed to download APK. The file might be too large or restricted." }, { quoted: msg });
    }
}

async function handleLyrics(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide a song name!\nExample: .lyrics saanson ko" }, { quoted: msg });
    }
    const query = args.join(' ');
    await sock.sendMessage(from, { text: `🔍 Searching lyrics for: *${query}*...` }, { quoted: msg });
}

module.exports = { handlePlay, handleLyrics, handleApk }; // Added handleApk to exports

