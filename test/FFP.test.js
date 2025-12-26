const { expect } = require("chai");
const { ethers, fhevm } = require("hardhat"); // fhevm is imported from hardhat
const { FhevmType } = require("@fhevm/hardhat-plugin"); // Needed for type selection in decryption

describe("FFPTemplate FHE Integration", function () {
    let signers;
    let ffpContract;
    let contractAddress;
    const cid = "QmFFP_Array_Test_789";

    before(async function () {
        const ethSigners = await ethers.getSigners();
        signers = {
            client: ethSigners[0],
            vendor: ethSigners[1],
            randomUser: ethSigners[2]
        };
    });

    beforeEach(async () => {
        const FFPTemplate = await ethers.getContractFactory("FFPTemplate");
        ffpContract = await FFPTemplate.deploy();
        contractAddress = await ffpContract.getAddress();
    });

    it("Should initialize multiple milestones and apply penalty correctly", async function () {
        // --- 1. PREPARE DATA ---
        const seedValue = 123456;
        const descriptions = ["UI Design", "Backend Dev"];
        const deadlines = [
            Math.floor(Date.now() / 1000) - 86400, // Overdue
            Math.floor(Date.now() / 1000) + 86400  // Upcoming
        ];
        const amounts = [1000, 2000];
        const penalties = [10, 5];

        // --- 2. PACK & ENCRYPT INPUTS ---
        // Using the 'fhevm' object imported from 'hardhat'
        const input = await fhevm.createEncryptedInput(contractAddress, signers.client.address);
        
        input.add64(seedValue);
        amounts.forEach(amt => input.add64(amt));
        penalties.forEach(pnl => input.add8(pnl));

        const encrypted = await input.encrypt();

        const seedHandle = encrypted.handles[0];
        const amountHandles = [encrypted.handles[1], encrypted.handles[2]];
        const penaltyHandles = [encrypted.handles[3], encrypted.handles[4]];

        // --- 3. INITIALIZE CONTRACT ---
        await ffpContract.connect(signers.client).initialize(
            signers.client.address,
            signers.vendor.address,
            cid,
            "iv-mock-string",
            descriptions,
            deadlines,
            seedHandle,
            amountHandles,
            penaltyHandles,
            encrypted.inputProof
        );

        // --- 4. APPLY PENALTY (Math Test) ---
        await ffpContract.connect(signers.client).penalize(0, cid);

        // --- 5. VERIFY RESULTS ---
        const milestone0 = await ffpContract.getMilestone(cid, 0);
        
        // Use userDecryptEuint as per Zama docs
        const clearAmount = await fhevm.userDecryptEuint(
            FhevmType.euint64,
            milestone0.amount,
            contractAddress,
            signers.client
        );

        expect(Number(clearAmount)).to.equal(900);
        
        const agDetails = await ffpContract.ffpAgreements(cid);
        const clearTotalBudget = await fhevm.userDecryptEuint(
            FhevmType.euint64,
            agDetails.eTotalBudget,
            contractAddress,
            signers.client
        );

        expect(Number(clearTotalBudget)).to.equal(3000);
    });

    it("Should let Milestone submission only from vendor", async function() {
        // Setup: Init with one milestone
        const input = await fhevm.createEncryptedInput(contractAddress, signers.client.address);
        input.add64(1).add64(1000).add8(10);
        const enc = await input.encrypt();

        await ffpContract.connect(signers.client).initialize(
            signers.client.address, signers.vendor.address, "CID_VEND", "iv", ["Work"], 
            [0], enc.handles[0], [enc.handles[1]], [enc.handles[2]], enc.inputProof
        );

        // Client attempt (Should fail)
        await expect(
            ffpContract.connect(signers.client).completeMilestone(0, "CID_VEND")
        ).to.be.revertedWith("Only Vendor can complete Milestones");

        // Vendor attempt (Should pass)
        await ffpContract.connect(signers.vendor).completeMilestone(0, "CID_VEND");
        const m = await ffpContract.getMilestone("CID_VEND", 0);
        expect(m.status).to.equal(1); // Completed
    });

    it("Should approve the Milestone submission only from client", async function() {
        // Setup: Init and Complete
        const input = await fhevm.createEncryptedInput(contractAddress, signers.client.address);
        input.add64(1).add64(1000).add8(10);
        const enc = await input.encrypt();

        await ffpContract.connect(signers.client).initialize(
            signers.client.address, signers.vendor.address, "CID_APPROVE", "iv", ["Work"], 
            [0], enc.handles[0], [enc.handles[1]], [enc.handles[2]], enc.inputProof
        );
        await ffpContract.connect(signers.vendor).completeMilestone(0, "CID_APPROVE");

        // Vendor attempt (Should fail)
        await expect(
            ffpContract.connect(signers.vendor).approveMileStone(0, "CID_APPROVE")
        ).to.be.revertedWith("Only Client can approve Milestones");

        // Client attempt (Should pass)
        await ffpContract.connect(signers.client).approveMileStone(0, "CID_APPROVE");
        const m = await ffpContract.getMilestone("CID_APPROVE", 0);
        expect(m.status).to.equal(2); // Paid
    });

    it("Should handle signing correctly", async function() {
        const input = await fhevm.createEncryptedInput(contractAddress, signers.client.address);
        input.add64(1).add64(1000).add8(10);
        const enc = await input.encrypt();

        await ffpContract.connect(signers.client).initialize(
            signers.client.address, signers.vendor.address, "CID_SIGN", "iv", ["Work"], 
            [0], enc.handles[0], [enc.handles[1]], [enc.handles[2]], enc.inputProof
        );

        await ffpContract.connect(signers.vendor).signAgreement("CID_SIGN");
        const ag = await ffpContract.ffpAgreements("CID_SIGN");
        expect(ag.isSigned).to.be.true;

        await expect(
            ffpContract.connect(signers.vendor).signAgreement("CID_SIGN")
        ).to.be.revertedWith("Already signed");
    });
});