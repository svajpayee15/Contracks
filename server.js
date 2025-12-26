require('dotenv').config();
const express = require("express");
const path = require('path');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { GoogleGenAI } = require("@google/genai");

// --- DATABASE & MODELS ---
const mongoose = require("mongoose");
const userSchema = require("./database/models/user.schema.js");
const agreementSchema = require("./database/models/agreement.schema.js");

// --- MIDDLEWARE & ROUTES ---
const authenticate = require("./middleware/authenticate.middleware.js");
const uploadContract = require("./routes/uploadContract.route.js");

// --- CONFIGURATION ---
const app = express();
const PORT = process.env.PORT || 3000; // Changed for Vercel
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- DEFINE PATHS ---
// This points to the "public" folder at the root of your project
const publicPath = path.join(__dirname, './public');

// --- INITIALIZE DB ---
const mongoURI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('✅MongoDB connected successfully!');
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1); 
  }
};
connectDB()
// --- GLOBAL MIDDLEWARE ---
app.use((req, res, next) => {
    // Security headers for SharedArrayBuffer (Zama requirement)
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

app.use(cors());
app.use(cookieParser());
app.use(express.json());

// ✅ FIX 1: Serve Static Files from "public" folder
app.use(express.static(publicPath));

// ==================================================================
//  1. PAGE ROUTES (HTML)
//  (Assumes all your .html files are now inside the 'public' folder)
// ==================================================================

app.get("/", (req, res) => {
    res.sendFile(path.join(publicPath, "landingpage.html"));
});

app.get("/login", (req, res) => {
    if (req.cookies.token) return res.redirect('/create');
    res.sendFile(path.join(publicPath, "login.html"));
});

app.get("/create", authenticate, (req, res) => {
    res.sendFile(path.join(publicPath, "create.html"));
});

app.get("/inbox", authenticate, (req, res) => {
    res.sendFile(path.join(publicPath, "inbox.html"));
});

app.get("/summarize", authenticate, (req, res) => {
    res.sendFile(path.join(publicPath, "summarize.html"));
});

// Viewers
app.get("/view/salary", authenticate, (req, res) => {
    res.sendFile(path.join(publicPath, "view-salary.html"));
});
app.get("/view/performance", authenticate, (req, res) => {
    res.sendFile(path.join(publicPath, "view-performance.html"));
});
app.get("/view/ffp", authenticate, (req, res) => {
    res.sendFile(path.join(publicPath, "view-ffp.html"));
});
app.get("/view/voting", authenticate, (req, res) => {
    res.sendFile(path.join(publicPath, "view-boardVoting.html"));
});
app.get("/view/plain", authenticate, (req, res) => {
    res.sendFile(path.join(publicPath, "view-plain.html"));
});


// ==================================================================
//  2. API ROUTES
// ==================================================================

// --- A. Upload Logic (IPFS) ---
app.use("/api", uploadContract);

// --- B. AI Analysis (Gemini) ---
app.post('/api/analyze', async (req, res) => {
    const { text, docType, query } = req.body;

    if (!text) return res.status(400).send("No content provided.");

    try {
       const systemPrompt = `
            ROLE:
            You are the "Contracks AI Assistant," a high-end legal auditor integrated into a privacy-preserving contract management platform.
            Your goal is to help users understand their ${docType} agreements quickly and accurately.

            TECHNICAL CONTEXT (FHE Privacy):
            - This app uses Fully Homomorphic Encryption (FHE).
            - Sensitive data (like exact salary, budget, or penalties) are replaced by encrypted placeholders in the source text (e.g., [SECRET_VAR_1]).
            - If you see these placeholders, explain what they represent based on context, but do NOT try to guess the hidden values.

            CONSTRAINTS:
            - Answer in "Contracks Style": Professional, helpful, and very SHORT.
            - Format your response using clean HTML.
            - Use <strong> tags for emphasis and <span style="color: #E89134;"> for key legal terms or risks.
            - Do not use <html>, <body>, or high-fi CSS. Use simple inline styles if needed.

            TASK:
            User Query: "${query || 'Provide a general summary'}"
            Agreement Text: ${text}

            RESPONSE STRUCTURE (if no specific query):
            1. <strong>Quick Summary:</strong> (Max 2 sentences)
            2. <strong>Key Clauses:</strong> (Bullet points with color formatting)
            3. <strong>Risk Audit:</strong> (Highlight 3 potential risks in <span style="color: #e53e3e;">red</span>)
        `;
        const response = await ai.models.generateContent({ model: "gemini-2.0-flash", contents: systemPrompt });

        res.json({ answer: response.text() });
    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "AI analysis failed." });
    }
});

// --- C. Auth (Login) ---
app.post("/login", async (req, res) => {
    try {
        const { walletAddress, name } = req.body;
        console.log(walletAddress,name)

        if(!name) name = "user"

        let user = await userSchema.findOne({ walletAddress });
        if (!user) {
            user = await userSchema.create({ walletAddress, name });
        }

        const token = jwt.sign(
            { walletAddress, name: user.name },
            process.env.JWT_SECRETKEY,
            { expiresIn: "7d" }
        );

        res.cookie("token", token)
           .status(200)
           .json({ success: true, user });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Login failed" });
    }
});

// --- D. Agreement Management ---

// Save Agreement Metadata
app.post("/api/save-agreement", authenticate, async (req, res) => {
    try {
        const { ipfsCID, sender, receiver, type } = req.body;

        const statusObject = {}
        receiver.forEach(address => {
            statusObject[address] = false
        });

        const agreement = await agreementSchema.create({
            ipfsCID,
            sender,
            receiver,
            typeOfAgreement: type,
            status: statusObject
        });

        res.status(201).json({ success: true, content: agreement });
    } catch (err) {
        console.error("Save Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Fetch Inbox
app.get('/api/inbox/:address', authenticate, async (req, res) => {
    try {
        const { address } = req.params;
        const agreements = await agreementSchema.find({ receiver: { $in: [address]} })
                                                .sort({ createdAt: -1 });
        res.json({ success: true, data: agreements });
    } catch (error) {
        res.status(500).json({ error });
    }
});

// Fetch Sent Items
app.get('/api/sent/:address', authenticate, async (req, res) => {
    try {
        const { address } = req.params;
        const agreements = await agreementSchema.find({ sender: address })
                                                .sort({ createdAt: -1 });
        res.json({ success: true, data: agreements });
    } catch (error) {
        res.status(500).json({ error: "Sent Box Fetch Failed" });
    }
});

// Update Sign Status
app.put('/api/sign-agreement', async(req, res) => {
    try {
        const { ipfsCID, address } = req.body;

        if(!ipfsCID) return res.status(400).json({ message: "CID is required"});

        const updated = await agreementSchema.findOneAndUpdate(
            { ipfsCID },
            { $set: { [`status.${address}`]: true }},
            { new: true }
        );

        if(!updated) return res.status(404).json({ message: "Contract not found"});

        console.log("✍️ Database Synced: Contract Signed", ipfsCID);
        res.json({ success: true, status: updated.status });
    }
    catch(err){
        console.error("Signing Status Update error \n", err);
        res.status(500).json({ message: err });
    }
});

// ==================================================================
//  START SERVER (Vercel Compatible)
// ==================================================================

// Export the app for Vercel
module.exports = app;

// Only start the server if running locally (not in Vercel)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`✅ Server running at http://localhost:${PORT}`);
        console.log('🛡️  Security headers active.');
    });
}
