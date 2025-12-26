const { expect } = require("chai");
const hre = require("hardhat");
const { ethers, fhevm } = hre;
const { FhevmType } = require("@fhevm/hardhat-plugin");

describe("Salary FHE Integration", function () {
    let signers;
    let salaryContract;
    let contractAddress;
    const cid = "QmSalary_Employee_001";

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
        const Factory = await ethers.getContractFactory("SalaryTemplate");
        salaryContract = await Factory.deploy();
        contractAddress = await salaryContract.getAddress();
    });

    /* --- HELPERS --- */

    async function getLatestBlockTime() {
        const block = await ethers.provider.getBlock("latest");
        return block.timestamp;
    }

    /* -------------------------------------------------------------------------- */
    /* TESTS                                                                      */
    /* -------------------------------------------------------------------------- */

    it("Should initialize and handle encrypted salary increment correctly", async function () {
        // 1. INITIALIZE (Salary: 5000, Bonus: 1000, Tax: 20%, Raise: 10%)
        const input = fhevm.createEncryptedInput(contractAddress, signers.employer.address);
        input.add64(1n);     // seed
        input.add64(5000n);  // baseSalary
        input.add64(1000n);  // joiningBonus
        input.add8(20);      // taxRate
        input.add8(10);      // incrementRate
        const enc = await input.encrypt();

        await salaryContract.connect(signers.employer).initialize(
            signers.employer.address,
            signers.employee.address,
            cid,
            "iv-salary",
            enc.handles[0],
            enc.handles[1],
            enc.handles[2],
            enc.handles[3],
            enc.handles[4],
            enc.inputProof
        );

        // 2. SIGN (Employee)
        await salaryContract.connect(signers.employee).signAgreement(cid);
        const agreement = await salaryContract.salaryAgreement(cid);
        expect(agreement.isSigned).to.be.true;

        // 3. TRY INCREMENT EARLY (Should Fail)
        await expect(
            salaryContract.connect(signers.employer).increment(cid)
        ).to.be.revertedWith("Too early for raise");

        // 4. TRAVEL 1 YEAR FORWARD (365 days)
        await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");

        // 5. PERFORM INCREMENT (Blindly calculating 5000 + 10%)
        await expect(salaryContract.connect(signers.employer).increment(cid))
            .to.emit(salaryContract, "SalaryIncremented");

        // 6. VERIFY NEW SALARY (Should be 5500)
        const updatedAg = await salaryContract.salaryAgreement(cid);
        const clearSalary = await fhevm.userDecryptEuint(
            FhevmType.euint64,
            updatedAg.baseSalary,
            contractAddress,
            signers.employee
        );

        expect(clearSalary).to.equal(5500n);
    });

    it("Should only allow the employer to initialize", async function () {
        const input = fhevm.createEncryptedInput(contractAddress, signers.other.address);
        input.add64(1n).add64(1n).add64(1n).add8(1).add8(1);
        const enc = await input.encrypt();

        await expect(
            salaryContract.connect(signers.other).initialize(
                signers.employer.address, signers.employee.address, "FAIL_INIT", "iv",
                enc.handles[0], enc.handles[1], enc.handles[2], enc.handles[3], enc.handles[4], enc.inputProof
            )
        ).to.be.revertedWith("Only Employer can init");
    });

    it("Should only allow the designated employee to sign", async function () {
        // Init first
        const input = fhevm.createEncryptedInput(contractAddress, signers.employer.address);
        input.add64(1n).add64(5000n).add64(1n).add8(1).add8(1);
        const enc = await input.encrypt();
        await salaryContract.initialize(signers.employer.address, signers.employee.address, "SIGN_TEST", "iv",
            enc.handles[0], enc.handles[1], enc.handles[2], enc.handles[3], enc.handles[4], enc.inputProof);

        // Random user tries to sign
        await expect(
            salaryContract.connect(signers.other).signAgreement("SIGN_TEST")
        ).to.be.revertedWith("Only Employee can sign");
    });
});