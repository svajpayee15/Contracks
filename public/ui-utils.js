// ui-utils.js

export const ui = {
    // 1. Explicit Initialization (Call this once at start of app)
    init: () => {
        // Prevent duplicate injection
        if (document.getElementById("loading-overlay")) return;

        // Loader HTML
        const loader = document.createElement("div");
        loader.id = "loading-overlay";
        loader.className = "overlay hidden"; // Start hidden
        loader.innerHTML = `
            <div class="process-modal" style="width: auto; padding: 20px; text-align: center;">
                <div class="spinner"></div>
                <div class="loading-text" id="loader-msg">Processing...</div>
                <div class="loading-subtext" id="loader-sub" style="font-size:0.85rem; color:#666; margin-top:5px;">Please confirm in wallet</div>
            </div>
        `;
        document.body.appendChild(loader);

        // Toast Container
        const toasts = document.createElement("div");
        toasts.id = "toast-container";
        document.body.appendChild(toasts);
    },

    // 2. Loader Functions
    showLoader: (msg = "Processing...", sub = "Please confirm in wallet") => {
        const el = document.getElementById("loading-overlay");
        if(el) {
            document.getElementById("loader-msg").innerText = msg;
            const subEl = document.getElementById("loader-sub");
            if(subEl) subEl.innerText = sub;
            
            el.classList.remove("hidden");
            el.style.display = "flex"; // Ensure flex for centering
        }
    },
    
    hideLoader: () => {
        const el = document.getElementById("loading-overlay");
        if(el) {
            el.classList.add("hidden");
            // Small timeout to allow fade out transition if you added CSS transitions
            setTimeout(() => {
                if(el.classList.contains("hidden")) el.style.display = "none";
            }, 200);
        }
    },

    // 3. Toast Functions
    showToast: (msg, type = "info") => {
        const container = document.getElementById("toast-container");
        if(!container) return;

        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        let icon = "info";
        let color = "#3498db";

        if(type === "success") { icon = "check_circle"; color = "#27ae60"; }
        if(type === "error")   { icon = "error"; color = "#e74c3c"; }

        toast.innerHTML = `
            <span class="material-symbols-outlined toast-icon" style="color:${color}">${icon}</span>
            <span class="toast-msg">${msg}</span>
        `;

        container.appendChild(toast);

        // Animate In (Requires CSS for transform/transition)
        setTimeout(() => toast.style.transform = "translateX(0)", 10);

        // Remove after 3.5 seconds
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(100%)"; // Slide out
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
};