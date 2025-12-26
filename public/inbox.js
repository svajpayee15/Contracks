import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

const API_URL = "/api";
const contractsList = document.querySelector(".contracts-list");
const userProfileName = document.querySelector(".user-info .name");
const tabs = document.querySelectorAll(".tab");

let currentAddress = "";

async function init() {
    if (!window.ethereum) return;

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        currentAddress = await signer.getAddress();
        
        if(userProfileName) {
            userProfileName.innerHTML = `${currentAddress.substring(0, 6)}...${currentAddress.slice(-4)} ▾`;
        }

        setupTabs();
        fetchContracts('inbox');
    } catch(e) {
        console.error("Wallet Error", e);
    }
}

function setupTabs() {
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const tabName = tab.innerText.trim().toLowerCase();
            if (tabName.includes("inbox")) fetchContracts('inbox');
            else if (tabName.includes("sent")) fetchContracts('sent');
        });
    });
}

async function fetchContracts(type) {
    contractsList.innerHTML = `<div class="contract-row"><div class="col-desc">Loading...</div></div>`;

    try {
        const endpoint = type === 'inbox' ? 'inbox' : 'sent';
        const res = await fetch(`${API_URL}/${endpoint}/${currentAddress}`);
        const result = await res.json();

        renderList(result.data, type);
    } catch (error) {
        console.error(error);
        contractsList.innerHTML = `<div class="contract-row"><div class="col-desc" style="color:red;">Error loading contracts.</div></div>`;
    }
}

function renderList(data, type) {
    contractsList.innerHTML = "";

    if (!data || data.length === 0) {
        contractsList.innerHTML = `<div class="contract-row" style="justify-content:center; padding:20px; color:#999;">No contracts found.</div>`;
        return;
    }

    data.forEach(contract => {
        const row = document.createElement("div");
        row.className = "contract-row"; 
        row.style.cursor = "pointer";
        row.onclick = () => window.location.href = `/view/${contract.typeOfAgreement}?cid=${contract.ipfsCID}`;

        const dateObj = new Date(contract.createdAt);
        const dateStr = dateObj.toLocaleDateString();
        const targetAddr = type === 'inbox' ? contract.sender : currentAddress;
        const displayName = `${targetAddr.substring(0,6)}...${targetAddr.slice(-4)}`;
        const isSigned = contract.status === true;

        row.innerHTML = `
            <div class="col-star"><span class="star">☆</span></div>
            <div class="col-name">${displayName}</div>
            <div class="col-desc">
                <strong>${contract.typeOfAgreement} Agreement</strong> <span style="font-size:0.8rem; color:#666; margin-left:8px;">(CID: ${contract.ipfsCID.substring(0,5)}...)</span>
                ${isSigned ? '<span style="color:green; font-weight:bold; margin-left:8px;">✓ Signed</span>' : ''}
            </div>
            <div class="col-date">${dateStr}</div>
        `;
        
        contractsList.appendChild(row);
    });
}

init();

// --- 🍔 MOBILE TOGGLE & CROSS LOGIC ---
document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("menu-toggle");
    const closeBtn = document.getElementById("sidebar-close");
    const sidebar = document.querySelector("aside");
    const main = document.querySelector("main");

    function openSidebar() {
        sidebar.classList.add("active");
        toggleBtn.classList.add("hidden"); // Hide Hamburger
    }

    function closeSidebar() {
        sidebar.classList.remove("active");
        toggleBtn.classList.remove("hidden"); // Show Hamburger
    }

    if(toggleBtn) {
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openSidebar();
        });
    }

    if(closeBtn) {
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            closeSidebar();
        });
    }

    // Close when clicking outside on main content
    if(main) {
        main.addEventListener("click", () => {
            if(sidebar.classList.contains("active")) {
                closeSidebar();
            }
        });
    }
});