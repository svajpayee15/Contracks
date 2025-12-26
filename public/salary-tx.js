import { ABI } from "./salary-abi.js";
const CONTRACT_ADDRESS = "0xC676216cE3236CADCc4F4f7673DF6ad45Fdf7B07";
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

export async function sendSalaryTransaction(iv, seed, _ipfsCID, ui) {
  if (!window.ethereum) return ui.error("First Install Metamask.");

  let provider, signer, contract, instance;
  const Zama = window.relayerSDK;

  try {
    ui.updateStep("step-zama", "active");

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

    // Zama Init
    await Zama.initSDK();

    instance = await Zama.createInstance({
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
      relayerUrl: "https://relayer.testnet.zama.org",
    });

    // Encrypt Inputs
    const input = instance.createEncryptedInput(CONTRACT_ADDRESS, userAddress);

    const getVal = (cls) => document.querySelector("." + cls)?.value || "0";

    input.add64(seed);
    input.add64(BigInt(getVal("base_salary")));
    input.add64(BigInt(getVal("joining_bonus")));
    input.add8(BigInt(getVal("tax_rate")));
    input.add8(BigInt(getVal("increment_rate")));

    const encryptedResult = await input.encrypt();

    ui.updateStep("step-zama", "done");
    ui.updateStep("step-wallet", "active");

    const tx = await contract.initialize(
      userAddress,
      getVal("employee_wallet"),
      _ipfsCID,
      iv,
      encryptedResult.handles[0],
      encryptedResult.handles[1],
      encryptedResult.handles[2],
      encryptedResult.handles[3],
      encryptedResult.handles[4],
      encryptedResult.inputProof
    );

    ui.updateStep("step-wallet", "done");
    ui.updateStep("step-mining", "active");

    console.log("⌛ Transaction is being processed:", tx.hash);
    await tx.wait();

    ui.updateStep("step-mining", "done");
    ui.updateStep("step-indexing", "active");

    await fetch("/api/save-agreement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ipfsCID: _ipfsCID,
        sender: userAddress,
        receiver: [getVal("employee_wallet")],
        type: "salary",
      }),
    });

    await new Promise((r) => setTimeout(r, 600));

    ui.updateStep("step-indexing", "done");
    ui.complete();

  } catch (err) {
    console.error("Tx Error:", err);

    if (
      err.code === 4001 ||
      (err.info && err.info.error && err.info.error.code === 4001)
    ) {
      ui.error("You rejected the transaction.");
    } else {
      ui.error(err.shortMessage || err.message || "Transaction Failed");
    }
  }
}
