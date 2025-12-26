import { deriveKeyFromSeed, decryptFile } from "./crypto.js";
import { ABI } from "./ffp-abi.js";

const CONTRACT_ADDRESS = "0x98FB4c8963edAccA8e83a82C157797a4305455Ab";
const ZAMA_CONFIG = {
    aclContractAddress: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
    kmsContractAddress: "0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A",
    inputVerifierContractAddress: "0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0",
    verifyingContractAddressDecryption: "0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478",
    verifyingContractAddressInputVerification: "0x483b9dE06E4E4C7D35CCf5837A1668487406D955",
    chainId: 11155111,
    gatewayChainId: 10901,
    relayerUrl: "https://relayer.testnet.zama.org"
};

let contract, signer, userAddress, currentCID, instance;
let projectData = {}; 
let milestoneCache = []; 

async function init() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        currentCID = urlParams.get('cid');
        if (!currentCID) throw new Error("Missing CID in URL");

        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        document.getElementById("sidebar-wallet").innerText = userAddress.slice(0, 6) + "...";

        // Initialize Editor (Read-Only)
        tinymce.init({
            selector: '#contract-editor',
            height: 1100,
            menubar: false,
            toolbar: false,
            statusbar: false,
            readonly: true,
            content_style: "body { font-family: 'Times New Roman', serif; padding: 60px; line-height: 1.6; }"
        });

        // Initialize Zama SDK
        const Zama = window.relayerSDK;
        await Zama.initSDK();
        instance = await Zama.createInstance({ ...ZAMA_CONFIG, network: window.ethereum });

        // Step 1: Fetch Contract Data & Milestones
        await fetchContractData();

        // Step 2: Setup Role UI
        setupRoleUI();

        // Step 3: Attach Decryption Listener
        const btn = document.getElementById("btn-decrypt");
        if(btn) btn.onclick = loadAndDecrypt;
        
        // Auto-load logic (optional, currently manual button press)
        // loadAndDecrypt();

        // Step 4: Sign Button Listener
        const signBtn = document.getElementById("signBtn");
        if(signBtn) signBtn.onclick = () => manageTransaction(contract.signAgreement(currentCID), "Agreement Signed.");

    } catch (err) {
        console.error("Initialization Failed:", err);
        alert("System Error: " + err.message);
    }
}

async function fetchContractData() {
    // 1. Get Agreement Details
    const ag = await contract.ffpAgreements(currentCID);
    console.log("Agreement Data:", ag);
    
    projectData = {
        eSeed: ag[0], 
        ipfsCID: ag[1],
        iv: ag[2],
        isSigned: ag[3],
        eTotalBudget: ag[4],
        client: ag[5], 
        vendor: ag[6]
    };

    const count = await contract.getMilestoneCount(currentCID);
    const listContainer = document.getElementById("milestone-list-container");
    
    if(count > 0) listContainer.innerHTML = "";
    else listContainer.innerHTML = "<div style='text-align:center; padding:20px; color:#999;'>No milestones found.</div>";

    milestoneCache = [];

    for(let i=0; i<count; i++){
        const m = await contract.getMilestone(currentCID, i);
        milestoneCache.push({
            index: i, 
            desc: m[0], 
            amountHandle: m[1], 
            deadline: m[2], 
            penaltyHandle: m[3], 
            status: Number(m[4]) // 0: Pending, 1: Completed, 2: Paid
        });

        // Render Initial Encrypted State
        renderMilestoneItem(milestoneCache[i], null, null);
    }
}

function setupRoleUI() {
    const badge = document.getElementById("role-badge");
    const isClient = userAddress.toLowerCase() === projectData.client.toLowerCase();
    const isVendor = userAddress.toLowerCase() === projectData.vendor.toLowerCase();

    if (isClient) {
        badge.innerText = "ACCESS: CLIENT (EMPLOYER)";
    } else if (isVendor) {
        badge.innerText = "ACCESS: VENDOR (EMPLOYEE)";
        if (!projectData.isSigned) {
            document.getElementById("section-sign").style.display = "block";
        }
    } else {
        badge.innerText = "OBSERVER MODE";
    }
}

async function loadAndDecrypt() {
    try {
        const btn = document.getElementById("btn-decrypt");
        btn.innerText = "Decrypting...";
        btn.disabled = true;

        const keypair = instance.generateKeypair();
        
        // 1. Build Handle Array for Batch Decryption
        let handles = [
            { handle: projectData.eSeed, contractAddress: CONTRACT_ADDRESS },
            { handle: projectData.eTotalBudget, contractAddress: CONTRACT_ADDRESS }
        ];

        milestoneCache.forEach(m => {
            handles.push({ handle: m.amountHandle, contractAddress: CONTRACT_ADDRESS });
            handles.push({ handle: m.penaltyHandle, contractAddress: CONTRACT_ADDRESS });
        });

        // 2. Sign Request
        const startTime = Math.floor(Date.now() / 1000).toString();
        const eip712 = instance.createEIP712(keypair.publicKey, [CONTRACT_ADDRESS], startTime, '10');
        const signature = await signer.signTypedData(eip712.domain, { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification }, eip712.message);

        // 3. Decrypt
        const decrypted = await instance.userDecrypt(handles, keypair.privateKey, keypair.publicKey, signature.replace("0x", ""), [CONTRACT_ADDRESS], userAddress, startTime, '10');

        // 4. Update Global Financials
        const seedVal = decrypted[projectData.eSeed];
        const totalBudgetVal = decrypted[projectData.eTotalBudget];
        
        document.getElementById("total-budget-display").innerHTML = `<span style="color:var(--success);">$${totalBudgetVal}</span>`;
        document.getElementById("locker").style.display = "none";

        // 5. Re-render Milestones with Decrypted Data
        const listContainer = document.getElementById("milestone-list-container");
        listContainer.innerHTML = ""; // Reset list

        milestoneCache.forEach(m => {
            const amt = decrypted[m.amountHandle];
            const pnl = decrypted[m.penaltyHandle];
            renderMilestoneItem(m, amt, pnl);
        });

        // 6. Decrypt and Render Contract Text
        console.log("Fetching IPFS...");
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${currentCID}`);
        const json = await res.json();
        const aesKey = await deriveKeyFromSeed(seedVal);

        // --- SPLIT IV LOGIC ---
        const combinedIv = projectData.iv;
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

        // --- INJECT FHE VARIABLES ---
        const vars = {
            "CLIENT_WALLET": projectData.client,
            "VENDOR_WALLET": projectData.vendor,
            "TOTAL_BUDGET": totalBudgetVal,
            "IPFS_CID": currentCID
        };

        Object.keys(vars).forEach(k => finalDoc = finalDoc.replace(new RegExp(`{{${k}}}`, 'g'), vars[k]));

        tinymce.get("contract-editor").setContent(finalDoc);

    } catch (e) {
        console.error("Decryption Error:", e);
        document.getElementById("lock-msg").innerText = "Authorization Failed.";
        document.getElementById("btn-decrypt").innerText = "Retry Access";
        document.getElementById("btn-decrypt").disabled = false;
        alert("Decryption Failed: " + (e.reason || e.message));
    }
}

function renderMilestoneItem(m, decryptedAmt, decryptedPnl) {
    const list = document.getElementById("milestone-list-container");
    
    // 1. Data Formatting
    const deadlineDate = new Date(Number(m.deadline) * 1000);
    const dateStr = deadlineDate.toLocaleDateString(undefined, { 
        year: 'numeric', month: 'short', day: 'numeric' 
    });
    const isOverdue = Date.now() > deadlineDate.getTime();

    // 2. Status Dot Logic
    let tooltipText = "Pending";
    let dotClass = "dot-pending";

    if (m.status === 1) { 
        tooltipText = "Completed - Waiting Approval"; 
        dotClass = "dot-completed"; 
    }
    if (m.status === 2) { 
        tooltipText = "Paid & Closed"; 
        dotClass = "dot-paid"; 
    }

    // 3. Values (Blur vs Clear)
    const valAmount = decryptedAmt !== null ? `$${decryptedAmt}` : `<span class="val-blur">$XXXX</span>`;
    const valPenalty = decryptedPnl !== null ? `${decryptedPnl}%` : `<span class="val-blur">XX%</span>`;

    // 4. Buttons
    let actionBtn = "";
    const isClient = userAddress.toLowerCase() === projectData.client.toLowerCase();
    const isVendor = userAddress.toLowerCase() === projectData.vendor.toLowerCase();

    if (isVendor && m.status === 0) {
        actionBtn = `<button class="btn btn-primary" onclick="window.triggerAction('complete', ${m.index})">Mark as Completed</button>`;
    } else if (isClient && m.status === 1) {
        actionBtn = `<button class="btn btn-primary" style="background:#27ae60;" onclick="window.triggerAction('approve', ${m.index})">Approve Payment</button>`;
    } else if (isClient && m.status === 0 && isOverdue) {
        actionBtn = `<button class="btn btn-outline-danger" onclick="window.triggerAction('penalize', ${m.index})">Apply Penalty</button>`;
    }

    // 5. HTML Injection
    const html = `
        <div class="milestone-card">
            <div class="status-dot ${dotClass}" data-tooltip="${tooltipText}"></div>
            <div class="ms-desc">${m.desc}</div>
            <div class="ms-details">
                <div class="ms-row">
                    <span class="ms-label">Amount</span>
                    <span class="ms-val">${valAmount}</span>
                </div>
                <div class="ms-row">
                    <span class="ms-label">Penalty (max)</span>
                    <span class="ms-val val-penalty">${valPenalty}</span>
                </div>
                <div class="ms-row">
                    <span class="ms-label">Deadline</span>
                    <span class="ms-val">${dateStr}</span>
                </div>
            </div>
            ${actionBtn ? `<div>${actionBtn}</div>` : ''}
        </div>
    `;
    
    list.insertAdjacentHTML('beforeend', html);
}

// Global Window Function for Dynamic Buttons
window.triggerAction = async (action, index) => {
    if (action === 'complete') {
        await manageTransaction(contract.completeMilestone(index, currentCID), "Milestone Marked Completed.");
    } else if (action === 'approve') {
        await manageTransaction(contract.approveMileStone(index, currentCID), "Milestone Approved & Paid.");
    } else if (action === 'penalize') {
        await manageTransaction(contract.penalize(index, currentCID), "Penalty Applied.");
    }
};

async function manageTransaction(txPromise, successMsg) {
    try {
        document.body.style.cursor = 'wait';
        const tx = await txPromise;
        console.log("Tx Sent:", tx.hash);
        
        const receipt = await tx.wait(); 
        if (receipt.status === 1) {
            alert(successMsg);
            location.reload();
        } else {
            throw new Error("Transaction reverted on-chain.");
        }
    } catch (err) {
        console.error("Transaction Error:", err);
        alert("Execution Error: " + (err.reason || err.message));
    } finally {
        document.body.style.cursor = 'default';
    }
}

init();