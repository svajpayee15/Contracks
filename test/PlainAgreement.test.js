const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, fhevm } = hre;
const { FhevmType } = require("@fhevm/hardhat-plugin");

describe("Plain Agreement FHE Integration", function () {
    let signers;
    let plainContract;
    let contractAddress;
    const cid = "QmPlain_Doc_001";
    const iv = "iv_content::iv_metadata"; // Simulating the combined IV

    before(async function () {
        const s = await ethers.getSigners();
        signers = {
            sender: s[0],
            receiver: s[1],
            other: s[2]
        };
    });

    beforeEach(async () => {
        // Initialize FHEVM environment for the test
        await fhevm.initializeCLIApi();
        
        const Factory = await ethers.getContractFactory("PlainAgreement");
        plainContract = await Factory.deploy();
        contractAddress = await plainContract.getAddress();
    });

    /* -------------------------------------------------------------------------- */
    /* TESTS                                                                      */
    /* -------------------------------------------------------------------------- */

    it("Should complete the full lifecycle: Init -> Sign -> Decrypt", async function () {
        // 1. INITIALIZE (Sender creates agreement, Encrypts Seed: 123456)
        const input = fhevm.createEncryptedInput(contractAddress, signers.sender.address);
        input.add64(123456n); // The Seed
        const encInput = await input.encrypt();

        await plainContract.connect(signers.sender).initialize(
            signers.receiver.address,
            cid,
            iv,
            encInput.handles[0],
            encInput.inputProof
        );

        // Verify Initial State
        const agreement = await plainContract.agreements(cid);
        expect(agreement.sender).to.equal(signers.sender.address);
        expect(agreement.receiver).to.equal(signers.receiver.address);
        expect(agreement.isSigned).to.be.false;

        // 2. SIGN (Receiver signs)
        await expect(plainContract.connect(signers.receiver).signAgreement(cid))
            .to.emit(plainContract, "AgreementSigned")
            .withArgs(cid, signers.receiver.address);

        const updatedAgreement = await plainContract.agreements(cid);
        expect(updatedAgreement.isSigned).to.be.true;

        // 3. DECRYPTION (Verify Receiver can access the seed)
        // In FHEVM tests, we verify we can decrypt the stored handle using the authorized account
        const clearSeed = await fhevm.userDecryptEuint(
            FhevmType.euint64,
            updatedAgreement.eSeed,
            contractAddress,
            signers.receiver // Receiver should be allowed
        );

        expect(clearSeed).to.equal(123456n);
    });

    it("Should allow Sender to decrypt their own seed even before signing", async function () {
        const input = fhevm.createEncryptedInput(contractAddress, signers.sender.address);
        input.add64(999n);
        const encInput = await input.encrypt();

        await plainContract.connect(signers.sender).initialize(
            signers.receiver.address,
            cid,
            iv,
            encInput.handles[0],
            encInput.inputProof
        );

        const agreement = await plainContract.agreements(cid);

        const clearSeed = await fhevm.userDecryptEuint(
            FhevmType.euint64,
            agreement.eSeed,
            contractAddress,
            signers.sender
        );

        expect(clearSeed).to.equal(999n);
    });

    it("Should prevent duplicate initialization for the same CID", async function () {
        const input = fhevm.createEncryptedInput(contractAddress, signers.sender.address);
        input.add64(1n);
        const encInput = await input.encrypt();

        // First Init
        await plainContract.connect(signers.sender).initialize(
            signers.receiver.address,
            cid,
            iv,
            encInput.handles[0],
            encInput.inputProof
        );

        // Second Init (Should Fail)
        await expect(
            plainContract.connect(signers.sender).initialize(
                signers.receiver.address,
                cid,
                "new_iv",
                encInput.handles[0],
                encInput.inputProof
            )
        ).to.be.revertedWith("Exists");
    });

    it("Should prevent unauthorized users from signing", async function () {
        const input = fhevm.createEncryptedInput(contractAddress, signers.sender.address);
        input.add64(555n);
        const encInput = await input.encrypt();

        await plainContract.connect(signers.sender).initialize(
            signers.receiver.address,
            cid,
            iv,
            encInput.handles[0],
            encInput.inputProof
        );

        // Random user tries to sign
        await expect(
            plainContract.connect(signers.other).signAgreement(cid)
        ).to.be.revertedWith("Only Receiver can sign");
    });

    it("Should prevent double signing", async function () {
        const input = fhevm.createEncryptedInput(contractAddress, signers.sender.address);
        input.add64(111n);
        const encInput = await input.encrypt();

        await plainContract.connect(signers.sender).initialize(
            signers.receiver.address,
            cid,
            iv,
            encInput.handles[0],
            encInput.inputProof
        );

        // First Sign
        await plainContract.connect(signers.receiver).signAgreement(cid);

        // Second Sign (Should Fail)
        // The contract requires !isSigned
        await expect(
            plainContract.connect(signers.receiver).signAgreement(cid)
        ).to.be.reverted; 
    });
});