import { ABI } from "./ffp-abi.js"
const CONTRACT_ADDRESS = "0x98FB4c8963edAccA8e83a82C157797a4305455Ab"
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

export async function sendFFPTransaction(iv, seed, _ipfsCID, ui, data) {
    try {
        const { descriptions, amounts, penalties, deadlines } = data;

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        
        const Zama = window.relayerSDK;
        await Zama.initSDK();
        const instance = await Zama.createInstance({aclContractAddress: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
      // KMS_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain)
      kmsContractAddress: "0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A",
      // INPUT_VERIFIER_CONTRACT_ADDRESS (FHEVM Host chain)
      inputVerifierContractAddress:"0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0",
      // DECRYPTION_ADDRESS (Gateway chain)
      verifyingContractAddressDecryption:"0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478",
      // INPUT_VERIFICATION_ADDRESS (Gateway chain)
      verifyingContractAddressInputVerification:"0x483b9dE06E4E4C7D35CCf5837A1668487406D955",
      // FHEVM Host chain id
      chainId: 11155111,
      // Gateway chain id
      gatewayChainId: 10901,
      // Optional RPC provider to host chain
      network: window.ethereum,
      // Relayer URL
      relayerUrl: "https://relayer.testnet.zama.org",});

        // 2. CREATE ENCRYPTED INPUT
        // We pack EVERYTHING into one input object to save gas and proof time
        const input = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);

        // A. Add Seed (Index 0)
        input.add64(BigInt(seed)); 

        // B. Add All Amounts (Index 1 to N)
        amounts.forEach(amt => {
            input.add64(BigInt(amt)); // Amounts are euint64
        });

        // C. Add All Penalties (Index N+1 to End)
        penalties.forEach(pen => {
            input.add8(Number(pen)); // Penalties are euint8
        });

        // 3. Encrypt (Generates 1 Proof for all items)
        console.log("🔐 Generating Zero-Knowledge Proof for Array...");
        
        const encrypted = await input.encrypt();
        
        // 4. SLICE HANDLES
        // The encrypted.handles array contains [Seed, Amt1, Amt2..., Pen1, Pen2...]
        // We need to slice it back into separate arrays for Solidity.
        
        const seedHandle = encrypted.handles[0];
        
        const count = amounts.length; // How many milestones
        
        // Slice Amounts: start at 1, end at 1 + count
        const amountHandles = encrypted.handles.slice(1, 1 + count);
        
        // Slice Penalties: start at 1 + count, end at end
        const penaltyHandles = encrypted.handles.slice(1 + count);

        ui.updateStep("step-zama", "done");

        // 5. Send Transaction
        ui.updateStep("step-wallet", "active");
        
        // Get Client/Vendor from inputs (Assuming they are in DOM)
        const clientAddr = userAddress; // Creator is client
        const vendorAddr = document.querySelector(".vendor_wallet")?.value || "0x0000000000000000000000000000000000000000"; // Fallback if missing

        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        const tx = await contract.initialize(
            clientAddr,
            vendorAddr,
            _ipfsCID,
            iv,
            descriptions,   // string[]
            deadlines,      // uint64[]
            seedHandle,     // bytes (single handle)
            amountHandles,  // bytes[] (array of handles)
            penaltyHandles, // bytes[] (array of handles)
            encrypted.inputProof // Single proof for all
        );

        ui.updateStep("step-wallet", "done");
        ui.updateStep("step-mining", "active");

        console.log("Tx Hash:", tx.hash);
        await tx.wait();

        
        ui.updateStep("step-mining", "done");
        ui.updateStep("step-indexing", "active");

        await fetch("/api/save-agreement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ipfsCID: _ipfsCID,
        sender: clientAddr,
        receiver: [document.querySelector(".vendor_wallet").value],
        type: "ffp",
      }),
    });

    await new Promise((r) => setTimeout(r, 600));

    ui.updateStep("step-indexing", "done");
    ui.complete();

    location.href = "/inbox"

    } catch (error) {
        console.error("FFP Transaction Failed:", error);
        ui.error(error.reason || error.message);
    }
}