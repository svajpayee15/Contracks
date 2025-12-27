# Contracks: The Confidential Contract Lifecycle Management (CLM) Platform

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Network](https://img.shields.io/badge/Network-Zama%20fhEVM-orange)
![Privacy](https://img.shields.io/badge/Privacy-Fully%20Homomorphic%20Encryption-purple)
![AI](https://img.shields.io/badge/AI-Qwen-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

> **"Privacy where it matters, Transparency where it counts."**
>
> Contracks is the world's first **Hybrid Confidential CLM** platform built on Ethereum (Sepolia) using **Zama's fhEVM**. It empowers enterprises to draft, sign, and **automatically execute** legal agreements on-chain without ever revealing sensitive business data (salaries, votingStategy, targets, bonuses, etc) to the public.
>
> We don't just encrypt data; we **compute** on it.

---

## 📚 Table of Contents

0. [📽️Youtube Video](https://youtu.be/HXGtlvZz2pc)
1. [🌟 The Core Innovation](#-the-core-innovation)
2. [🏗️ Technical Architecture](#-technical-architecture)
3. [📜 Smart Contract Suite (The Big 5)](#-smart-contract-suite-the-big-5)
4. [✨ Platform Features](#-platform-features)
5. [🛠️ Tech Stack](#%EF%B8%8F-tech-stack)
6. [💻 Installation & Setup](#-installation--setup)
7. [📡 API Reference](#-api-reference)
8. [🛡️ Security & Privacy](#%EF%B8%8F-security--privacy)

---

## 🌟 The Core Innovation

### The Problem: The "Blockchain Privacy Paradox" that Contracks solves
Enterprises love the automation of smart contracts but hate the transparency. Examplea:
* **HR** cannot stream salaries on-chain because everyone can see the amounts.
* **Boards** cannot vote on-chain because live tallies influence voter behavior.
* **Procurement** cannot use smart contracts for "Firm Fixed-Price" (FFP) deals because competitor pricing would be exposed.

### The Solution: Fully Homomorphic Encryption (FHE)
Contracks leverages **Zama's fhEVM** to enable "Blind Computation."
* **Traditional Encryption:** Data is locked at rest but must be decrypted to be processed (creating a security hole).
* **Contracks FHE:** We perform logic on encrypted data directly.
    * *Example:* `Encrypt(Target) - Encrypt(Performance) = Encrypted(Result)`
    * The blockchain validator executes this math **without ever seeing the numbers**.

---

## 🏗️ Technical Architecture

We use a **Hybrid Privacy Architecture** that separates Logic (On-Chain) from Storage (IPFS via Pinata).

### High-Level Data Flow

1.  **Drafting (Client-Side):**
    * User drafts a contract using our **TinyMCE** editor.
    * User asks AI to help him out (guiding, contract edit modes).
    * **Relayer SDK** helps in encrypting dynamic data (eVariables) on the client side.
    * Senstive fields are classified into two: 1. Dynamic Data and 2.Static Data
    ** Dynamic Data requires compute and is stored on the blockhain and are encrypted variables using Zama's Relayer SDK.
    ** Static Data doesnt requires compute and is stored after encryption in IPFS( via AES-256 encryption and Pinata for pinning)
    * Sensitive fields (e.g., `$150,000`, `Vote: YES`) are encrypted into **Ciphertext Handles** with the help of Relayer SDK.
2.  **Encryption & Indexing:**
    * **Static Data:** The legal text is AES-256 encrypted. The AES key is then encrypted with FHE and stored on-chain (Hybrid Scheme).
    * **Storage:** The encrypted PDF/Text is pinned to **IPFS (Pinata)**.
    * **Indexing:** Metadata (ipfsCID, Sender, Receiver, Status) is synced to **MongoDB** for instant "Inbox" retrieval.
3.  **AI Analysis:**
    * **qwen2p5-vl-32b-instruct** scans the draft. It ignores the encrypted hash strings but analyzes the surrounding legal clauses for risk.
4.  **On-Chain Execution:**
    * The smart contract receives the `Ciphertext`. It stores it and executes the defined logic (e.g., Vesting triggers) automatically.
5. **View Dashboard:**
   * There are 5 types of different viewing dashboard, so that you can manage and work your contracts effortlessly and efficiently:
      1. BoardVoting Agreement dashboard: Voting feature, deadline, finalize results ( admin feature ), contract viewer.
      2. Performance Agreement dashboard: Sign agreement ( vendor's feature ), update actualPerformance ( vendor's feature ), calculatePayout, update client satisfaction ( client feature ), contract viewer, 
      3. FFP Agreement dashboard: total Budget, milestones, update milestone ( vendor's feature ), pay for milestone ( client feature ), penalize ( client feature ), contract viewer
      4. Salary Agreement dashboard: Sign agreement ( employee feature ), increment annually ( employee feature ), contract viwer
      5. Plain Agreement dashboard: Sign agreement ( receiver's feature ), contract viewer
---

## 📜 Smart Contract Suite (The Big 5)

We have deployed 5 specialized FHE contracts to handle the entire lifecycle of enterprise agreements.

### 1. 🏛️ BoardVoting (Blind Governance)
* **Use Case:** Secret board resolutions, DAO governance, and sensitive motion passing.
* **FHE Logic:**
    * The admin needs to whitlist walletaddress with their governance
    * Votes are cast as `ebool` (Encrypted Boolean).
    * The contract sums them: `Total = TFHE.add(VoteA, VoteB)`.
    * Uses Public Decryption to decrypt results after the deadline only, And doesnt reveal voting choices, and voting results only the Final Result ( Passed, Rejected) so that no one can trace out voting choices     through governance.
    * **Privacy:** The tally is hidden until the deadline. Even the admin cannot see individual votes and tally can be publicly decrypted after the deadline.
* **Computation:** `euint64 userVoteWeightage = FHE.select(
                     userVote, 
                     FHE.asEuint64(weightage[_ipfsCID][msg.sender]), 
                     FHE.asEuint64(0)
                   );
                   v.totalYesVotesWeightage = FHE.add(v.totalYesVotesWeightage, userVoteWeightage);`
                   `ebool isPassed = FHE.gt(v.totalYesVotesWeightage, FHE.asEuint64(halfWeight));`
                   

### 2. 📈 Performance (.)
* **Use Case:** Employee bonuses based on secret targets (e.g., "Hit $1M revenue").
* **FHE Logic:**
    * **Inputs:** `euint128 target`, `euint128 actualPerformance, ebool employerSatisfaction, euin128 finalPayout, ebool isFinalized`.
    * **Computation:** ` ebool targetMet = FHE.ge(job.actualPerformance, job.target);
                         ebool isEligible = FHE.and(targetMet, job.employerSatisfied);
                         euint128 zero = FHE.asEuint128(0);
                         euint128 payout = FHE.select(isEligible, job.bonus, zero);.`
    * **Result:** If true, the contract auto-releases the bonus. The public never knows the target or the actualPerformance.

### 3. 💼 FFP (Firm Fixed-Price)
* **Use Case:** Procurement and Freelance contracts where the total value must remain hidden from competitors.
* **FHE Logic:**
    * **Inputs:** `euint128 fixedFee`, `ebool deliverableAccepted`.
    * **Mechanism:**  ``
    * **Privacy:** On-chain observers see a transaction, but the `Amount` is `0x...` (Encrypted).

### 4. 💰 Salary (Confidential Increment and Salary)
* **Use Case:** Continuous payroll streams that protect employee privacy.
* **FHE Logic:**
    * **Inputs:** .
    * **Computation:**   `euint64 rate64 = FHE.asEuint64(salaryAgreement[_ipfsCID].incrementRate);
                          euint64 increaseAmount = FHE.mul(salaryAgreement[_ipfsCID].baseSalary, rate64);
                          increaseAmount = FHE.div(increaseAmount, 100);
                          euint64 newSalary = FHE.add(salaryAgreement[_ipfsCID].baseSalary, increaseAmount);. `
                          
    * **Feature:** The employee can come at the end of the year and check his incremented salary with ever revealing it to the public.

### 5. 📝 PlainAgreement (Standard CLM)
* **Use Case:** Non-financial legal documents (NDAs, MOUs) that need immutable signing but no computational logic.
* **Logic:**
    * IPFS Hash storage.
    * Multi-sig `eSign` verification.
    * Mostly dependent on Private variable storing.
    * **Gas Efficient:** Lowest cost option for simple agreements.

---

## ✨ Platform Features

### 🖋️ TinyMCE Expert Editor
* Integrated the industry-standard **TinyMCE** rich-text editor.
* Just enclose Dynamic Variables between {{dVar}} and Static Variables between [[sVar]]
* Renders legal formatting (indentation, clauses, fonts) perfectly in the browser.

### 🤖 AI Assistance (Qwen)
* **Drafting:** "Write a Non-Compete clause for a NY software engineer."
* **Context Awareness:** The AI understands our specific `[[SECRET_VAR]] & {{FHE_VAR}}` syntax and drafts around it.
* **Summarize:** We can also use AI to summarize our inbox agreements

### 🔍 Private Summarization
* Summarizes the legal PDFs user is indulged in, into a **3-point Risk Audit** with Qwen without exposing the private fields.
* **Privacy Feature:** It highlights *where* the hidden money/variables are located in the text without needing to know the value.

### ⚡ Off-Chain Indexing
* We run a lightweight **MongoDB/Node.js Indexer** that indexes the Contracts.
* **Swift Inboxing:** When you open the app, your Contracts load instantly from MongoDB, rather than waiting for slow blockchain RPC calls.

### ✍️ eSign Feature
* Cryptographic approval system.
* Clicking "Sign" generates an EIP-712 signature.
* This signature is verified on-chain before any FHE logic (like money movement) can begin.

### 🎨 Professional UI
* **Enterprise-Grade Dashboard:** Clean, light-mode interface designed for Legal professionals.
* **Editor:** Contract uses TinyMCE premium editor, AI for drafting your contracts with structured formating/styling
* **Sophisticated but Clean UI:** The data is well structured and organized.
* **Responsive UI:** Legal work? But away from Keyboard. No problem Contracks is Responsive but still clean. 

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Privacy** | **Zama fhEVM** (Fully Homomorphic Encryption), AES-256|
| **Contracts** | Solidity v0.8.20 |
| **Tests** | Hardhat |
| **Frontend** | Vanilla JS, HTML5, CSS3, Ethers, RelayerSDK |
| **Editor** | **TinyMCE** |
| **Backend** | Node.js / Express |
| **Database** | MongoDB Atlas (Metadata Indexing) |
| **Storage** | IPFS (via Pinata) |
| **AI** | **qwen2p5-vl-32b-instruct** |

---

## 💻 Installation & Setup

1.  **Clone the Repo**
    ```bash
    git clone [https://github.com/svajpayee15/Contracks.git](https://github.com/svajpayee15/Contracks.git)
    npm install
    ```

2.  **Configure Environment** (`.env`)
    ```env
    PORT=3000
    MONGO_URI=mongodb+srv://...
    PINATA_JWT=...
    FIREWORKS_API_KEY=...
    PRIVATE_KEY=...
    ```

3.  **Run Locally**
    ```bash
    node server.js
    ```
    *Access at `http://localhost:3000`*

---

## 📡 API Reference

* `POST /api/save-agreement`: Index a new contract.
* `GET /api/inbox/:address`: Fetch user's incoming contracts.
* `GET /api/sent/:address`: Fetch user's sent contracts.
* `POST /api/analyze`: Trigger AI Risk Audit.
* `POST /login`: Login User.
* `PUT /api/sign-agreement`: Execute on-chain signature.

---

## 🛡️ Security & Privacy

* **COOP/COEP Headers:** Enforced for Zama WASM compatibility.
* **JWT Auth:** Secures the Web2 layer.
* **Hybrid Encryption:** AES for files (speed) + FHE for logic (utility).
