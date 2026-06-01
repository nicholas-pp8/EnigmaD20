const ab = require('ab-downloader'); 
const apkmirror = require('apkmirror-downloader'); 
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// CORE DOWNLOADER FUNCTION (Jo saare commands use karenge)
async function universalDownloader(sock, from, msg, args, platform) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: `⚠️ Please provide a ${platform} link!\nExample: .${platform} <link>` }, { quoted: msg });
    }

    const url = args.join(' ');
    await sock.sendMessage(from, { text: `🔍 Processing your ${platform} link...` }, { quoted: msg });

    try {
        let data = await ab.download(url);
        let dlLink = data.url || data.video || data.download || data.link || (data.data && data.data.url);
        
        if (!dlLink && data.medias) dlLink = data.medias[0].url;

        if (!dlLink) throw new Error("Could not extract download link.");

        const isImage = dlLink.match(/\.(jpeg|jpg|gif|png)/i);

        if (isImage) {
            await sock.sendMessage(from, { image: { url: dlLink }, caption: `📸 Downloaded from ${platform}` }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { video: { url: dlLink }, caption: `✅ Downloaded from ${platform}`, mimetype: 'video/mp4' }, { quoted: msg });
        }
    } catch (error) {
        await sock.sendMessage(from, { text: `❌ Failed to download from ${platform}.\n_Error: ${error.message}_` }, { quoted: msg });
    }
}

// HANDLERS
async function handleVideo(sock, from, msg, args) {
    if (!args[0]?.startsWith('http')) {
        // Agar link nahi hai, toh YouTube search
        const query = args.join(' ');
        const search = await yts(query);
        if(!search.videos[0]) return sock.sendMessage(from, {text: "❌ Video not found."});
        args = [search.videos[0].url];
    }
    await universalDownloader(sock, from, msg, args, "YouTube/Video");
}

async function handleTikTok(sock, from, msg, args) { await universalDownloader(sock, from, msg, args, "TikTok"); }
async function handleInstagram(sock, from, msg, args) { await universalDownloader(sock, from, msg, args, "Instagram"); }
async function handleFacebook(sock, from, msg, args) { await universalDownloader(sock, from, msg, args, "Facebook"); }

async function handlePlay(sock, from, msg, args) {
    // ... (purana handlePlay code waisa hi rahega)
    if (!args || args.length === 0) return await sock.sendMessage(from, { text: "⚠️ Provide song name!" }, { quoted: msg });
    const query = args.join(' ');
    try {
        const search = await yts(query);
        const video = search.videos[0];
        const data = await ab.ytmp3(video.url);
        await sock.sendMessage(from, { audio: { url: data.url || data.download }, mimetype: 'audio/mpeg' }, { quoted: msg });
    } catch (e) { await sock.sendMessage(from, { text: "❌ Failed." }); }
}

async function handleApk(sock, from, msg, args) {
    // ... (purana handleApk code waisa hi rahega)
    const appName = args.join(' ');
    let downloader = apkmirror.APKMirrorDownloader ? new apkmirror.APKMirrorDownloader() : new apkmirror();
    const res = await downloader.download(appName);
    const link = res.download || res.url;
    await sock.sendMessage(from, { document: { url: link }, fileName: `${appName}.apk`, mimetype: 'application/vnd.android.package-archive' }, { quoted: msg });
}

async function handleLyrics(sock, from, msg, args) {
    await sock.sendMessage(from, { text: "🔍 Searching lyrics..." }, { quoted: msg });
}

module.exports = { handlePlay, handleLyrics, handleApk, handleVideo, handleTikTok, handleInstagram, handleFacebook };

