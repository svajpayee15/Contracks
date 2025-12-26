import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

const CONTRACT_ADDRESS = "0x02f397462F05CCEf87F3ED51793B4b7bB9524A49"; 

const ABI = [
    "function initialize(address _receiver, string _ipfsCID, string _iv, bytes _seed, bytes _inputProof) public",
    "function signAgreement(string _cid) public",
    "function agreements(string) view returns (address, string, string, uint256, bool, address)"
];

export async function sendPlainTransaction(iv, seed, _ipfsCID, ui) {
    if (!window.ethereum) return ui.error("Install Metamask");

    try {
        ui.updateStep("step-zama", "active");
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

        // 1. Zama Setup
        const Zama = window.relayerSDK;
        await Zama.initSDK();
        const instance = await Zama.createInstance({
            chainId: 11155111, 
            gatewayChainId: 10901, 
            network: window.ethereum,
            relayerUrl: "https://relayer.testnet.zama.org",
            aclContractAddress: "0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D",
            kmsContractAddress: "0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A",
            inputVerifierContractAddress: "0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0",
            verifyingContractAddressDecryption: "0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478",
            verifyingContractAddressInputVerification: "0x483b9dE06E4E4C7D35CCf5837A1668487406D955",
        });

        // 2. Prepare Seed for FHE (Convert Uint8Array to BigInt 64-bit)
        // We take the first 8 bytes of the AES seed to store on-chain as the 'master key' ref
        let seedInt;
        if (seed instanceof Uint8Array) {
            // Hex string from first 8 bytes
            const hex = "0x" + Array.from(seed.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
            seedInt = BigInt(hex);
        } else {
            seedInt = BigInt(seed);
        }

        // 3. Encrypt Seed
        const input = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);
        input.add64(seedInt); 
        const encrypted = await input.encrypt();

        ui.updateStep("step-zama", "done");
        ui.updateStep("step-wallet", "active");

        // 4. Get Receiver
        // We try to find the input; if it's missing (e.g. user deleted it), we default to sender for safety testing
        const receiverInput = document.querySelector(".receiver_wallet");
        const receiver = receiverInput ? receiverInput.value : userAddress;

        if(!ethers.isAddress(receiver)) throw new Error("Invalid Receiver Address");

        // 5. Send Transaction
        const tx = await contract.initialize(
            receiver,
            _ipfsCID,
            iv, // The combined "contentIv::metaIv" string
            encrypted.handles[0],
            encrypted.inputProof
        );

        ui.updateStep("step-wallet", "done");
        ui.updateStep("step-mining", "active");
        
        console.log("Tx Hash:", tx.hash);
        await tx.wait();

        ui.updateStep("step-mining", "done");
        ui.updateStep("step-indexing", "active");

        // 6. Save to DB
        await fetch("/api/save-agreement", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ipfsCID: _ipfsCID,
                sender: userAddress,
                receiver: [receiver],
                type: "plain",
                fileName: "General Agreement",
                createdAt: new Date().toISOString()
            }),
        });

        ui.updateStep("step-indexing", "done");
        ui.complete();

    } catch (err) {
        console.error(err);
        // Handle User Reject vs Error
        if (err.code === 4001 || (err.info && err.info.error && err.info.error.code === 4001)) {
             ui.error("Transaction Rejected");
        } else {
             ui.error(err.shortMessage || err.message || "Transaction Failed");
        }
    }
}