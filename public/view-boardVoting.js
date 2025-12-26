import { ABI } from "./boardVoting-abi.js"
import { deriveKeyFromSeed, decryptFile } from "./crypto.js";
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { ui } from "./ui-utils.js";

// ✅ YOUR CONFIGS
const CONTRACT_ADDRESS = "0x093Ce64c121d51FC03d71C25B715E7C1E4374C53"; 

const ZAMA_CONFIG = {
      aclContractAddress: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
      kmsContractAddress: "0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A",
      inputVerifierContractAddress: "0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0",
      verifyingContractAddressDecryption: "0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478",
      verifyingContractAddressInputVerification: "0x483b9dE06E4E4C7D35CCf5837A1668487406D955",
      chainId: 11155111,
      gatewayChainId: 10901,
      network: window.ethereum,
      relayerUrl: "https://relayer.testnet.zama.org",
};

let contract, signer, userAddress, currentCID, instance;
let voteData = {};

async function init() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        currentCID = urlParams.get('cid');
        if (!currentCID) throw new Error("No CID provided in URL");

        // 1. Setup Web3
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        document.getElementById("sidebar-wallet").innerText = userAddress.slice(0,6)+"..."+userAddress.slice(-4);

        // 2. Setup TinyMCE
        tinymce.init({ 
            selector: '#contract-editor', 
            readonly: true, 
            menubar: false, 
            toolbar: false, 
            height: '100%',
            content_style: "body { font-family: 'DM Sans', sans-serif; padding: 20px; color: #333; }" 
        });

        // 3. Setup Zama
        const Zama = window.relayerSDK;
        await Zama.initSDK();
        instance = await Zama.createInstance(ZAMA_CONFIG);

        // 4. Load Data
        await fetchSessionData();

        // 5. Attach Listeners
        document.getElementById("btn-decrypt").onclick = loadDoc;
        document.getElementById("finalizeBtn").onclick = finalizeSession;

    } catch (e) {
        console.error("Init failed:", e);
        alert("System Error: " + e.message);
    }
}

async function fetchSessionData() {
    // 1. Fetch Contract State
    const v = await contract.votingAgreements(currentCID);
    
    voteData = {
        admin: v[0],
        iv: v[2],
        deadline: Number(v[3]),
        seed: v[4], 
        totalPossible: Number(v[6]),
        isDecryptionRequested: v[7],
        isFinalized: v[8]
    };

    // 2. Deadline & Status Logic
    const deadlineDate = new Date(voteData.deadline * 1000);
    document.getElementById("deadline-display").innerText = deadlineDate.toLocaleDateString();
    
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now > voteData.deadline;

    if (voteData.isFinalized) {
        document.getElementById("status-dot").className = "status-dot dot-closed";
        document.getElementById("timer-display").innerText = "Result Finalized";
        document.getElementById("timer-display").style.color = "var(--text-main)";
    } else if (isExpired) {
        document.getElementById("status-dot").className = "status-dot dot-closed";
        document.getElementById("timer-display").innerText = "Session Closed";
        document.getElementById("timer-display").style.color = "var(--danger)";
    }

    // 3. User Role Logic
    const status = await contract.getVoterStatus(currentCID, userAddress);
    const isWhitelisted = status[0];
    const weight = Number(status[1]);
    const hasVoted = status[2];
    
    const badge = document.getElementById("role-badge");
    const isAdmin = userAddress.toLowerCase() === voteData.admin.toLowerCase();

    // --- BADGE LOGIC ---
    if (isAdmin) {
        badge.innerText = "ADMIN (CHAIRPERSON)";
        badge.style.background = "#333";
        badge.style.color = "#fff";
    } else if (isWhitelisted) {
        badge.innerText = "ACCESS: BOARD MEMBER";
    } else {
        badge.innerText = "OBSERVER";
    }

    // --- RENDER SECTIONS ---

    // 1. Result Section (Highest Priority)
    if (voteData.isFinalized) {
        document.getElementById("voting-section").style.display = "none";
        document.getElementById("admin-section").style.display = "none";
        document.getElementById("result-section").style.display = "block";

        const filter = contract.filters.statusFinalized(currentCID);
        const events = await contract.queryFilter(filter);
        
        if (events.length > 0) {
            const passed = events[0].args[1]; 
            
            if (passed) {
                document.getElementById("percent-display").innerText = "APPROVED";
                document.getElementById("percent-display").style.color = "var(--success)";
                document.getElementById("result-bar").style.width = "100%";
                document.getElementById("result-bar").style.background = "var(--success)";
            } else {
                document.getElementById("percent-display").innerText = "REJECTED";
                document.getElementById("percent-display").style.color = "var(--danger)";
                document.getElementById("result-bar").style.width = "100%";
                document.getElementById("result-bar").style.background = "var(--danger)";
            }
            document.getElementById("yes-votes-display").innerText = "Vote Count Hidden";
        }
        return; // Stop rendering other sections if finalized
    }

    // 2. Voting Interface (For Whitelisted Members AND Admins if whitelisted)
    if (isWhitelisted && !isExpired) {
        document.getElementById("voting-section").style.display = "block";
        document.getElementById("user-weight").innerText = weight;

        if (hasVoted) {
            document.getElementById("voting-section").innerHTML = `
                <div class="panel-section">
                    <h3 class="section-title">Status</h3>
                    <div class="control-card" style="text-align:center; color:var(--success); font-weight:bold;">
                        <span class="material-symbols-outlined" style="font-size:32px; display:block; margin-bottom:5px;">check_circle</span>
                        Vote Encrypted & Submitted
                    </div>
                </div>`;
        }
    }

    // 3. Admin Controls (Always visible to Admin if not finalized)
    if (isAdmin) {
        document.getElementById("admin-section").style.display = "block";
        const btn = document.getElementById("finalizeBtn");

        if (!isExpired) {
            // Case A: Voting still active -> Disable button
            btn.innerText = "Voting In Progress...";
            btn.disabled = true;
            btn.style.opacity = "0.5";
            btn.style.cursor = "not-allowed";
            btn.style.backgroundColor = "#999"; 
        } else {
            // Case B: Deadline Passed -> Enable button
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
            btn.style.backgroundColor = "#333";
            btn.innerText = "Finalize & Decrypt Results";
        }
    }
}

// Global function for HTML buttons
window.handleVote = async (choice) => {
    try {
        if(!confirm(`Confirm vote: ${choice ? 'YES' : 'NO'}?`)) return;
        
        document.body.style.cursor = "wait";
        
        console.log("🔒 Encrypting Vote...");
        // Use createEncryptedInput for robust boolean encryption
        const input = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
        input.addBool(choice);
        const ciphertexts = await input.encrypt();

        console.log("🚀 Sending Transaction...");
        const tx = await contract.castVote(
            currentCID,
            ciphertexts.handles[0], 
            ciphertexts.inputProof
        );
        await tx.wait();
        
        alert("Vote Cast Successfully!");
        location.reload();
    } catch(e) {
        console.error(e);
        alert("Voting Failed: " + (e.reason || e.message));
    } finally {
        document.body.style.cursor = "default";
    }
};

async function finalizeSession() {
    const btn = document.getElementById("finalizeBtn");
    btn.disabled = true;

    try {
        // 1. Check if we need to request decryption on-chain
        if (!voteData.isDecryptionRequested) {
            ui.showLoader("Requesting Finalization", "Confirm transaction in MetaMask");
            btn.innerText = "1/3 Requesting...";
            const tx = await contract.finalizeVoting(currentCID);
            ui.showLoader("Waiting for Block", "Transaction sent...");
            await tx.wait();
            // Wait 5 seconds for block propagation
            await new Promise(r => setTimeout(r, 5000));
        }

        ui.showLoader("Publicly Decrypting the Variable", "Reading Events Log...");
        btn.innerText = "2/3 Decrypting (Please Wait)...";

        // 2. Fetch the Handle from Event
        const filter = contract.filters.requestVotingResult(currentCID);
        const events = await contract.queryFilter(filter, 0, "latest");
        if(events.length === 0) throw new Error("Event not found yet. Blockchain lagging?");

        // Get Handle
        ui.showLoader("Extracted eVariable Handle", ".....");
        const event = events[events.length - 1];
        const isPassedHandle = String(event.args[1]); // Ensure String

        // 3. RETRY LOGIC for Relayer
        let results;
        let attempts = 0;
        const maxAttempts = 3;

        while(attempts < maxAttempts) {
            try {
                ui.showLoader("Publicly Decrypting eVariable", "Using RelayerSDK..");
                console.log(`Decryption attempt ${attempts + 1}/${maxAttempts}...`);
                results = await instance.publicDecrypt([isPassedHandle]);
                if (results) break; // Success
            } catch (err) {
                console.warn("Relayer busy, retrying in 3s...", err);
                attempts++;
                await new Promise(r => setTimeout(r, 3000));
            }
        }

        if (!results) throw new Error("Relayer failed after 3 attempts. Try again later.");
        console.log(results)
        // 4. Submit Proof
        ui.showLoader("Finalizing decryption Onchain", "Using Decryption Proof..");
        btn.innerText = "3/3 Finalizing...";
        const decryptedVal = results.clearValues[isPassedHandle];
        let proof = results.decryptionProof;
        if (!proof.startsWith("0x")) proof = "0x" + proof;

        ui.showLoader("Requesting Finalization", "Confirm transaction in MetaMask");
        const tx2 = await contract.completeFinalization(currentCID, decryptedVal, proof);
        await tx2.wait();

        ui.hideLoader();
        ui.showToast("Finalization Complete!", "success");

        alert("Success! Vote Finalized.");
        location.reload();

    } catch(e) {
        console.error(e);
        alert("Error: " + e.message);
        btn.disabled = false;
        btn.innerText = "Retry Finalization";
    }
}

async function loadDoc() {
    try {
        const btn = document.getElementById("btn-decrypt");
        btn.innerText = "Decrypting...";

        // 1. Fetch IPFS Data
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${currentCID}`);
        const json = await res.json();
        
        // 2. Authorize & Decrypt Seed
        const keypair = instance.generateKeypair();
        const startTime = Math.floor(Date.now()/1000).toString();
        const handle = { handle: voteData.seed, contractAddress: CONTRACT_ADDRESS };

        const eip712 = instance.createEIP712(keypair.publicKey, [CONTRACT_ADDRESS], startTime, '10');
        const signature = await signer.signTypedData(
            eip712.domain,
            { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
            eip712.message
        );

        const decrypted = await instance.userDecrypt(
            [handle], keypair.privateKey, keypair.publicKey, signature.replace("0x", ""), [CONTRACT_ADDRESS], userAddress, startTime, '10'
        );

        const seedVal = decrypted[voteData.seed];
        const aesKey = await deriveKeyFromSeed(seedVal);

        // --- SPLIT IV LOGIC ---
        const combinedIv = voteData.iv;
        const [contentIv, metaIv] = combinedIv.includes("::") ? combinedIv.split("::") : [combinedIv, null];

        // --- DECRYPT CONTENT ---
        let finalDoc = await decryptFile(json.content.contractText, aesKey, contentIv);

        // --- DECRYPT PRIVATE VARIABLES (If present) ---
        if (json.content.privateVariables && metaIv) {
            try {
                const metaJson = await decryptFile(json.content.privateVariables, aesKey, metaIv);
                const privateVars = JSON.parse(metaJson);
                
                // Inject Private Variables [[VAR]]
                for (const [key, val] of Object.entries(privateVars)) {
                    finalDoc = finalDoc.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), val);
                }
            } catch (err) {
                console.warn("Private var decryption skipped:", err);
            }
        }

        // --- INJECT FHE VARIABLES (Compulsory) ---
        const vars = {
            "ADMIN_WALLET": voteData.admin,
            "DEADLINE": new Date(voteData.deadline * 1000).toLocaleString(),
        };

        Object.keys(vars).forEach(k => finalDoc = finalDoc.replace(new RegExp(`{{${k}}}`, 'g'), vars[k]));

        tinymce.get("contract-editor").setContent(finalDoc);
        document.getElementById("locker").style.display = "none";

    } catch(e) {
        console.error(e);
        alert("Decryption Failed. Are you authorized?");
        document.getElementById("btn-decrypt").innerText = "Authorize Access";
    }
}

init();