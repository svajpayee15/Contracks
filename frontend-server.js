require("dotenv").config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const { connectDB } = require("./database/db.js");
const userSchema = require("./database/models/user.schema.js");
const authenticate = require("./middleware/authenticate.middleware.js")
const agreementSchema = require("./database/models/agreement.schema.js");


app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// 3. Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Serve Static Files (Frontend)
app.use(express.static(path.join(__dirname, '../../'))); 

// --- ROUTES: PAGES ---

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../../') + "/frontend/landingpage.html");
});
app.get("/login", (req, res) => {
    // If already logged in, go to create
    if (req.cookies.token) return res.redirect('/create');
    res.sendFile(path.join(__dirname, '../../') + "login.html");
});

app.get("/create", authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../../') + "create.html");
});

app.get("/inbox", authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../../') + "inbox.html");
});

app.get("/summarize", authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../../') + "summarize.html");
});

app.get("/view/salary",authenticate,(req,res)=>{
    res.sendFile(path.join(__dirname, '../../') + "view-salary.html");
})

app.get("/view/performance",authenticate,(req,res)=>{
    res.sendFile(path.join(__dirname, '../../') + "view-performance.html");
})

app.get("/view/ffp",authenticate,(req,res)=>{
    res.sendFile(path.join(__dirname, '../../') + "view-ffp.html");
})
app.get("/view/voting",authenticate,(req,res)=>{
    res.sendFile(path.join(__dirname, '../../') + "view-boardVoting.html");
})

// --- ROUTES: API ---

// 1. Login / Register
app.post("/login", async (req, res) => {
    try {
        const { walletAddress, name } = req.body;

        // Find or Create User
        let user = await userSchema.findOne({ walletAddress });
        if (!user) {
            user = await userSchema.create({ walletAddress, name });
        }

        // Generate Token
        const token = jwt.sign(
            { walletAddress, name: user.name }, 
            process.env.JWT_SECRETKEY,
            { expiresIn: "7d" }
        );

        // Send Cookie (HttpOnly is safer)
        res.cookie("token", token) 
           .status(200)
           .json({ success: true, user });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Login failed" });
    }
});

// 2. Save Agreement (After Blockchain Tx)
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

app.put('/api/sign-agreement',async(req,res)=>{
    try{
        const { ipfsCID, address } = req.body

        if(!ipfsCID) return res.status(400).json({ message: "CID is required"})
        
        const updated = await salaryAgreementSchema.findOneAndUpdate(
            { ipfsCID },
            { $set: {  [`status.${address}`]: true }},
            { new:true }
        )

        if(!updated) return res.status(404).json({ message: "Contract not found"})
            
        console.log("✍️ Database Synced: Contract Signed", ipfsCID);
        res.json({ success: true, status: updated.status.address });
    }
    catch(err){
        console.error("Signing Status Update error \n",err)
        res.status(500).json({ message: err})
    }
})

// --- START SERVER ---
app.listen(4000, () => {
    console.log('✅ Server running at http://localhost:4000');
    console.log('🛡️  Security headers active.');
});