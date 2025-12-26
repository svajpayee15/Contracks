// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { FHE, euint64, ebool, externalEuint64, euint8, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract FFPTemplate is ZamaEthereumConfig{

    enum Status { Pending, Completed, Paid }
    
    struct MileStone{
        string description; 
        euint64 amount;
        uint64 deadline;
        euint8 penalty;
        Status status;
    }

    struct FFP{
        MileStone[] milestones;
        euint64 eSeed;
        string ipfsCID;
        string iv;
        bool isSigned;
        euint64 eTotalBudget;
        address client;
        address vendor;
    }

    mapping(string => FFP) public ffpAgreements;

    event statusCompleted(uint8 indexMilestone);
    event statusPaid(uint8 indexMilestone);
    event AgreementSigned(string indexed ipfsCID, address indexed vendor);

   function initialize(
        address _client, 
        address _vendor, 
        string memory _ipfsCID, 
        string memory _iv,
        string[] memory _description,
        uint64[] memory _deadline,
        externalEuint64 _seed,
        externalEuint64[] memory _amounts,
        externalEuint8[] memory _penalties,
        bytes calldata _inputProof
    ) public {
        require(_description.length == _amounts.length, "Description and amounts length mismatch");
        require(_amounts.length == _penalties.length, "Amounts and penalties length mismatch");
        require(_description.length == _deadline.length, "Description and deadline length mismatch");
        require(ffpAgreements[_ipfsCID].client == address(0), "Project already exists");
        require(msg.sender == _client, "Only Client can initialize");

        FFP storage newProject = ffpAgreements[_ipfsCID];
        
        newProject.client = _client;
        newProject.vendor = _vendor;
        newProject.ipfsCID = _ipfsCID;
        newProject.iv = _iv;
        newProject.isSigned = false;

        euint64 eSeed = FHE.fromExternal(_seed, _inputProof);
        newProject.eSeed = eSeed;
        
        FHE.allow(eSeed, _client);
        FHE.allow(eSeed, _vendor);
        FHE.allow(eSeed, address(this));

        euint64 totalBudget = FHE.asEuint64(0);

        for(uint256 i = 0; i < _description.length; i++){
            euint64 amount = FHE.fromExternal(_amounts[i], _inputProof);
            euint8 penaltyRaw = FHE.fromExternal(_penalties[i], _inputProof);
            
            euint8 penalty = FHE.select(
                FHE.and(FHE.le(penaltyRaw, 100), FHE.ge(penaltyRaw, 0)), 
                penaltyRaw, 
                FHE.asEuint8(0)
            );

            totalBudget = FHE.add(totalBudget, amount);

            newProject.milestones.push(
                MileStone({
                    description: _description[i],
                    amount: amount,
                    status: Status.Pending,
                    deadline: _deadline[i],
                    penalty: penalty
                })
            );

            FHE.allow(amount, _client);
            FHE.allow(amount, _vendor);
            FHE.allow(amount, address(this));

            FHE.allow(penalty, _client);
            FHE.allow(penalty, _vendor);
            FHE.allow(penalty, address(this));
        }

        newProject.eTotalBudget = totalBudget;
        FHE.allow(totalBudget, _client);
        FHE.allow(totalBudget, _vendor);
        FHE.allow(totalBudget, address(this));
    }

    function completeMilestone(uint8 indexMilestone, string memory _ipfsCID) external {
        require(msg.sender == ffpAgreements[_ipfsCID].vendor, "Only Vendor can complete Milestones");
        require(ffpAgreements[_ipfsCID].milestones[indexMilestone].status == Status.Pending, "Invalid state");

        ffpAgreements[_ipfsCID].milestones[indexMilestone].status = Status.Completed;

        emit statusCompleted(indexMilestone);
    }

    function approveMileStone(uint8 indexMilestone, string memory _ipfsCID) external {
        require(msg.sender == ffpAgreements[_ipfsCID].client, "Only Client can approve Milestones");
        require(ffpAgreements[_ipfsCID].milestones[indexMilestone].status == Status.Completed, "Not completed by vendor");

        ffpAgreements[_ipfsCID].milestones[indexMilestone].status = Status.Paid;

        emit statusPaid(indexMilestone);
    }

    function getMilestoneCount(string memory _cid) public view returns (uint256) {
        return ffpAgreements[_cid].milestones.length;
    }

    function getMilestone(string memory _cid, uint256 _index) public view returns (
        string memory description,
        euint64 amount,
        uint64 deadline,
        euint8 penalty,
        Status status
    ) {
        require(_index < ffpAgreements[_cid].milestones.length, "Index out of bounds");
        MileStone storage m = ffpAgreements[_cid].milestones[_index];
        return (m.description, m.amount, m.deadline, m.penalty, m.status);
    }

    function penalize(uint8 indexMilestone, string memory _ipfsCID) external {
        MileStone storage m = ffpAgreements[_ipfsCID].milestones[indexMilestone];
        require(block.timestamp > m.deadline, "Deadline not passed yet");
        require(m.status != Status.Paid, "Already paid");

       
        euint64 ePenalty64 = FHE.asEuint64(m.penalty);
        euint64 reduction = FHE.div(FHE.mul(m.amount, ePenalty64), 100);
        
        m.amount = FHE.sub(m.amount, reduction);

        FHE.allow(m.amount, ffpAgreements[_ipfsCID].client);
        FHE.allow(m.amount, ffpAgreements[_ipfsCID].vendor);
        FHE.allow(m.amount, address(this));
    }

    function signAgreement(string memory _ipfsCID) public{
        require(!ffpAgreements[_ipfsCID].isSigned, "Already signed");

        ffpAgreements[_ipfsCID].isSigned = true;

        emit AgreementSigned(_ipfsCID, msg.sender);
    }
}