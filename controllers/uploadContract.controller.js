const pinata = require("../config/pinata.config.js");

async function uploadContract(req, res) {
    try {
        // 1. Explicitly extract the fields sent from create.js
        const { contractText, privateVariables, metaIv } = req.body;

        if (!contractText) {
            return res.status(400).json({ error: "Missing contract text" });
        }

        console.log("🌨️ Uploading to Pinata Cloud...");
        
        // Debug Log: Confirm private variables are present
        if (privateVariables) {
            console.log("🔒 Private Variables detected & included.");
        }

        // 2. Create the exact payload structure
        const payload = {
            contractText: contractText,
            privateVariables: privateVariables || null, // Optional
            metaIv: metaIv || null,                     // Needed for decryption
            timestamp: new Date().toISOString()
        };

        // 3. Upload wrapped in 'content' key
        // This creates JSON structure: { "content": { "contractText": "...", ... } }
        // Matching your frontend: json.content.contractText
        const upload = await pinata.upload.public.json({ content: payload });
        
        const rawCID = upload.cid;

        console.log("📍 IPFS CID: ", rawCID);

        res.status(200).json({ success: true, cid: rawCID });
    } catch (err) {
        console.error("IPFS Upload Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
}

module.exports = uploadContract;