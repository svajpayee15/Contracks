import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { deriveKeyFromSeed, decryptFile } from "https://contracks.vercel.app/crypto.js";
import { ABI } from "https://contracks.vercel.app/salary-abi.js";

const CONTRACT_ADDRESS = "0xC676216cE3236CADCc4F4f7673DF6ad45Fdf7B07";

const API_URL = "http://localhost:4000/api";

const uiLock = document.getElementById("locker");
const uiMsg = document.getElementById("lock-msg");
const signBtn = document.getElementById("signBtn");
const statusDisplay = document.getElementById("status-display");

let contract, signer, userAddress, currentCID;

async function init() {
    // 1. Extract CID
    const urlParams = new URLSearchParams(window.location.search);
    currentCID = urlParams.get('cid');
    if (!currentCID) return uiMsg.innerText = "Error: Missing CID in URL";

    // 2. Connect Wallet
    if (!window.ethereum) return alert("Install MetaMask");
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    // 3. Connect Contract
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    
    // 4. Update Sidebar Name
    const shortAddr = userAddress.substring(0, 6) + "..." + userAddress.slice(-4);
    if(document.querySelector(".name")) document.querySelector(".name").innerText = shortAddr;

    loadContract();
}

async function loadContract() {
    uiMsg.innerText = "Fetching blockchain data...";

    // 1. Fetch Contract Data
    const data = await contract.salaryAgreement(currentCID);
    
    if (data[0] === "0x0000000000000000000000000000000000000000") {
        return uiMsg.innerText = "Contract not found on blockchain.";
    }

    console.log("Chain Data:", data);

    const storedEmployee = data[1].toLowerCase(); 
    const storedEmployer = data[0].toLowerCase();
    const currentUser = userAddress.toLowerCase();
    
    // --- 1. HANDLE SPLIT IV ---
    const combinedIv = data[4];
    // If old contract uses single IV, this fallback prevents crash
    const [contentIv, metaIv] = combinedIv.includes("::") ? combinedIv.split("::") : [combinedIv, null];

    const seedHandle = data[5];
    const baseSalaryHandle = data[6];
    const joiningBonusHandle = data[7];
    const taxRateHandle = data[8];
    const incrementRateHandle = data[9];
    const isSigned = data[10]; 

    if (currentUser !== storedEmployee && currentUser !== storedEmployer) {
        uiMsg.innerText = "Error: Access Denied (Wallet Mismatch)";
        uiMsg.style.color = "red";
        return; 
    }

    updateStatus(isSigned);
    signBtn.disabled = true;
    if (isSigned) {
        signBtn.innerText = "Already Signed";
    } else {
        signBtn.innerText = "Read Only";
    }

    uiMsg.innerText = "Decrypting... (Please sign Zama request)";
    
    try {
        const Zama = window.relayerSDK;
        await Zama.initSDK();
        const instance = await Zama.createInstance({ 
            aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
            kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
            inputVerifierContractAddress: '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
            verifyingContractAddressDecryption: '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478',
            verifyingContractAddressInputVerification: '0x483b9dE06E4E4C7D35CCf5837A1668487406D955',
            chainId: 11155111,
            gatewayChainId: 10901,
            network: window.ethereum, 
            relayerUrl: 'https://relayer.testnet.zama.org'
        });

        const cleanUserAddr = userAddress;
        const keypair = instance.generateKeypair();

        // 2. Prepare Handles
        const handleContractPairs = [
            { handle: seedHandle, contractAddress: CONTRACT_ADDRESS },
            { handle: baseSalaryHandle, contractAddress: CONTRACT_ADDRESS },
            { handle: joiningBonusHandle, contractAddress: CONTRACT_ADDRESS },
            { handle: taxRateHandle, contractAddress: CONTRACT_ADDRESS },
            { handle: incrementRateHandle, contractAddress: CONTRACT_ADDRESS },
        ];

        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = '10';
        const contractAddresses = [CONTRACT_ADDRESS];

        const eip712 = instance.createEIP712(
            keypair.publicKey,
            contractAddresses,
            startTimeStamp,
            durationDays
        );

        const signature = await signer.signTypedData(
            eip712.domain,
            { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
            eip712.message
        );

        const result = await instance.userDecrypt(
            handleContractPairs,
            keypair.privateKey,
            keypair.publicKey,
            signature.replace("0x",""),
            contractAddresses,
            cleanUserAddr,
            startTimeStamp,
            durationDays
        );

        const seed = result[seedHandle];
        const baseSalary = result[baseSalaryHandle];
        const joiningBonus = result[joiningBonusHandle];
        const taxRate = result[taxRateHandle];
        const incrementRate = result[incrementRateHandle];
        
        if (!seed) throw new Error("Decryption returned null (Access Denied)");
        console.log("✅ Seed Decrypted");

        // 3. Fetch IPFS
        uiMsg.innerText = "Downloading from IPFS...";
        const ipfsRes = await fetch(`https://gateway.pinata.cloud/ipfs/${currentCID}`);
        const ipfsJson = await ipfsRes.json();

        // 4. Decrypt Content
        uiMsg.innerText = "Finalizing...";
        const aesKey = await deriveKeyFromSeed(seed);
        
        // Decrypt MAIN TEXT using contentIv
        let plainHTML = await decryptFile(ipfsJson.content.contractText, aesKey, contentIv);

        // --- 5. DECRYPT PRIVATE VARIABLES (If Available) ---
        if (ipfsJson.content.privateVariables && metaIv) {
            try {
                const metaJson = await decryptFile(ipfsJson.content.privateVariables, aesKey, metaIv);
                const privateVars = JSON.parse(metaJson);
                
                // Inject Private Variables [[VAR]]
                for (const [key, val] of Object.entries(privateVars)) {
                    // Global replace of [[KEY]] -> Value
                    plainHTML = plainHTML.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), val);
                }
                console.log("✅ Private Variables Injected");
            } catch (err) {
                console.warn("Private var decryption failed or empty", err);
            }
        }

        // --- 6. INJECT FHE VARIABLES (Compulsory) ---
        const variables = {
            "EMPLOYER_WALLET": storedEmployer,
            "EMPLOYEE_WALLET": storedEmployee,
            "BASE_SALARY": baseSalary,
            "JOINING_BONUS": joiningBonus,
            "TAX_RATE": taxRate,
            "INCREMENT_RATE": incrementRate
        };
        
        // This handles {{VAR}} replacement
        const finalContent = injectValuesIntoTemplate(plainHTML, variables);

        // 7. Initialize TinyMCE
        if (tinymce.get("contract-editor")) {
            tinymce.get("contract-editor").remove();
        }

        tinymce.init({
            selector: '#contract-editor',
            height: 800,
            menubar: false,
            toolbar: false,
            statusbar: false,
            readonly: true,
            setup: function (editor) {
                editor.on('init', function () {
                    editor.setContent(finalContent);
                });
            },
            content_style: `
                body { 
                    font-family: 'Times New Roman', serif; 
                    font-size: 14pt; 
                    line-height: 1.6; 
                    padding: 40px;
                    max-width: 800px;
                    margin: 0 auto;
                }
            `
        });

        console.log("Contract rendered successfully!");

        uiLock.style.display = "none"; 
        
        // Enable Sign Button Logic
        if (currentUser === storedEmployee && !isSigned) {
            signBtn.disabled = false;
            // Correct event listener assignment
            signBtn.onclick = handleSign; 
            signBtn.innerText = "Sign Agreement";
        }

    } catch (err) {
        console.error(err);
        uiMsg.innerText = "Decryption Failed: " + (err.shortMessage || err.message);
        uiMsg.style.color = "red";
    }
}

async function handleSign() {
    try {
        signBtn.innerText = "Signing...";
        signBtn.disabled = true;

        console.log("Sending tx...");
        const tx = await contract.signAgreement(currentCID);
        
        statusDisplay.innerText = "Status: Transaction Processing...";
        await tx.wait();

        console.log("Syncing DB...");
        await fetch(`${API_URL}/sign-agreement`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ipfsCID: currentCID, address: userAddress })
        });

        alert("✅ Contract Signed Successfully!");
        updateStatus(true);
        signBtn.innerText = "Signed";

    } catch (err) {
        console.error(err);
        alert("Signing failed: " + err.message);
        signBtn.disabled = false;
        signBtn.innerText = "Sign Agreement";
    }
}

function updateStatus(isSigned) {
    if (isSigned) {
        statusDisplay.innerText = "Status: ✅ SIGNED";
        statusDisplay.classList.add("status-signed");
    } else {
        statusDisplay.innerText = "Status: ⏳ PENDING";
    }
}

function injectValuesIntoTemplate(htmlTemplate, values) {
    let finalHTML = htmlTemplate;
    for (const [key, value] of Object.entries(values)) {
        const placeholder = `{{${key}}}`;
        finalHTML = finalHTML.replace(new RegExp(placeholder, 'g'), value);
    }
    return finalHTML;
}

init();
