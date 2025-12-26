import { ABI } from "./boardVoting-abi.js"
const CONTRACT_ADDRESS = "0x093Ce64c121d51FC03d71C25B715E7C1E4374C53"
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

export async function sendBoardVotingTransaction(iv, seed, _ipfsCID, ui, data) {
    try {
        const { whitelistArray, weightageArray, deadline } = data;

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        
        const Zama = window.relayerSDK;
        await Zama.initSDK();
        const instance = await Zama.createInstance({
            aclContractAddress: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
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

        const input = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);

        input.add64(BigInt(seed)); 
        
        const encrypted = await input.encrypt();

        ui.updateStep("step-zama", "done");
        ui.updateStep("step-wallet", "active");
        
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        const tx = await contract.initialize(
            userAddress,
            _ipfsCID,
            iv,
            deadline,
            whitelistArray,
            weightageArray, 
            encrypted.handles[0],
            encrypted.inputProof
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
        sender: userAddress,
        receiver: whitelistArray,
        type: "voting",
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