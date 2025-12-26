# 🔒 Contracks: The Confidential Contract Lifecycle Management (CLM) Project on Zama

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Network](https://img.shields.io/badge/Network-Zama%20fhEVM%20(Devnet)-orange)
![Privacy](https://img.shields.io/badge/Privacy-Fully%20Homomorphic%20Encryption-purple)
![AI](https://img.shields.io/badge/AI-Google%20Gemini%202.0-blue)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

> **"Privacy where it matters, Transparency where it counts."**
> 
> Contracks is the world's first **Confidential CLM** built on Ethereum using Zama's fhEVM. It allows enterprises to draft, sign, and **automatically execute** legal agreements (Salaries, Board Votes, Vesting) on-chain without ever revealing the sensitive data (amounts, votes, targets) to the public validators.

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
* You cannot conduct a secret board vote on-chain because the live tally influences the voters.

### The Solution: Fully Homomorphic Encryption (FHE)
Contracks leverages **Zama's fhEVM** to solve this. FHE allows us to perform mathematical operations on encrypted data.

* **Traditional Encryption:** Data is locked. To use it, you must decrypt it (exposing it).
* **FHE (Contracks):** Data remains locked *during* processing.
    * *Example:* `Encrypt(5)` + `Encrypt(5)` = `Encrypt(10)`
    * The node performing the addition **never knows** the numbers were 5 and 5.

---

## 🏗️ Technical Architecture

Contracks is a hybrid dApp that merges high-performance Web2 indexing with state-of-the-art Web3 privacy.

### High-Level Data Flow

1.  **Drafting (Client-Side):**
    * User uploads a legal PDF.
    * Sensitive fields (e.g., "Salary: $5000") are extracted.
    * **Zama SDK** generates a temporary private key in the browser and encrypts the $5000 into a hash.
2.  **Storage (IPFS & MongoDB):**
    * The raw legal text/PDF is pinned to **IPFS (Pinata)** for immutability.
    * The metadata (Who sent it? What is the IPFS CID? Is it signed?) is indexed in **MongoDB** for instant UI loading.
3.  **Auditing (AI Layer):**
    * The **Google Gemini 2.0 Flash** model scans the contract text.
    * It identifies "Risky Clauses" and respects the FHE placeholders, explaining context without guessing values.
4.  **Execution (On-Chain):**
    * The encrypted hash is sent to the Smart Contract.
    * The contract stores it as `euint64` (Encrypted Unsigned Integer).
    * Payroll logic executes automatically every month using these hidden values.



---

## 🔥 Features & Use Cases

### 1. Confidential Payroll Streams
* **Logic:** Managers set up streams where the `FlowRate` is encrypted.
* **Tech:** Uses `TFHE.allow(address, value)` to grant the employee specific permission to view their own decrypted salary, while the employer maintains the write access.
* **Result:** A fully automated payroll system where not even the blockchain validators know the payroll burden.

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
