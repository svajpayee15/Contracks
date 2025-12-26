// crypto-seed.js

/**
 * 1. Generate a random 64-bit number (The Seed)
 */
export function generateRandomSeed() {
    const array = new BigUint64Array(1);
    window.crypto.getRandomValues(array);
    return array[0]; 
}

/**
 * 2. Derive AES Key from Seed (One-Way)
 */
export async function deriveKeyFromSeed(seedBigInt) {
    const encoder = new TextEncoder();
    // Ensure we convert BigInt to string consistently
    const data = encoder.encode(seedBigInt.toString());
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    
    return window.crypto.subtle.importKey(
        'raw', 
        hashBuffer, 
        { name: 'AES-GCM' }, 
        false, 
        ['encrypt', 'decrypt']
    );
}

/**
 * 3. Encrypt the HTML
 */
export async function encryptFile(text, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV
    const encoded = new TextEncoder().encode(text);
    
    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoded
    );

    return { 
        blob: new Blob([encrypted]), 
        iv: toHexString(iv) // Returns Hex String (e.g., "a4f2...")
    };
}

/**
 * 4. Decrypt the File
 * 🛠️ FIX: Changed parameter name to ivHex to be clear
 */
/**
 * 4. Decrypt the File (Robust Version)
 */
export async function decryptFile(inputData, key, ivHex) {
    if (!inputData) throw new Error("decryptFile: Input data is null or undefined");
    if (!ivHex) throw new Error("decryptFile: IV is missing");

    // --- STEP 1: Normalize IV ---
    const iv = fromHexString(ivHex);

    // --- STEP 2: Normalize Input to ArrayBuffer ---
    let encryptedBuffer;

    if (inputData instanceof Blob) {
        // Case A: Input is a Blob (common from fetch response.blob())
        encryptedBuffer = await inputData.arrayBuffer();
    
    } else if (inputData instanceof ArrayBuffer) {
        // Case B: Already an ArrayBuffer
        encryptedBuffer = inputData;
    
    } else if (ArrayBuffer.isView(inputData)) {
        // Case C: Uint8Array or Buffer
        encryptedBuffer = inputData.buffer;

    } else if (typeof inputData === 'string') {
        // Case D: Base64 String (clean it first)
        let base64 = inputData;
        if (base64.includes(',')) base64 = base64.split(',')[1];
        
        // Remove whitespace just in case
        base64 = base64.replace(/\s/g, '');

        try {
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            encryptedBuffer = bytes.buffer;
        } catch (e) {
            console.error("Base64 conversion failed:", e);
            throw new Error("Input string is not valid Base64");
        }
    } else {
        console.error("Unknown input type:", typeof inputData, inputData);
        throw new Error("Input data must be Blob, ArrayBuffer, or Base64 String");
    }

    // --- STEP 3: Decrypt ---
    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encryptedBuffer
        );

        const decoder = new TextDecoder();
        return decoder.decode(decryptedBuffer);
        
    } catch (err) {
        console.error("Decryption details:", err);
        throw new Error("Decryption Failed. Key mismatch or corrupted data.");
    }
}

/**
 * 5. Helper: Blob to Base64
 */
export function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

/**
 * 🛠️ HELPER: Uint8Array -> Hex String
 */
function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}

/**
 * 🛠️ HELPER: Hex String -> Uint8Array (Added this for decryption)
 */
function fromHexString(hexString) {
    // Remove '0x' prefix if present
    if (hexString.startsWith('0x')) hexString = hexString.slice(2);
    
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    }
    return bytes;
}