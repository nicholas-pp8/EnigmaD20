const ab = require('ab-downloader'); 
const apkmirror = require('apkmirror-downloader'); 
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// 💥 THE FIXED UNIVERSAL DOWNLOADER (Using exact package functions) 💥
async function universalDownloader(sock, from, msg, args, platform) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: `⚠️ Please provide a ${platform} link!\nExample: .${platform.toLowerCase().split('/')[0]} <link>` }, { quoted: msg });
    }

    const url = args.join(' ');
    await sock.sendMessage(from, { text: `🔍 Processing your ${platform} link...` }, { quoted: msg });

    try {
        let data;
        
        // Exact Function Mapping based on the X-Ray error screenshot!
        if (platform === "YouTube/Video") {
            data = await ab.youtube(url);
        } else if (platform === "TikTok") {
            data = await ab.ttdl(url);
        } else if (platform === "Instagram") {
            data = await ab.igdl(url);
        } else if (platform === "Facebook") {
            data = await ab.fbdown(url);
        } else {
            // Fallback for random links
            data = await ab.aio(url); 
        }

        if (!data) throw new Error("API returned empty data.");

        // Smart Extraction (handling different JSON structures from the API)
        let dlLink = data.url || data.video || data.link || data.hd || (data.data && data.data.url) || (data.data && data.data.video) || (data.data && data.data.hd);
        
        // Array Data extraction (for 720p or highest quality logic)
        if (!dlLink && Array.isArray(data.data)) {
            const format720 = data.data.find(f => f.quality === '720p' || f.resolution === '720p' || f.format === 'mp4');
            if (format720) dlLink = format720.url;
            else if (data.data[0] && data.data[0].url) dlLink = data.data[0].url;
        }

        // Medias extraction
        if (!dlLink && data.medias && Array.isArray(data.medias)) {
            const formatVideo = data.medias.find(m => m.extension === 'mp4' || m.quality === '720p' || m.quality === 'hd');
            if (formatVideo) dlLink = formatVideo.url;
            else dlLink = data.medias[0].url;
        }

        if (!dlLink) {
            throw new Error(`Could not extract direct link. Raw: ${JSON.stringify(data).substring(0, 80)}...`);
        }

        const isImage = dlLink.match(/\.(jpeg|jpg|gif|png)/i) || (data.type && data.type.includes('image'));

        await sock.sendMessage(from, { text: `⬇️ Sending Media... _(Please wait)_` }, { quoted: msg });

        if (isImage) {
            await sock.sendMessage(from, { image: { url: dlLink }, caption: `📸 Downloaded from ${platform}` }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { video: { url: dlLink }, caption: `✅ Downloaded from ${platform}`, mimetype: 'video/mp4' }, { quoted: msg });
        }
    } catch (error) {
        console.error("Downloader Error:", error);
        await sock.sendMessage(from, { text: `❌ Failed to download from ${platform}.\n_Error: ${error.message}_` }, { quoted: msg });
    }
}

// HANDLERS
async function handleVideo(sock, from, msg, args) {
    if (!args[0]?.startsWith('http')) {
        const query = args.join(' ');
        const search = await yts(query);
        if(!search.videos || !search.videos.length) return sock.sendMessage(from, {text: "❌ Video not found on YouTube."});
        args = [search.videos[0].url]; 
    }
    await universalDownloader(sock, from, msg, args, "YouTube/Video");
}

async function handleTikTok(sock, from, msg, args) { await universalDownloader(sock, from, msg, args, "TikTok"); }
async function handleInstagram(sock, from, msg, args) { await universalDownloader(sock, from, msg, args, "Instagram"); }
async function handleFacebook(sock, from, msg, args) { await universalDownloader(sock, from, msg, args, "Facebook"); }

async function handlePlay(sock, from, msg, args) {
    if (!args || args.length === 0) return await sock.sendMessage(from, { text: "⚠️ Provide song name!" }, { quoted: msg });
    const query = args.join(' ');
    try {
        const search = await yts(query);
        if(!search.videos.length) throw new Error("Not found");
        const video = search.videos[0];
        
        const processingMsg = await sock.sendMessage(from, { image: { url: video.thumbnail }, caption: `*${video.title}*\n\n⬇️ Downloading pure MP3 format...` }, { quoted: msg });

        // Using exactly ab.youtube as revealed by X-Ray!
        let data = await ab.youtube(video.url);
        if (!data) throw new Error("Missing audio data.");

        // We need audio specifically
        let audioLink = data.audio || data.mp3;
        
        if (!audioLink && Array.isArray(data.data)) {
            const formatAudio = data.data.find(f => f.quality === '128kbps' || f.format === 'mp3' || f.type === 'audio');
            if (formatAudio) audioLink = formatAudio.url;
        }
        
        if(!audioLink && data.medias && Array.isArray(data.medias)) {
            const formatAudio = data.medias.find(m => m.extension === 'mp3' || m.audio);
            if (formatAudio) audioLink = formatAudio.url;
        }

        // Ultimate fallback
        if (!audioLink) audioLink = data.url || data.link || (data.data && data.data.url);
        
        if (!audioLink) throw new Error("Link extract failed.");

        await sock.sendMessage(from, { audio: { url: audioLink }, mimetype: 'audio/mpeg' }, { quoted: processingMsg });
    } catch (e) { 
        await sock.sendMessage(from, { text: `❌ Failed. Error: ${e.message}` }, { quoted: msg }); 
    }
}

async function handleApk(sock, from, msg, args) {
    if (!args || args.length === 0) return await sock.sendMessage(from, { text: "⚠️ Please provide an app name!" }, { quoted: msg });
    const appName = args.join(' ');
    try {
        await sock.sendMessage(from, { text: `🔍 Searching for *${appName}* via APKMirror...` }, { quoted: msg });
        let downloader = apkmirror.APKMirrorDownloader ? new apkmirror.APKMirrorDownloader() : new apkmirror();
        let res;
        if (typeof downloader.download === 'function') res = await downloader.download(appName);
        else if (typeof downloader.search === 'function') res = await downloader.search(appName);
        else throw new Error("Method missing.");
        
        let appData = Array.isArray(res) ? res[0] : res;
        let link = appData?.download || appData?.url || (appData?.data && appData.data.url);
        if (!link && typeof appData === 'string' && appData.startsWith('http')) link = appData;
        if (!link) throw new Error(`Link not found.`);
        
        await sock.sendMessage(from, { document: { url: link }, fileName: `${appData?.name || appName}.apk`, mimetype: 'application/vnd.android.package-archive' }, { quoted: msg });
    } catch (error) {
        await sock.sendMessage(from, { text: `❌ Failed to download APK. Error: ${error.message}` }, { quoted: msg });
    }
}

async function handleLyrics(sock, from, msg, args) {
    await sock.sendMessage(from, { text: "🔍 Searching lyrics..." }, { quoted: msg });
}

module.exports = { handlePlay, handleLyrics, handleApk, handleVideo, handleTikTok, handleInstagram, handleFacebook };

