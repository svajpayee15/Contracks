const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, fhevm } = hre;
const { FhevmType } = require("@fhevm/hardhat-plugin");

describe("Performance FHE Integration", function () {
    let signers;
    let perfContract;
    let contractAddress;
    const cid = "QmPerformance_Job_001";

    before(async function () {
        const s = await ethers.getSigners();
        signers = {
            employer: s[0],
            employee: s[1],
            other: s[2]
        };
    });

    beforeEach(async () => {
        await fhevm.initializeCLIApi();
        const Factory = await ethers.getContractFactory("PerformanceTemplate");
        perfContract = await Factory.deploy();
        contractAddress = await perfContract.getAddress();
    });

    /* --- HELPERS --- */

    async function getLatestBlockTime() {
        const block = await ethers.provider.getBlock("latest");
        return block.timestamp;
    }

    /* -------------------------------------------------------------------------- */
    /* TESTS                                                                      */
    /* -------------------------------------------------------------------------- */

    it("Should complete the full Performance lifecycle: Init -> Sign -> Submit -> Payout", async function () {
        const currentTime = await getLatestBlockTime();
        const deadline = currentTime + 5000;
        
        // 1. INITIALIZE (Employer sets Target: 100, Bonus: 500)
        const initInput = fhevm.createEncryptedInput(contractAddress, signers.employer.address);
        initInput.add64(123n);        // Seed
        initInput.add128(100n);       // Target
        initInput.add128(500n);       // Bonus
        const encInit = await initInput.encrypt();

        await perfContract.connect(signers.employer).initialize(
            signers.employer.address,
            signers.employee.address,
            cid,
            "iv-perf",
            deadline,
            encInit.handles[0],
            encInit.handles[1],
            encInit.handles[2],
            encInit.inputProof
        );

        // 2. SIGN (Employee)
        await perfContract.connect(signers.employee).signAgreement(cid);
        const agreement = await perfContract.performanceAgreements(cid);
        expect(agreement.isSigned).to.be.true;

        // 3. SUBMIT PERFORMANCE (Employee submits 120 - Target met)
        const submitInput = fhevm.createEncryptedInput(contractAddress, signers.employee.address);
        submitInput.add128(120n); 
        const encSubmit = await submitInput.encrypt();

        await perfContract.connect(signers.employee).submitPerformance(
            cid,
            encSubmit.handles[0],
            encSubmit.inputProof
        );

        // 4. EMPLOYER SATISFACTION (Employer sets to TRUE)
        const satInput = fhevm.createEncryptedInput(contractAddress, signers.employer.address);
        satInput.addBool(true);
        const encSat = await satInput.encrypt();

        await perfContract.connect(signers.employer).employerSatisfaction(
            cid,
            encSat.handles[0],
            encSat.inputProof
        );

        // 5. CALCULATE PAYOUT
        await expect(perfContract.connect(signers.employer).calculatePayout(cid))
            .to.emit(perfContract, "PayoutCalculated");

        // 6. VERIFY PAYOUT (Decrypted)
        const updatedAg = await perfContract.performanceAgreements(cid);
        
        // Decrypt Final Payout (Should be 500 because 120 >= 100 AND Satisfaction = true)
        const clearPayout = await fhevm.userDecryptEuint(
            FhevmType.euint128,
            updatedAg.finalPayout,
            contractAddress,
            signers.employee
        );

        expect(clearPayout).to.equal(500n);
    });

    it("Should result in 0 payout if target is not met", async function () {
        const deadline = (await getLatestBlockTime()) + 5000;
        const testCid = "QmFail_Target";

        // Init: Target 100, Bonus 500
        const encInit = await (await fhevm.createEncryptedInput(contractAddress, signers.employer.address))
            .add64(1n).add128(100n).add128(500n).encrypt();
        
        await perfContract.initialize(signers.employer.address, signers.employee.address, testCid, "iv", deadline, 
            encInit.handles[0], encInit.handles[1], encInit.handles[2], encInit.inputProof);

        await perfContract.connect(signers.employee).signAgreement(testCid);

        // Submit: 80 (Target 100 NOT met)
        const encSubmit = await (await fhevm.createEncryptedInput(contractAddress, signers.employee.address))
            .add128(80n).encrypt();
        await perfContract.connect(signers.employee).submitPerformance(testCid, encSubmit.handles[0], encSubmit.inputProof);

        // Employer is satisfied, but target failed
        const encSat = await (await fhevm.createEncryptedInput(contractAddress, signers.employer.address))
            .addBool(true).encrypt();
        await perfContract.connect(signers.employer).employerSatisfaction(testCid, encSat.handles[0], encSat.inputProof);

        await perfContract.calculatePayout(testCid);
        const updatedAg = await perfContract.performanceAgreements(testCid);

        const clearPayout = await fhevm.userDecryptEuint(FhevmType.euint128, updatedAg.finalPayout, contractAddress, signers.employee);
        expect(clearPayout).to.equal(0n);
    });

    it("Should prevent submission after deadline", async function () {
        const deadline = (await getLatestBlockTime()) + 1000;
        const testCid = "QmDeadline_Test";

        // Create input for Init
        const initInput = fhevm.createEncryptedInput(contractAddress, signers.employer.address);
        initInput.add64(1n);   // handle[0]
        initInput.add128(100n); // handle[1]
        initInput.add128(500n); // handle[2]
        const encInit = await initInput.encrypt();

        // FIXED: Mapping handles correctly [0], [1], [2] and then the proof
        await perfContract.connect(signers.employer).initialize(
            signers.employer.address,
            signers.employee.address,
            testCid,
            "iv",
            deadline,
            encInit.handles[0], // _seed
            encInit.handles[1], // _target
            encInit.handles[2], // _bonus
            encInit.inputProof  // _inputProof
        );

        await perfContract.connect(signers.employee).signAgreement(testCid);

        // Advance time past deadline
        await ethers.provider.send("evm_increaseTime", [2000]);
        await ethers.provider.send("evm_mine");

        const encSubmit = await (await fhevm.createEncryptedInput(contractAddress, signers.employee.address))
            .add128(120n).encrypt();

        await expect(
            perfContract.connect(signers.employee).submitPerformance(testCid, encSubmit.handles[0], encSubmit.inputProof)
        ).to.be.revertedWith("Deadline passed");
    });

    it("Should prevent submissions if the contract is not signed", async function () {
        const deadline = (await getLatestBlockTime()) + 5000;
        const testCid = "QmUnsigned_Test";

        // Initialize but DO NOT sign
        const encInit = await (await fhevm.createEncryptedInput(contractAddress, signers.employer.address))
            .add64(1n).add128(100n).add128(500n).encrypt();
        
        await perfContract.initialize(signers.employer.address, signers.employee.address, testCid, "iv", deadline, 
            encInit.handles[0], encInit.handles[1], encInit.handles[2], encInit.inputProof);

        const encSubmit = await (await fhevm.createEncryptedInput(contractAddress, signers.employee.address))
            .add128(120n).encrypt();

        // Should revert because isSigned is false
        await expect(
            perfContract.connect(signers.employee).submitPerformance(testCid, encSubmit.handles[0], encSubmit.inputProof)
        ).to.be.revertedWith("Contract not signed");
    });

    it("Should result in 0 payout if employer is NOT satisfied (even if target is met)", async function () {
        const deadline = (await getLatestBlockTime()) + 5000;
        const testCid = "QmNotSatisfied_Test";

        const encInit = await (await fhevm.createEncryptedInput(contractAddress, signers.employer.address))
            .add64(1n).add128(100n).add128(500n).encrypt();
        
        await perfContract.initialize(signers.employer.address, signers.employee.address, testCid, "iv", deadline, 
            encInit.handles[0], encInit.handles[1], encInit.handles[2], encInit.inputProof);

        await perfContract.connect(signers.employee).signAgreement(testCid);

        // Submit: 150 (Well above target of 100)
        const encSubmit = await (await fhevm.createEncryptedInput(contractAddress, signers.employee.address))
            .add128(150n).encrypt();
        await perfContract.connect(signers.employee).submitPerformance(testCid, encSubmit.handles[0], encSubmit.inputProof);

        // Employer sets satisfaction to FALSE
        const encSat = await (await fhevm.createEncryptedInput(contractAddress, signers.employer.address))
            .addBool(false).encrypt();
        await perfContract.connect(signers.employer).employerSatisfaction(testCid, encSat.handles[0], encSat.inputProof);

        await perfContract.calculatePayout(testCid);
        
        const updatedAg = await perfContract.performanceAgreements(testCid);
        const clearPayout = await fhevm.userDecryptEuint(FhevmType.euint128, updatedAg.finalPayout, contractAddress, signers.employee);
        
        // Payout must be 0 because AND(true, false) = false
        expect(clearPayout).to.equal(0n);
    });

    it("Should prevent unauthorized finalization attempts", async function () {
        const deadline = (await getLatestBlockTime()) + 5000;
        const testCid = "QmAuth_Test";

        const encInit = await (await fhevm.createEncryptedInput(contractAddress, signers.employer.address))
            .add64(1n).add128(100n).add128(500n).encrypt();
        
        await perfContract.initialize(signers.employer.address, signers.employee.address, testCid, "iv", deadline, 
            encInit.handles[0], encInit.handles[1], encInit.handles[2], encInit.inputProof);

        // Random person tries to calculate payout
        await expect(
            perfContract.connect(signers.other).calculatePayout(testCid)
        ).to.be.revertedWith("Unauthorized");
    });
});