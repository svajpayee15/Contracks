// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { FHE, euint64, euint128, ebool, externalEuint64, externalEbool, externalEuint128 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PerformanceTemplate is ZamaEthereumConfig {

    struct Performance {
        address employee;
        address employer; 
        string ipfsCID;
        string iv;
        uint64 deadline;
        bool isSigned;
        euint64 seed;
        euint128 target;
        euint128 bonus;
        euint128 actualPerformance;
        euint128 finalPayout;
        ebool employerSatisfied; 
        ebool isFinalized;
    }

    mapping(string => Performance) public performanceAgreements;

    event AgreementSigned(string indexed ipfsCID, address indexed employee);
    event PerformanceSubmitted(string indexed ipfsCID, address indexed employee);
    event PayoutCalculated(string indexed ipfsCID);

    function initialize(
        address _employer, 
        address _employee,
        string memory _ipfsCID, 
        string memory _iv,
        uint64 _deadline,
        externalEuint64 _seed,
        externalEuint128 _target,
        externalEuint128 _bonus,
        bytes calldata _inputProof
    ) public {
        require(performanceAgreements[_ipfsCID].employer == address(0), "Agreement already exists");
        require(msg.sender == _employer, "Only employer can initialize");

        euint64 eSeed = FHE.fromExternal(_seed, _inputProof);
        euint128 eTarget = FHE.fromExternal(_target, _inputProof);
        euint128 eBonus = FHE.fromExternal(_bonus, _inputProof);

        _allowAll(eSeed, _employer, _employee);
        _allowAll(eTarget, _employer, _employee);
        _allowAll(eBonus, _employer, _employee);

        performanceAgreements[_ipfsCID] = Performance({
            employer: _employer,
            employee: _employee, 
            ipfsCID: _ipfsCID, 
            iv: _iv, 
            seed: eSeed, 
            target: eTarget, 
            bonus: eBonus, 
            actualPerformance: FHE.asEuint128(0), 
            finalPayout: FHE.asEuint128(0),     
            employerSatisfied: FHE.asEbool(false),
            isFinalized: FHE.asEbool(false),
            deadline: _deadline,
            isSigned: false
        });

        _allowAll(performanceAgreements[_ipfsCID].actualPerformance, _employer, _employee);
        _allowAll(performanceAgreements[_ipfsCID].finalPayout, _employer, _employee);
        _allowAll(performanceAgreements[_ipfsCID].employerSatisfied, _employer, _employee);
        _allowAll(performanceAgreements[_ipfsCID].isFinalized, _employer, _employee);
    }

    function signAgreement(string memory _ipfsCID) public {
        Performance storage job = performanceAgreements[_ipfsCID];
        require(job.employee == msg.sender, "Only employee can sign");
        require(block.timestamp <= job.deadline, "Deadline passed");
        require(!job.isSigned, "Already signed");

        job.isSigned = true;
        emit AgreementSigned(_ipfsCID, msg.sender);
    }

    function submitPerformance(
        string memory _ipfsCID,
        externalEuint128 _actualPerformance,
        bytes calldata _inputProof
    ) public {
        Performance storage job = performanceAgreements[_ipfsCID];
        require(job.isSigned, "Contract not signed");
        require(job.employee == msg.sender, "Only employee can submit");
        require(block.timestamp <= job.deadline, "Deadline passed");
        
        euint128 eActualPerformance = FHE.fromExternal(_actualPerformance, _inputProof);
        _allowAll(eActualPerformance, job.employer, job.employee);

        job.actualPerformance = eActualPerformance;
        emit PerformanceSubmitted(_ipfsCID, msg.sender);
    }

    function employerSatisfaction(
        string memory _ipfsCID,
        externalEbool _employerSatisfied,
        bytes calldata _inputProof
    ) public {
        Performance storage job = performanceAgreements[_ipfsCID];
        require(msg.sender == job.employer, "Only employer can set satisfaction");
        require(job.isSigned, "Contract not signed");
        
        ebool eEmployerSatisfied = FHE.fromExternal(_employerSatisfied, _inputProof);
        _allowAll(eEmployerSatisfied, job.employer, job.employee);

        job.employerSatisfied = eEmployerSatisfied;
    }

    function calculatePayout(string memory _ipfsCID) public {
        Performance storage job = performanceAgreements[_ipfsCID];
        require(msg.sender == job.employer || msg.sender == job.employee, "Unauthorized");
        require(job.isSigned, "Not signed");

        ebool targetMet = FHE.ge(job.actualPerformance, job.target);
        ebool isEligible = FHE.and(targetMet, job.employerSatisfied);

        euint128 zero = FHE.asEuint128(0);
        euint128 payout = FHE.select(isEligible, job.bonus, zero);

        job.isFinalized = isEligible;
        job.finalPayout = payout; 

        _allowAll(job.finalPayout, job.employer, job.employee);
        _allowAll(job.isFinalized, job.employer, job.employee);
        emit PayoutCalculated(_ipfsCID);
    }

    function _allowAll(euint64 _val, address _employer, address _employee) internal {
        FHE.allow(_val, _employer);
        FHE.allow(_val, _employee);
        FHE.allow(_val, address(this));
    }

    function _allowAll(euint128 _val, address _employer, address _employee) internal {
        FHE.allow(_val, _employer);
        FHE.allow(_val, _employee);
        FHE.allow(_val, address(this));
    }

    function _allowAll(ebool _val, address _employer, address _employee) internal {
        FHE.allow(_val, _employer);
        FHE.allow(_val, _employee);
        FHE.allow(_val, address(this));
    }
}