const ab = require('ab-downloader'); 
const apkmirror = require('apkmirror-downloader'); 
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// 💥 THE DEEP X-RAY LINK SCANNER 💥
// Yeh JSON ke andar chupay gaye kisi bhi link ko dhund nikalega
function findMediaLink(obj, type = 'video') {
    if (!obj) return null;
    
    // 1. Direct common paths check
    let link = obj.url || obj.download || obj.link || obj.hd || obj.video || obj.audio || obj.mp4 || obj.mp3;
    if (obj.data) {
        link = link || obj.data.url || obj.data.download || obj.data.link || obj.data.hd || obj.data.video || obj.data.audio || obj.data.mp4;
    }
    if (obj.result) {
        link = link || obj.result.url || obj.result.download || obj.result.link || obj.result.hd || obj.result.video || obj.result.audio;
    }
    if (typeof link === 'string' && link.startsWith('http')) return link;

    // 2. Arrays check (Agar link list mein hai)
    let arraysToCheck = [obj.data, obj.medias, obj.links, obj.result].filter(Array.isArray);
    for (let arr of arraysToCheck) {
        let best = arr.find(x => 
            (type === 'video' && (x.quality === '720p' || x.format === 'mp4' || x.extension === 'mp4')) ||
            (type === 'audio' && (x.quality === '128kbps' || x.format === 'mp3' || x.extension === 'mp3' || x.audio))
        );
        if (best && best.url) return best.url;
        if (arr[0] && arr[0].url) return arr[0].url;
    }

    // 3. Ultimate X-Ray: Deep search for ANY HTTP string in the entire JSON object
    let allUrls = [];
    const extractStrings = (o) => {
        if (typeof o === 'string' && o.startsWith('http')) {
            allUrls.push(o);
        } else if (typeof o === 'object' && o !== null) {
            Object.values(o).forEach(extractStrings);
        }
    };
    extractStrings(obj);

    if (allUrls.length > 0) {
        // Find best match based on file extension
        let target = allUrls.find(v => 
            type === 'video' ? (v.includes('.mp4') || v.includes('googlevideo') || v.includes('video')) : 
                               (v.includes('.mp3') || v.includes('audio'))
        );
        return target || allUrls[0]; // Return best match, otherwise first link found
    }

    return null;
}

// 💥 THE UNIVERSAL DOWNLOADER 💥
async function universalDownloader(sock, from, msg, args, platform) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: `⚠️ Please provide a ${platform} link!\nExample: .${platform.toLowerCase().split('/')[0]} <link>` }, { quoted: msg });
    }

    const url = args.join(' ');
    await sock.sendMessage(from, { text: `🔍 Processing your ${platform} link...` }, { quoted: msg });

    try {
        let data;
        
        // Accurate package functions
        if (platform === "YouTube/Video") {
            data = await ab.youtube(url);
        } else if (platform === "TikTok") {
            data = await ab.ttdl(url);
        } else if (platform === "Instagram") {
            data = await ab.igdl(url);
        } else if (platform === "Facebook") {
            data = await ab.fbdown(url);
        } else {
            data = await ab.aio(url); 
        }

        if (!data) throw new Error("API returned empty data.");

        // Using our Deep Scanner!
        let dlLink = findMediaLink(data, 'video');

        if (!dlLink) {
            throw new Error(`Could not extract direct link. Raw: ${JSON.stringify(data).substring(0, 100)}...`);
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

        let data = await ab.youtube(video.url);
        if (!data) throw new Error("Missing audio data.");

        // Using our Deep Scanner for Audio!
        let audioLink = findMediaLink(data, 'audio');
        
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

