import { deriveKeyFromSeed, decryptFile } from "https://contracks.vercel.app/crypto.js";
import { ABI } from "https://contracks.vercel.app/performance-abi.js";

const CONTRACT_ADDRESS = "0x95E96dC42Dd16788ab9D3d1FF941498D8b5B4B21";
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

        // Initialize Premium Editor
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

        // Step 1: Detect Role and Set UI
        const job = await contract.performanceAgreements(currentCID);
        await setupRoleUI(job);

        // Step 2: Decrypt and Render
        await loadAndDecrypt(job);

        // Step 3: Attach Listeners
        attachEventListeners();

    } catch (err) {
        console.error("Initialization Failed:", err);
        alert("System Error: " + err.message);
    }
}

async function setupRoleUI(job) {
    const badge = document.getElementById("role-badge");
    const isEmployer = userAddress.toLowerCase() === job.employer.toLowerCase();
    const isEmployee = userAddress.toLowerCase() === job.employee.toLowerCase();

    if (isEmployer) {
        badge.innerText = "Authorized: Employer Account";
        document.getElementById("employer-ui").style.display = "block";
    } else if (isEmployee) {
        badge.innerText = "Authorized: Employee Account";
        document.getElementById("employee-ui").style.display = "block";
        if (job.isSigned) document.getElementById("section-sign").style.display = "none";
    } else {
        badge.innerText = "Observer Mode: Limited Access";
    }
}

async function loadAndDecrypt(job) {
    try {
        const keypair = instance.generateKeypair();
        const handles = [
            { handle: job.seed, contractAddress: CONTRACT_ADDRESS },
            { handle: job.target, contractAddress: CONTRACT_ADDRESS },
            { handle: job.bonus, contractAddress: CONTRACT_ADDRESS },
            { handle: job.actualPerformance, contractAddress: CONTRACT_ADDRESS },
            { handle: job.employerSatisfied, contractAddress: CONTRACT_ADDRESS },
            { handle: job.isFinalized, contractAddress: CONTRACT_ADDRESS },
            { handle: job.finalPayout, contractAddress: CONTRACT_ADDRESS }
        ];

        const startTime = Math.floor(Date.now() / 1000).toString();
        const eip712 = instance.createEIP712(keypair.publicKey, [CONTRACT_ADDRESS], startTime, '10');
        const signature = await signer.signTypedData(eip712.domain, { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification }, eip712.message);

        const decrypted = await instance.userDecrypt(handles, keypair.privateKey, keypair.publicKey, signature.replace("0x", ""), [CONTRACT_ADDRESS], userAddress, startTime, '10');

        // Logic Rendering
        document.getElementById("stat-satisfied").innerText = decrypted[job.employerSatisfied] ? "Satisfied" : "Pending";
        document.getElementById("stat-finalized").innerText = decrypted[job.isFinalized] ? "Target Met" : "Evaluating";
        document.getElementById("payout-val").innerText = `$${decrypted[job.finalPayout]}`;

        // --- IPFS & DECRYPTION LOGIC START ---
        
        // 1. Fetch IPFS Data
        const res = await fetch(`https://gateway.pinata.cloud/ipfs/${currentCID}`);
        const json = await res.json();
        const aesKey = await deriveKeyFromSeed(decrypted[job.seed]);

        // 2. Handle Split IV (Content IV :: Meta IV)
        const combinedIv = job.iv;
        const [contentIv, metaIv] = combinedIv.includes("::") ? combinedIv.split("::") : [combinedIv, null];

        // 3. Decrypt Main Content
        let finalDoc = await decryptFile(json.content.contractText, aesKey, contentIv);

        // 4. Decrypt & Inject Private Variables (If present)
        if (json.content.privateVariables && metaIv) {
            try {
                const metaJson = await decryptFile(json.content.privateVariables, aesKey, metaIv);
                const privateVars = JSON.parse(metaJson);
                
                for (const [key, val] of Object.entries(privateVars)) {
                    // Replace [[VAR]] with actual value
                    finalDoc = finalDoc.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), val);
                }
            } catch (err) {
                console.warn("Private var decryption skipped:", err);
            }
        }

        // 5. Inject FHE Variables (Compulsory)
        const vars = {
            "EMPLOYEE_WALLET": job.employee,
            "EMPLOYER_WALLET": job.employer,
            "TARGET": decrypted[job.target],
            "BONUS": decrypted[job.bonus],
            "DEADLINE_DATE": new Date(Number(job.deadline) * 1000).toLocaleString()
        };

        Object.keys(vars).forEach(k => finalDoc = finalDoc.replace(new RegExp(`{{${k}}}`, 'g'), vars[k]));

        // --- DECRYPTION LOGIC END ---

        tinymce.get("contract-editor").setContent(finalDoc);
        document.getElementById("locker").style.display = "none";
        
        const targetDisp = document.querySelector('.target-display');
        if(targetDisp) targetDisp.value = "Target Achieved: " + decrypted[job.actualPerformance];

    } catch (e) {
        console.error("Decryption Error:", e);
        document.getElementById("lock-msg").innerText = "Authorization Denied. KMS block enforced.";
    }
}

async function manageTransaction(txPromise, successMsg) {
    try {
        document.body.style.cursor = 'wait';
        const tx = await txPromise;
        console.log("Tx Sent:", tx.hash);
        
        const receipt = await tx.wait(); // Wait for block confirmation
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

function attachEventListeners() {
    // EMPLOYER ACTIONS
    const btnTrue = document.getElementById("btnSatisfyTrue");
    const btnFalse = document.getElementById("btnSatisfyFalse");
    if (btnTrue) btnTrue.onclick = () => submitVerdict(true);
    if (btnFalse) btnFalse.onclick = () => submitVerdict(false);

    // EMPLOYEE ACTIONS
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) submitBtn.onclick = async () => {
        const val = document.getElementById("performanceInput").value;
        if (!val) return alert("Enter units achieved.");
        
        const input = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
        input.add128(BigInt(val)); // Match euint128
        const encrypted = await input.encrypt();
        
        await manageTransaction(
            contract.submitPerformance(currentCID, encrypted.handles[0], encrypted.inputProof),
            "Metrics encrypted and stored on registry."
        );
    };

    const signBtn = document.getElementById("signBtn");
    if (signBtn) signBtn.onclick = () => manageTransaction(contract.signAgreement(currentCID), "Contract Activated.");

    // GLOBAL ACTIONS
    const calcBtn = document.getElementById("calcBtn");
    if (calcBtn) calcBtn.onclick = () => manageTransaction(contract.calculatePayout(currentCID), "On-chain logic finalized.");
}
async function submitVerdict(val) {
    const input = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
    input.addBool(val);
    const encrypted = await input.encrypt();

      try {
        document.body.style.cursor = 'wait';
        const tx = await contract.employerSatisfaction(currentCID, encrypted.handles[0], encrypted.inputProof);
        console.log("Tx Sent:", tx.hash);
        
        const receipt = await tx.wait(); 
        if (receipt.status === 1) {
            alert("Satisfaction flag updated.");
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
