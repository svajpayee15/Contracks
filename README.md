# 🔒 Contracks: The Confidential Contract Lifecycle Management (CLM) Project on Zama

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Network](https://img.shields.io/badge/Network-Zama%20fhEVM%20(Devnet)-orange)
![Privacy](https://img.shields.io/badge/Privacy-Fully%20Homomorphic%20Encryption-purple)
![AI](https://img.shields.io/badge/AI-Google%20Gemini%202.0-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

> **"Privacy where it matters, Transparency where it counts."**
> 
> Contracks is the world's first **Confidential CLM** built on Ethereum using Zama's FHEVM. It allows enterprises to draft, sign, and **automatically execute** legal agreements on-chain without ever revealing the sensitive data (amounts, votes, targets) to the public validators.
And also lets them compute on their data without ever revealing it, levaraging Zama's true utility.

> Contracts is not only about encrypting and storing data, its about performing logic/math on it.

---

## 📚 Table of Contents

1. [🌟 The Core Innovation (Why FHE?)](#-the-core-innovation-why-fhe)
2. [🏗️ Technical Architecture](#-technical-architecture)
3. [🔥 Features & Use Cases](#-features--use-cases)
    - [Confidential Payroll](#1-confidential-payroll-streams)
    - [Blind Board Governance](#2-blind-board-governance)
    - [AI Legal Auditor](#3-ai-legal-auditor)
4. [🛠️ Tech Stack Deep Dive](#%EF%B8%8F-tech-stack-deep-dive)
5. [📂 Project Structure](#-project-structure)
6. [💻 Installation & Setup Guide](#-installation--setup-guide)
7. [📡 API Reference](#-api-reference)
8. [🧩 Smart Contract Logic (The FHE Layer)](#-smart-contract-logic-the-fhe-layer)
9. [🛡️ Security Implementation](#%EF%B8%8F-security-implementation)
10. [🔮 Roadmap](#-roadmap)

---

## 🌟 The Core Innovation: Why FHE?

### The "Blockchain Privacy Paradox"
Public blockchains like Ethereum are revolutionary for trust, but **terrible for business privacy**. 
* You cannot put an employee's salary on-chain because everyone can see it.
* You cannot privately close a deal with a client.
* Nowadays, Procurement Contracts like Firm Fixed-Price(FFP) requires privacy and compute.
* You cannot conduct a secret board vote on-chain because the live tally influences the voters.

### The Solution: Fully Homomorphic Encryption (FHE)
Contracks leverages **Zama's FHEVM** to solve this. FHE allows us to perform mathematical operations on encrypted data.

ZK cant do what FHE does, Contracks not only store encrypted data but performs the math on it.

* **Traditional Encryption:** Data is locked. To use it, you must decrypt it (exposing it).
* **FHE (Contracks):** Data remains locked *during* processing.
    * *Example:* `Encrypt(5)` + `Encrypt(5)` = `Encrypt(10)`
    * The node performing the addition **never knows** the numbers were 5 and 5.

---

## 🏗️ Technical Architecture

Contracks is a hybrid dApp that merges high-performance Web2 indexing with state-of-the-art Web3 privacy.

### High-Level Data Flow

1.  **Drafting (Client-Side):**
    * User chooses a contract-type.
    * Asks AI to help him write or guide while drafting his contract.
    * User can draft very precise, neat and tidy Contracts with the high quality text editor ~ TinyMCE
    * 2 types of Sensitive fields (e.g., "Salary: $5000", "Company Name: Zama") are extracted.
    * Sensitive fields are classified into: 
            1. Dynamic Data - Requires Compution
            2. Static Data - Doesnt requires Computation
    * **RelayerSDK** generates encrypted handles (ciphertexts) of the Dynamic Data.
2.  **Storage (IPFS & MongoDB):**
    * The raw legal Text/PDF and the Static Data are encrypted via AES-256 Encryption with the same AES-Key.
    * The seed ( used to generate the AES-Key ) is encrypted with Zama.
    * The raw legal text/PDF and Static Data is pinned to **IPFS (Pinata)** for immutability.
    * Offchain Indexer: The metadata (Who sent it? What is the IPFS CID? Is it signed?) is indexed in **MongoDB** for instant UI loading.
3.  **Summarize (AI Layer):**
    * The **Google Gemini 2.0 Flash** model scans the contract text excluding Sensitive Fields.
    * It identifies "Risky Clauses" and respects the FHE placeholders and Static placeholders, explaining context without guessing values.
4.  **Execution (On-Chain):**
    * The encrypted Fields along with the Seed are sent to the Smart Contract.

---

## 🔥 Features & Use Cases

### 1. Confidential PSUs (Confidential Performance Share Units):
* **Logic:** Employer wants to give a target to the Employee to be completed within a deadline for a fixed bonus. If the Employer is satisfied with the target/work acheived/done by the Employee then the Employee can simply get Paid. All this happens without revealing the *Target*, *Bonus*, *Employer's Satisfaction*, 
* **FHE Variables:** The following FHE variables and their types are used in this Smart Contract:
                        1. eSeed ( euint64 )
                        2. target ( euint128 )
                        3. bonus ( euint128 )
                        4. actualPerformance ( euint128 )
                        5. finalPayout ( euint128 )
                        6. employerSatisfaction ( ebool )
                        7. isFinalized ( ebool )

### 2. Blind Board Governance
* **Logic:** A DAO or Board votes on sensitive motions (e.g., "Fire the CEO").
* **Tech:** Votes are cast as `ebool` (Encrypted Booleans). The contract accumulates the count: `Total = TFHE.add(VoteA, VoteB)`.
* **Result:** The tally remains hidden until the deadline. Only the final `Decrypted(Total)` is revealed. Prevents "Bandwagoning" and social pressure.

### 3. AI Legal Auditor
* **Logic:** Before signing, users click "Analyze with AI".
* **Tech:** We inject a custom **System Prompt** into Gemini 2.0 that forces it to act as a "Senior Legal Partner".
* **Output:** It returns a structured JSON risk assessment, highlighting clauses in Red/Orange based on severity.

---

## 🛠️ Tech Stack Deep Dive

| Component | Tech | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JS | Lightweight, fast UI with no framework bloat. |
| **Backend** | Node.js, Express.js | Handles API routing, Auth, and AI orchestration. |
| **Database** | MongoDB (Mongoose) | Stores user profiles, agreement metadata, and signing status. |
| **Storage** | IPFS (Pinata) | Decentralized, immutable storage for legal documents. |
| **AI Engine** | Google Gemini 1.5/2.0 | NLP analysis for contract summarization. |
| **Smart Contracts** | Solidity v0.8.20 | The core logic. |
| **Privacy Layer** | **Zama fhEVM** | The magic sauce. Enables `euint64` and `ebool` types. |
| **Testing** | Hardhat | Local development environment. |

---

## 📂 Project Structure

```bash
Contracks/
├── backend/
│   ├── database/          # MongoDB Schemas (User, Agreement)
│   ├── middleware/        # Auth (JWT) & COOP/COEP Headers
│   ├── routes/            # API Endpoints (Upload, Analyze, Sign)
│   └── server/            # Entry point (Express App)
├── contracts/             # Solidity Smart Contracts (FHE Logic)
├── public/                # Static Frontend Files (HTML/CSS/JS)
├── hardhat.config.js      # Zama/Hardhat Configuration
└── package.json           # Dependencies
