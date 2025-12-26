import { CONTRACT_TEMPLATES } from "./templates.js";
import { generateRandomSeed, deriveKeyFromSeed, encryptFile, blobToBase64 } from "./crypto.js";
import { sendSalaryTransaction } from "./salary-tx.js";
import { sendPerformanceTransaction } from "./performance-tx.js";
import { sendFFPTransaction } from "./ffp-tx.js";
import { sendBoardVotingTransaction } from "./boardVoting-tx.js";
import { sendPlainTransaction } from "./plain-tx.js"; // IMPORTED PLAIN TX
import { ui as uiUtils } from "./ui-utils.js";

// ==========================================
// STATE VARIABLES
// ==========================================
let milestoneCount = 0;
let voters = [];
let currentTemplate = "";
let privateVars = {}; 
let activeVarTab = 'fhe';
let aiMode = 'ask'; // 'command' (edit) or 'ask' (guide)

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    uiUtils.init();
    
    // Wallet Display
    try {
        if(window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const addr = await signer.getAddress();
            const walletEl = document.getElementById("sidebar-wallet");
            if(walletEl) walletEl.innerText = addr.slice(0,6) + "..." + addr.slice(-4);
        }
    } catch(e) { console.warn("Wallet not connected"); }

    // Initial View Listeners
    const main = document.getElementById("main-section");
    if (main) {
        let type = null
        document.querySelectorAll(".chip").forEach((element)=>{
            element.addEventListener("click",(e)=>{
                document.querySelectorAll(".chip").forEach((button)=>{
                    button.style.background = "white"
                })
                e.target.style.background = "#dcb"
                type = e.target.getAttribute("data-type")
                console.log(type)
                document.querySelector(".sendPrompt").addEventListener("click", (e) => {
                        const container = document.querySelector(".prompt-container");
                        const input = container.querySelector(".chat-input");
                        console.log(type)
                        
                        changeWorkflow(type, input.value);
                });
        })

            
        })
    }
});

// ==========================================
// WORKFLOW MANAGER
// ==========================================
function changeWorkflow(templateType, customPrompt = "") {
    currentTemplate = templateType;
    uiUtils.showLoader("Preparing Template", "Loading editor environment...");
    
    // 1. Get Template Content
    let content = "";
    if (templateType && CONTRACT_TEMPLATES[templateType]) {
        content = CONTRACT_TEMPLATES[templateType].content;
    } else {
        // Default for Plain/Custom
        content = `<h2>General Agreement</h2><p><strong>Parties:</strong></p><ul><li>Sender: [You]</li><li>Receiver: {{RECEIVER_WALLET}}</li></ul><p><strong>Terms:</strong></p><p>State your terms here...</p><p>Private Note: [[CONFIDENTIAL_NOTE]]</p>`;
    }

    // 2. Inject HTML Layout
    const mainSection = document.getElementById("main-section");
    mainSection.innerHTML = getEditorHTML(templateType, customPrompt);

    // 3. Setup Logic
    injectHardcodedInputs(templateType);
    initVariableTabs();
    initAiControls();

    // 4. Initialize TinyMCE Editor
    if (tinymce.get('contract-editor')) tinymce.remove('#contract-editor');
    
    tinymce.init({
        selector: '#contract-editor',
        height: '100%',
        menubar: true,
        plugins: 'lists link image table code help wordcount preview searchreplace autolink directionality visualblocks visualchars fullscreen',
        toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | table link | removeformat | code preview',
        content_style: 'body { font-family: "DM Sans", sans-serif; font-size:14px; padding:20px; line-height: 1.6; color: #333; }',
        resize: false,
        branding: false,
        setup: function (editor) {
            editor.on('init', function () {
                editor.setContent(content);
                uiUtils.hideLoader();
                uiUtils.showToast("Editor Ready", "success");
                scanForPrivateVariables(editor.getContent());
                validateInputs(); 
            });

            // REAL-TIME SCANNING
            editor.on('keyup', function () {
                const text = editor.getContent({ format: 'text' });
                const prevCount = Object.keys(privateVars).length;
                
                scanForPrivateVariables(text);
                
                const newCount = Object.keys(privateVars).length;
                if (newCount > prevCount) switchVarTab('private');
                
                validateInputs();
            });
        }
    });

    const exportBtn = document.getElementById("export");
    if(exportBtn) exportBtn.addEventListener("click", () => exportContract(templateType));

    // Global Validation Listener
    document.getElementById("main-section").addEventListener("input", (e) => {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') validateInputs();
    });

    if(templateType === 'ffp') enableMilestoneFunction();
    if(templateType === 'voting') enableBoardFunctions();
}

// ==========================================
// AI CONTROLS
// ==========================================
function initAiControls() {
    const btn = document.getElementById("btn-ai-send");
    const input = document.getElementById("ai-main-input");
    
    // Mode Toggles
    document.getElementById('opt-ask').onclick = () => { setAiMode('ask'); };
    document.getElementById('opt-edit').onclick = () => { setAiMode('command'); };

    btn.onclick = async () => {
        const query = input.value;
        if(!query) return;
        
        btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span>';
        const editor = tinymce.get("contract-editor");

        try {
            // If editing, show loading on editor
            if(aiMode === 'command') editor.setProgressState(true);

            const currentText = editor.getContent();
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    text: currentText, 
                    type: currentTemplate || 'custom', 
                    query: `MODE: ${aiMode.toUpperCase()}. INSTRUCTION: ${query}. IMPORTANT: PRESERVE ALL {{VAR}} and [[VAR]] PLACEHOLDERS.` ,
                    task: aiMode
                })
            });
            const data = await res.json();

            if (aiMode === 'command') {
                // Update Doc
                editor.setContent(data.answer); 
                editor.setProgressState(false);
                uiUtils.showToast("Contract Updated", "success");
                
                // Re-scan for any new variables AI might have added
                scanForPrivateVariables(editor.getContent({ format: 'text' }));
            } else {
                // Guide in Chat
                addChatBubble("AI", data.answer, true);
            }
        } catch(e) {
            if(aiMode === 'command') editor.setProgressState(false);
            uiUtils.showToast("AI Service Error", "error");
        }
        
        btn.innerHTML = '<span class="material-symbols-outlined">arrow_upward</span>';
        input.value = "";
    };
}

function setAiMode(mode) {
    aiMode = mode;
    // Update UI Styles
    const askBtn = document.getElementById('opt-ask');
    const editBtn = document.getElementById('opt-edit');
    
    if(mode === 'ask') {
        askBtn.classList.add('active-opt');
        editBtn.classList.remove('active-opt');
        document.getElementById('ai-main-input').placeholder = "Ask a question about this contract...";
    } else {
        editBtn.classList.add('active-opt');
        askBtn.classList.remove('active-opt');
        document.getElementById('ai-main-input').placeholder = "Instruct AI to change clauses...";
    }
}

function addChatBubble(name, text, isAi = false) {
    const container = document.querySelector(".chatting");
    if(!container) return;
    
    container.innerHTML += `
        <div class="chat-bubble" style="margin-top:12px;">
            <div class="chat-avatar" style="${isAi ? 'background:#E89134' : 'background:#333'}">${name}</div>
            <div class="chat-text">${text}</div>
        </div>`;
    container.scrollTop = container.scrollHeight;
}

// ==========================================
// VARIABLE TABS & SCANNERS
// ==========================================
function initVariableTabs() {
    document.getElementById('tab-fhe').onclick = () => switchVarTab('fhe');
    document.getElementById('tab-private').onclick = () => switchVarTab('private');
}

function switchVarTab(tab) {
    activeVarTab = tab;
    document.querySelectorAll('.var-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById('section-fhe').style.display = tab === 'fhe' ? 'block' : 'none';
    document.getElementById('section-private').style.display = tab === 'private' ? 'block' : 'none';
}

function scanForPrivateVariables(text) {
    const regex = /\[\[(.*?)\]\]/g;
    let match;
    const foundVars = [];
    while ((match = regex.exec(text)) !== null) foundVars.push(match[1]); 

    const container = document.getElementById("private-vars-list");
    if (!container) return;

    const currentValues = { ...privateVars };
    // Rebuild list
    container.innerHTML = foundVars.length ? '' : '<p style="font-size:0.8rem; color:#999; text-align:center; padding:20px;">Type [[variable]] in editor to add...</p>';

    foundVars.forEach(v => {
        const val = currentValues[v] || ""; 
        if (!privateVars.hasOwnProperty(v)) privateVars[v] = "";

        const div = document.createElement('div');
        div.className = "fhe-input-group";
        div.style.marginBottom = "8px";
        div.innerHTML = `
            <label style="font-size:0.75rem; font-weight:bold; color:#E89134;">[[${v}]]</label>
            <input type="text" class="private-var-input" placeholder="Value..." value="${val}" 
                   style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:0.85rem; background:#fffcf5;">
        `;
        div.querySelector('input').oninput = (e) => {
            privateVars[v] = e.target.value;
            validateInputs();
        };
        container.appendChild(div);
    });
}

// ==========================================
// EXPORT & ENCRYPTION
// ==========================================
async function exportContract(templateType) {
    try {
        proc.start();
        proc.updateStep("step-encrypt", "active");
        
        let content = tinymce.get("contract-editor").getContent();
        
        // 1. Replace FHE Variables
        document.querySelectorAll(".hardcoded-input").forEach(input => {
            const key = input.dataset.key;
            const val = input.value || "__________";
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), val);
        });

        if(templateType === 'voting') {
            const d = document.getElementById("vote-deadline").value;
            content = content.replace(/{{DEADLINE}}/g, d || "TBD");
        }

        // 2. Process Private Variables (Replace in text + Create Metadata)
        const metadataPrivateVars = {};
        for (const [key, val] of Object.entries(privateVars)) {
             const safeVal = val || "[REDACTED]";
             content = content.replace(new RegExp(`\\[\\[${key}\\]\\]`, 'g'), safeVal);
             metadataPrivateVars[key] = safeVal;
        }

        console.log("📝 Generating Keys...");
        await new Promise(r => setTimeout(r, 600)); 
        
        // --- CRYPTO LOGIC ---
        const seed = generateRandomSeed(); 
        const aesKey = await deriveKeyFromSeed(seed);
        
        // Encrypt Content
        const { blob: contentBlob, iv: contentIv } = await encryptFile(content, aesKey);
        
        // Encrypt Private Vars JSON
        const privateJson = JSON.stringify(metadataPrivateVars);
        const { blob: metaBlob, iv: metaIv } = await encryptFile(privateJson, aesKey);

        const combinedIv = `${contentIv}::${metaIv}`;

        proc.updateStep("step-encrypt", "done");
        proc.updateStep("step-ipfs", "active");

        // 3. Upload to IPFS
        const contentBase64 = await blobToBase64(contentBlob);
        const metaBase64 = await blobToBase64(metaBlob);

        const uploadRes = await fetch('/api/upload-contract', { 
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
                 contractText: contentBase64,
                 privateVariables: metaBase64
             }) 
        });
        const { cid } = await uploadRes.json();
        
        proc.updateStep("step-ipfs", "done");
        proc.updateStep("step-zama", "active");

        // 4. Blockchain Tx (Using Combined IV)
        if(templateType == "salary"){
            await sendSalaryTransaction(combinedIv, seed, cid, proc);
        }
        else if(templateType == "performance"){
            await sendPerformanceTransaction(combinedIv, seed, cid, proc);
        }
        else if(templateType === 'ffp'){
             const descriptions = []; const amounts = []; const penalties = []; const deadlines = [];
             document.querySelectorAll(".milestone-entry-card").forEach(card => {
                descriptions.push(card.querySelector(".ms-desc").value);
                amounts.push(BigInt(card.querySelector(".ms-amount").value));
                penalties.push(Number(card.querySelector(".ms-penalty").value));
                const d = new Date(card.querySelector(".ms-deadline").value);
                deadlines.push(Math.floor(d.getTime()/1000));
             });
             await sendFFPTransaction(combinedIv, seed, cid, proc, { descriptions, amounts, penalties, deadlines });
        }
        else if(templateType == "voting"){
             const whitelistArray = voters.map(v => v.address);
             const weightageArray = voters.map(v => v.weight);
             const d = new Date(document.getElementById("vote-deadline").value);
             const deadline = Math.floor(d.getTime()/1000);
             await sendBoardVotingTransaction(combinedIv, seed, cid, proc, { whitelistArray, weightageArray, deadline });
        }
        else if(templateType == "plain"){
             // NEW: Handle Plain Agreement
             await sendPlainTransaction(combinedIv, seed, cid, proc);
        }

    } catch(e) {
        console.error(e);
        proc.error(e.message);
    }
}

// ==========================================
// UI & LAYOUT GENERATION
// ==========================================
function getEditorHTML(type, prompt) {
    const title = type ? type.charAt(0).toUpperCase() + type.slice(1) : "General";
    const promptText = prompt || `Selected ${title} Template`;

    // Extra Config Sections
    let extraSection = "";
    if(type === 'ffp') {
        extraSection = `
        <div id="ffp-section" style="border-top:1px solid #eee; padding:15px; margin-top:10px;">
            <h4 class="section-title" style="font-size:0.8rem; margin-bottom:10px;">Milestone Registry</h4>
            <div id="milestone-inputs-list"></div>
            <button id="btnAddMilestone" class="btn-add-ms">+ Add Milestone</button>
        </div>`;
    } else if(type === 'voting') {
        extraSection = `
        <div id="voting-section" style="border-top:1px solid #eee; padding:15px; margin-top:10px;">
            <h4 class="section-title" style="font-size:0.8rem; margin-bottom:10px;">Voting Config</h4>
            <div class="fhe-input-group" style="margin-bottom:10px;">
                <label style="font-weight:bold; font-size:0.8rem; color:#555; display:block; margin-bottom:4px;">Voting Deadline</label>
                <input type="datetime-local" id="vote-deadline" class="fhe-input" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
            </div>
            <div style="background:#f9f9f9; padding:10px; border-radius:8px; border:1px dashed #ccc;">
                <label style="font-size:0.8rem; font-weight:bold; color:#555;">Add Voter</label>
                <div style="display:flex; gap:5px; margin-top:5px;">
                    <input type="text" id="new-voter-addr" placeholder="0x..." style="flex:2; padding:6px; border:1px solid #ccc; border-radius:4px;">
                    <input type="number" id="new-voter-weight" placeholder="Weight" style="flex:1; padding:6px; border:1px solid #ccc; border-radius:4px;">
                </div>
                <button id="btnAddVoter" class="btn-add-ms" style="margin-top:5px;">Add</button>
            </div>
            <div id="voter-list-container" style="margin-top:10px;"></div>
        </div>`;
    }

    return `
    <div class="split-layout">
        <div class="left-pane" style="display:flex; flex-direction:column; overflow:hidden; padding-bottom:0;">
            <div class="chatting" style="flex-shrink:0; max-height:150px; overflow-y:auto; padding-bottom:10px;">
                <div class="chat-bubble">
                    <div class="chat-avatar">AI</div>
                    <div class="chat-text">${promptText}</div>
                </div>
            </div>

            <div class="variable-card" style="flex:1; display:flex; flex-direction:column; min-height:0; margin-bottom:10px;">
                <div class="card-header" style="padding:0; display:flex; background:#f0f7ff; flex-shrink:0;">
                    <div id="tab-fhe" class="var-tab active" style="flex:1; padding:12px; text-align:center; cursor:pointer; font-weight:600; font-size:0.85rem; border-bottom:2px solid transparent; color:#0055cc;">Compulsory</div>
                    <div id="tab-private" class="var-tab" style="flex:1; padding:12px; text-align:center; cursor:pointer; font-weight:600; font-size:0.85rem; border-bottom:2px solid transparent; color:#999;">Private [[ ]]</div>
                </div>
                
                <div class="card-body" style="padding:15px; overflow-y:auto; flex:1;">
                    <div id="section-fhe">
                        <div id="variables-container"></div>
                        ${extraSection}
                    </div>
                    <div id="section-private" style="display:none;">
                        <div id="private-vars-list"></div>
                    </div>
                </div>
            </div>

            <div class="prompt-container" style="width:100%; margin-top:auto; min-height:auto; padding:4px; border:1px solid #eee; box-shadow:0 -5px 15px rgba(0,0,0,0.02); background:#fff; flex-shrink:0; display:flex; flex-direction:column; gap:10px; border-radius:12px;">
                <textarea id="ai-main-input" class="chat-input" placeholder="Ask AI..." style="font-size:0.9rem; width:100%; padding:8px; border:0px solid #eee; border-radius:8px; resize:none; height:50px; font-family:inherit;">${prompt}</textarea>
                
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <div style="display:flex; gap:5px;">
                        <div id="opt-ask" class="ai-opt active-opt">Guide Me</div>
                        <div id="opt-edit" class="ai-opt">Edit Contract</div>
                    </div>
                    <button id="btn-ai-send" class="sendPrompt" style="width:36px; height:36px; min-width:36px; min-height:36px; font-size:1.1rem; ; display:flex; align-items:center; justify-content:center;"><span class="material-symbols-outlined">arrow_upward</span></button>
                </div>
            </div>
        </div>

        <div class="right-pane">
            <div class="doc-header">
                <div class="doc-title">📄 ${title} Contract</div>
                <button id="export" class="btn-black" disabled>Fill all fields...</button>
            </div>
            <div class="editor-wrapper">
                <textarea id="contract-editor"></textarea>
            </div>
        </div>
    </div>
    
    <style>
        .var-tab.active { border-bottom-color: #E89134 !important; color: #E89134 !important; background: white; }
        .ai-opt { font-size:0.75rem; padding:4px 10px; border-radius:20px; background:#f0f0f0; color:#666; cursor:pointer; font-weight:600; transition:0.2s; border:1px solid transparent; }
        .active-opt { background:#FFF5EB; color:#E89134; border-color:#E89134; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; font-size:1.2rem; }
    </style>`;
}

// ... [ProcessManager class remains identical] ...
class ProcessManager {
    constructor() {
        this.overlay = document.getElementById("process-overlay");
        this.bar = document.querySelector(".bar-fill");
    }
    start() {
        if(this.overlay) this.overlay.classList.remove("hidden");
        if(this.bar) this.bar.style.width = "5%";
    }
    updateStep(stepId, status) {
        const el = document.getElementById(stepId);
        if(!el) return;
        el.classList.remove("active", "done");
        if(status === 'active') el.classList.add("active");
        if(status === 'done') {
            el.classList.add("done");
            let w = parseInt(this.bar.style.width) || 0;
            if(this.bar) this.bar.style.width = (w + 15) + "%";
        }
    }
    complete() {
        if(this.bar) this.bar.style.width = "100%";
        uiUtils.showToast("Deployment Successful!", "success");
        setTimeout(() => { window.location.href = "/inbox"; }, 1500);
    }
    error(msg) {
        uiUtils.showToast(msg, "error");
        setTimeout(() => { if(this.overlay) this.overlay.classList.add("hidden"); }, 2000);
    }
}
const proc = new ProcessManager();

// ==========================================
// HELPERS
// ==========================================
function validateInputs() {
    const btn = document.getElementById("export");
    if(!btn) return;

    let isValid = true;

    // Compulsory
    document.querySelectorAll(".hardcoded-input").forEach(input => {
        if(!input.value.trim()) isValid = false;
    });

    // Private
    document.querySelectorAll(".private-var-input").forEach(input => {
        if(!input.value.trim()) isValid = false;
    });

    // Logic
    if(currentTemplate === 'voting') {
        const d = document.getElementById("vote-deadline");
        if(d && !d.value) isValid = false;
        if(voters.length === 0) isValid = false;
    }

    btn.disabled = !isValid;
    if(isValid) {
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.innerText = "🚀 Export & Deploy";
        btn.style.background = "#111";
    } else {
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
        btn.innerText = "Fill all variables...";
        btn.style.background = "#555";
    }
}

function injectHardcodedInputs(type) {
    const container = document.getElementById("variables-container");
    if(!container) return;
    container.innerHTML = ""; 
    let inputsHTML = "";
    
    if (type === 'salary') {
        inputsHTML = `
            ${createInput("EMPLOYER_WALLET", "Your Wallet Address")}
            ${createInput("EMPLOYEE_WALLET", "Employee Wallet Address")}
            ${createInput("BASE_SALARY", "Monthly Salary (USDC)")}
            ${createInput("JOINING_BONUS", "Joining Bonus")}
            ${createInput("TAX_RATE", "Tax Rate (%)")}
            ${createInput("INCREMENT_RATE", "Annual Increment (%)")}
        `;
    } 
    else if (type === 'performance') {
        inputsHTML = `
            ${createInput("EMPLOYER_WALLET", "Your Wallet Address")}
            ${createInput("EMPLOYEE_WALLET", "Employee Wallet Address")}
            ${createInput("BONUS", "Target Bonus Amount")}
            ${createInput("TARGET", "KPI Score Target (1-100)")}
            <div class="fhe-input-group" style="margin-bottom:10px;">
                <label style="font-weight:bold; font-size:0.8rem; color:#555; display:block; margin-bottom:4px;">Review Deadline</label>
                <input class="deadline hardcoded-input" type="datetime-local" data-key="DEADLINE" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:0.9rem;">
            </div>
        `;
    }
    else if (type === 'ffp') {
        inputsHTML = `
            ${createInput("CLIENT_WALLET", "Client Wallet Address")}
            ${createInput("VENDOR_WALLET", "Vendor Wallet Address")}
        `;
    }
    else if (type === 'voting') {
        inputsHTML = `
            ${createInput("ADMIN_WALLET", "Admin Wallet Address")}
        `;
    }
    // ADDED PLAIN CONTRACT LOGIC
    else if (type === 'plain') {
        inputsHTML = `
            ${createInput("RECEIVER_WALLET", "Receiver Wallet Address")}
        `;
    }
    
    container.innerHTML = inputsHTML;
}

function createInput(key, label) {
    return `
    <div class="fhe-input-group" style="margin-bottom:10px;">
        <label style="font-weight:bold; font-size:0.8rem; color:#555; display:block; margin-bottom:4px;">{{${key}}} - ${label}</label>
        <input type="text" class="hardcoded-input ${key.toLowerCase()}" data-key="${key}" placeholder="Enter value..." style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:0.9rem;">
    </div>`;
}

function enableMilestoneFunction() {
    const btn = document.getElementById("btnAddMilestone");
    if(!btn) return;
    btn.onclick = () => {
        if (milestoneCount >= 5) return alert("Max 5 milestones");
        milestoneCount++;
        const div = document.createElement("div");
        div.className = "milestone-entry-card";
        div.style.cssText = "background:#fcfcfc; border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:6px;";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <label style="font-size:0.7rem; font-weight:bold; color:#555;">MILESTONE ${milestoneCount}</label>
                <span style="color:red; cursor:pointer;" onclick="this.parentElement.parentElement.remove()">×</span>
            </div>
            <input type="text" class="ms-desc" placeholder="Description" style="width:100%; margin:5px 0; padding:5px; border:1px solid #ccc; border-radius:4px;">
            <div style="display:flex; gap:5px;">
                <input type="number" class="ms-amount" placeholder="Amount" style="flex:1; padding:5px; border:1px solid #ccc; border-radius:4px;">
                <input type="number" class="ms-penalty" placeholder="Penalty %" style="flex:1; padding:5px; border:1px solid #ccc; border-radius:4px;">
            </div>
            <input type="date" class="ms-deadline" style="width:100%; margin-top:5px; padding:5px; border:1px solid #ccc; border-radius:4px;">
        `;
        document.getElementById("milestone-inputs-list").appendChild(div);
    };
}

function enableBoardFunctions() {
    const btn = document.getElementById("btnAddVoter");
    if(!btn) return;
    btn.onclick = () => {
        const addr = document.getElementById("new-voter-addr").value;
        const w = document.getElementById("new-voter-weight").value;
        if(addr && w) {
            voters.push({ address: addr, weight: w });
            renderVoters();
            document.getElementById("new-voter-addr").value = "";
            document.getElementById("new-voter-weight").value = "";
            validateInputs(); 
        }
    };
}

function renderVoters() {
    const c = document.getElementById("voter-list-container");
    c.innerHTML = voters.map((v, i) => `
        <div style="display:flex; justify-content:space-between; background:white; padding:8px; border:1px solid #eee; margin-bottom:5px; border-radius:4px;">
            <span style="font-size:0.8rem; color:#333;">${v.address.slice(0,6)}... (${v.weight})</span>
            <span style="color:red; cursor:pointer;" onclick="removeVoter(${i})">×</span>
        </div>
    `).join("");
}

window.removeVoter = (i) => { voters.splice(i, 1); renderVoters(); validateInputs(); };
