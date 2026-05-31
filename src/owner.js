const { exec } = require('child_process');

// ... (your existing owner.js code) ...

if (command === 'update') {
    if (!isOwner) return await sock.sendMessage(from, { text: "❌ Only the Owner can use this command!" }, { quoted: msg });
    
    await sock.sendMessage(from, { text: "🔄 Fetching the latest code from GitHub..." }, { quoted: msg });
    
    exec('git pull origin main', async (err, stdout, stderr) => {
        if (err) {
            return await sock.sendMessage(from, { text: `❌ Update Failed:\n\n${err.message}` }, { quoted: msg });
        }
        if (stdout.includes('Already up to date.')) {
            return await sock.sendMessage(from, { text: "✅ The bot is already on the latest version!" }, { quoted: msg });
        }
        
        await sock.sendMessage(from, { text: `✅ Update Successful!\n\n${stdout}\n\n⚠️ Restarting the bot to apply the new code...` }, { quoted: msg });
        
        // Exits the process to trigger an auto-restart (assuming PM2 or a bash loop is used)
        setTimeout(() => {
            process.exit(1); 
        }, 2000);
    });
}

