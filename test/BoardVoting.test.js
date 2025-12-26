const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, fhevm } = hre;

describe("BoardVoting Integration Suite", function () {
    let signers;
    let votingContract;
    let contractAddress;

    before(async function () {
        const s = await ethers.getSigners();
        signers = {
            admin: s[0],
            alice: s[1],
            bob: s[2],
            other: s[3]
        };
    });

    beforeEach(async () => {
        await fhevm.initializeCLIApi();
        const Factory = await ethers.getContractFactory("BoardVotingTemplate");
        votingContract = await Factory.deploy();
        contractAddress = await votingContract.getAddress();
    });

    /* --- HELPERS --- */

    async function getLatestBlockTime() {
        const block = await ethers.provider.getBlock("latest");
        return block.timestamp;
    }

    async function encryptVote(signer, choice) {
        const builder = fhevm.createEncryptedInput(contractAddress, signer.address);
        builder.addBool(choice);
        const enc = await builder.encrypt();
        return { handle: enc.handles[0], inputProof: enc.inputProof };
    }

    async function performFinalization(projectCid, expectedResult) {
        await votingContract.connect(signers.admin).finalizeVoting(projectCid);
        
        const config = await votingContract.votingAgreements(projectCid);
        const decryption = await fhevm.publicDecrypt([config.isPassed]); 
        
        const decryptedValue = decryption.clearValues[config.isPassed];
        const { decryptionProof } = decryption;

        await expect(votingContract.connect(signers.admin).completeFinalization(
            projectCid,
            decryptedValue,
            decryptionProof
        )).to.emit(votingContract, "statusFinalized")
          .withArgs(projectCid, expectedResult);
    }

    /* --- TEST CASES --- */

    it("Should execute the full voting lifecycle: Init -> Vote -> Finalize", async function () {
        const currentTime = await getLatestBlockTime();
        const deadline = currentTime + 1000;
        const testCid = "PROPOSAL_1";

        const input = await fhevm.createEncryptedInput(contractAddress, signers.admin.address);
        input.add64(12345n);
        const encInit = await input.encrypt();

        await votingContract.connect(signers.admin).initialize(
            signers.admin.address, testCid, "iv", deadline, 
            [signers.alice.address, signers.bob.address], [60, 30],
            encInit.handles[0], encInit.inputProof
        );

        const aliceVote = await encryptVote(signers.alice, true);
        await votingContract.connect(signers.alice).castVote(testCid, aliceVote.handle, aliceVote.inputProof);

        await ethers.provider.send("evm_increaseTime", [2000]);
        await ethers.provider.send("evm_mine");

        await performFinalization(testCid, true);
    });

    it("Should correctly reject a proposal if YES votes do not reach majority", async function () {
        const currentTime = await getLatestBlockTime();
        const deadline = currentTime + 1000;
        const testCid = "PROPOSAL_REJECT";

        const input = await fhevm.createEncryptedInput(contractAddress, signers.admin.address);
        input.add64(1n);
        const encInit = await input.encrypt();

        await votingContract.initialize(
            signers.admin.address, testCid, "iv", deadline, 
            [signers.alice.address, signers.bob.address], [60, 30],
            encInit.handles[0], encInit.inputProof
        );

        const aliceVote = await encryptVote(signers.alice, false); // NO
        await votingContract.connect(signers.alice).castVote(testCid, aliceVote.handle, aliceVote.inputProof);

        const bobVote = await encryptVote(signers.bob, true); // YES
        await votingContract.connect(signers.bob).castVote(testCid, bobVote.handle, bobVote.inputProof);

        await ethers.provider.send("evm_increaseTime", [2000]);
        await ethers.provider.send("evm_mine");

        await performFinalization(testCid, false);
    });

    it("Should reject the proposal in a 50/50 tie", async function () {
        const currentTime = await getLatestBlockTime();
        const deadline = currentTime + 1000;
        const testCid = "PROPOSAL_TIE";

        const input = await fhevm.createEncryptedInput(contractAddress, signers.admin.address);
        input.add64(2n);
        const encInit = await input.encrypt();

        await votingContract.initialize(
            signers.admin.address, testCid, "iv", deadline, 
            [signers.alice.address, signers.bob.address], [50, 50],
            encInit.handles[0], encInit.inputProof
        );

        const aliceVote = await encryptVote(signers.alice, true); // YES
        await votingContract.connect(signers.alice).castVote(testCid, aliceVote.handle, aliceVote.inputProof);

        const bobVote = await encryptVote(signers.bob, false); // NO
        await votingContract.connect(signers.bob).castVote(testCid, bobVote.handle, bobVote.inputProof);

        await ethers.provider.send("evm_increaseTime", [2000]);
        await ethers.provider.send("evm_mine");

        await performFinalization(testCid, false);
    });

    it("Should prevent double voting", async function() {
        const currentTime = await getLatestBlockTime();
        const deadline = currentTime + 1000;
        const testCid = "PROPOSAL_DOUBLE";
        
        const enc = await fhevm.createEncryptedInput(contractAddress, signers.admin.address);
        enc.add64(1n);
        const e = await enc.encrypt();
        
        await votingContract.initialize(
            signers.admin.address, testCid, "iv", deadline, 
            [signers.alice.address], [10], e.handles[0], e.inputProof
        );

        const vote = await encryptVote(signers.alice, true);
        await votingContract.connect(signers.alice).castVote(testCid, vote.handle, vote.inputProof);

        await expect(
            votingContract.connect(signers.alice).castVote(testCid, vote.handle, vote.inputProof)
        ).to.be.revertedWith("Already voted");
    });
});