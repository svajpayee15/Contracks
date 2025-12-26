// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { FHE, euint64, euint8, externalEuint64, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract SalaryTemplate is ZamaEthereumConfig {
    
    struct Employment {
        address employer;
        address employee;
        uint64 startDateOfIncrement;
        string ipfsCID;
        string iv;
        euint64 seed;
        euint64 baseSalary;
        euint64 joiningBonus;
        euint8 taxRate;
        euint8 incrementRate;
        bool isSigned;
    }

    mapping(string => Employment) public salaryAgreement;

    event AgreementSigned(string indexed ipfsCID, address indexed employee);
    event SalaryIncremented(address indexed employee, uint64 newDate);

    function initialize(
        address _employer,
        address _employee,
        string memory _ipfsCID,
        string memory _iv,
        externalEuint64 _seed,
        externalEuint64 _baseSalary,
        externalEuint64 _joiningBonus,
        externalEuint8 _taxRate,
        externalEuint8 _incrementRate,
        bytes calldata _inputProof
    ) public {
        require(msg.sender == _employer, "Only Employer can init");
        require(salaryAgreement[_ipfsCID].employer == address(0), "Agreement already exists");

        euint64 eSeed = FHE.fromExternal(_seed, _inputProof);
        euint64 eBaseSalary = FHE.fromExternal(_baseSalary, _inputProof);
        euint64 eJoiningBonus = FHE.fromExternal(_joiningBonus, _inputProof);
        euint8 eTaxRate = FHE.fromExternal(_taxRate, _inputProof);
        euint8 eIncrementRate = FHE.fromExternal(_incrementRate, _inputProof);

        _allowAll(eSeed, _employer, _employee);
        _allowAll(eBaseSalary, _employer, _employee);
        _allowAll(eJoiningBonus, _employer, _employee);
        _allowAll(eTaxRate, _employer, _employee);
        _allowAll(eIncrementRate, _employer, _employee);

        salaryAgreement[_ipfsCID] = Employment({
            employer: _employer,
            employee: _employee,
            ipfsCID: _ipfsCID,
            iv: _iv,
            seed: eSeed,
            startDateOfIncrement: uint64(block.timestamp),
            baseSalary: eBaseSalary,
            joiningBonus: eJoiningBonus,
            taxRate: eTaxRate,
            incrementRate: eIncrementRate,
            isSigned: false
        });
    }

    function signAgreement(string memory _ipfsCID) public {
        require(msg.sender == salaryAgreement[_ipfsCID].employee, "Only Employee can sign");
        require(!salaryAgreement[_ipfsCID].isSigned, "Already signed");

        salaryAgreement[_ipfsCID].isSigned = true; 
        emit AgreementSigned(salaryAgreement[_ipfsCID].ipfsCID, msg.sender);
    }

    function increment(string memory _ipfsCID) public {
        require(block.timestamp >= salaryAgreement[_ipfsCID].startDateOfIncrement + 365 days, "Too early for raise");

        euint64 rate64 = FHE.asEuint64(salaryAgreement[_ipfsCID].incrementRate);
        euint64 increaseAmount = FHE.mul(salaryAgreement[_ipfsCID].baseSalary, rate64);
        increaseAmount = FHE.div(increaseAmount, 100);
        
        euint64 newSalary = FHE.add(salaryAgreement[_ipfsCID].baseSalary, increaseAmount);

        _allowAll(newSalary, salaryAgreement[_ipfsCID].employer, salaryAgreement[_ipfsCID].employee);

        salaryAgreement[_ipfsCID].baseSalary = newSalary;
        salaryAgreement[_ipfsCID].startDateOfIncrement = uint64(block.timestamp);
        
        emit SalaryIncremented(salaryAgreement[_ipfsCID].employee, uint64(block.timestamp));
    }

    // Internal helper to save lines of code
    function _allowAll(euint64 _val, address _employer, address _employee) internal {
        FHE.allow(_val, _employer);
        FHE.allow(_val, _employee);
        FHE.allow(_val, address(this));
    }
    // Overload for uint8
    function _allowAll(euint8 _val, address _employer, address _employee) internal {
        FHE.allow(_val, _employer);
        FHE.allow(_val, _employee);
        FHE.allow(_val, address(this));
    }
}