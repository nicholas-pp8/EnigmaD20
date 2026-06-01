const truecallerjs = require('truecallerjs');

async function handleTruecaller(sock, from, msg, args) {
    if (!args || args.length === 0) {
        return await sock.sendMessage(from, { text: "⚠️ Please provide a phone number with country code!\n\n*Example:* .truecaller +919876543210" }, { quoted: msg });
    }

    // Number ko clean karna (taaki spaces ya dashes hat jaye)
    const phoneNumber = args.join('').replace(/[^0-9+]/g, '');

    try {
        await sock.sendMessage(from, { text: `🔍 Searching Truecaller database for: *${phoneNumber}*...` }, { quoted: msg });

        // Truecaller Search Payload
        const searchData = {
            number: phoneNumber,
            countryCode: "IN",
            installationId: process.env.TRUECALLER_ID || "a1i0G--V-5N6-5N6-5N6-5N6-5N6" // Dummy fallback ID
        };

        const response = await truecallerjs.search(searchData);

        if (response && response.json()) {
            const data = response.json();
            
            if (data.data && data.data.length > 0) {
                const user = data.data[0];
                const name = user.name || "Unknown Name";
                const carrier = user.phones && user.phones[0] ? user.phones[0].carrier : "N/A";
                const email = user.internetAddresses && user.internetAddresses[0] ? user.internetAddresses[0].id : "N/A";
                const spamScore = user.score ? user.score.spamScore : 0;
                const userType = user.access == "PUBLIC" ? "Public" : "Private";

                let replyText = `📞 *TRUECALLER RESULT* 📞\n\n`;
                replyText += `👤 *Name:* ${name}\n`;
                replyText += `📱 *Number:* ${phoneNumber}\n`;
                replyText += `🏢 *Carrier:* ${carrier}\n`;
                replyText += `🔒 *Profile:* ${userType}\n`;
                
                if (email !== "N/A") replyText += `📧 *Email:* ${email}\n`;
                if (spamScore > 0) replyText += `🚨 *Spam Score:* ${spamScore}%\n`;

                await sock.sendMessage(from, { text: replyText }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { text: "❌ No details found for this number on Truecaller." }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(from, { text: "❌ Failed to fetch data from Truecaller API." }, { quoted: msg });
        }

    } catch (error) {
        console.error("Truecaller Error:", error);
        await sock.sendMessage(from, { 
            text: `❌ Error fetching details.\n\n⚠️ *Reason:* The Truecaller API might have blocked the dummy ID.\n_To fix this, run 'npx truecallerjs login' in Termux to generate your own ID._\n\n_Error: ${error.message}_` 
        }, { quoted: msg });
    }
}

module.exports = { handleTruecaller };

