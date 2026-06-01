const ab = require('ab-downloader'); 
const apkmirror = require('apkmirror-downloader'); 
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// 💥 THE FIXED UNIVERSAL DOWNLOADER 💥
async function universalDownloader(sock, from, msg, args, platform) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: `⚠️ Please provide a ${platform} link!\nExample: .${platform.toLowerCase()} <link>` }, { quoted: msg });
    }

    const url = args.join(' ');
    await sock.sendMessage(from, { text: `🔍 Processing your ${platform} link...` }, { quoted: msg });

    try {
        let data;
        
        // Smart Function Detector based on URL
        if (url.includes('youtu') && typeof ab.ytmp4 === 'function') {
            data = await ab.ytmp4(url);
        } else if (url.includes('insta') && typeof ab.igdl === 'function') {
            data = await ab.igdl(url);
        } else if (url.includes('tiktok') && typeof ab.tiktok === 'function') {
            data = await ab.tiktok(url);
        } else if (url.includes('facebook') && typeof ab.fbdl === 'function') {
            data = await ab.fbdl(url);
        } else if (typeof ab === 'function') {
            data = await ab(url); // Direct function fallback
        } else {
            const methods = Object.keys(ab);
            throw new Error(`Package API missing expected function. Available: ${methods.join(', ')}`);
        }

        if (!data) throw new Error("API returned empty data.");

        // Extracting Link Smartly
        let dlLink = data.url || data.video || data.link || data.hd || (data.data && data.data.url) || (data.data && data.data.video);
        
        // Array Data extraction (for 720p logic)
        if (!dlLink && Array.isArray(data.data)) {
            const format720 = data.data.find(f => f.quality === '720p' || f.resolution === '720p');
            if (format720) dlLink = format720.url;
            else if (data.data[0] && data.data[0].url) dlLink = data.data[0].url;
        }

        // Medias extraction
        if (!dlLink && data.medias && Array.isArray(data.medias)) {
            dlLink = data.medias[0].url;
        }

        if (!dlLink) {
            throw new Error(`Could not extract direct link. Raw: ${JSON.stringify(data).substring(0, 50)}...`);
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
        args = [search.videos[0].url]; // Overwrite args with Youtube URL
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

        let data;
        if (typeof ab.ytmp3 === 'function') data = await ab.ytmp3(video.url);
        else if (typeof ab.yta === 'function') data = await ab.yta(video.url);
        else if (typeof ab === 'function') data = await ab(video.url);
        else throw new Error("Missing audio function.");

        let audioLink = data.url || data.audio || data.download || (data.data && data.data.url) || data.link;
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

