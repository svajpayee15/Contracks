// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64, ebool, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract BoardVotingTemplate is ZamaEthereumConfig {

    struct VotingConfig {
        address admin;
        string ipfsCID;
        string iv;
        uint64 deadline;
        euint64 seed;
        euint64 totalYesVotesWeightage;
        uint64 totalPossibleWeight;
        bool isDecryptionRequested;
        bool isFinalized;
        ebool isPassed;
    }

    mapping(string => VotingConfig) public votingAgreements;
    mapping(string => mapping(address => bool)) public hasVoted;
    mapping(string => mapping(address => uint64)) public weightage;

    event statusFinalized(string indexed ipfsCID, bool decryptedIsPassed);
    event requestVotingResult(string indexed ipfsCID, ebool isPassed);

    function initialize(
        address _admin,
        string memory _ipfsCID, 
        string memory _iv,
        uint64 _deadline, 
        address[] memory _whitelistArray,
        uint64[] memory _weightageArray,
        externalEuint64 _seed,
        bytes calldata _inputProof
    ) public {
        require(votingAgreements[_ipfsCID].admin == address(0) , "Voting session already exists");
        require(msg.sender == _admin, "Only admin can initialize");
        require(_whitelistArray.length == _weightageArray.length, "Array length mismatch");

        euint64 eSeed = FHE.fromExternal(_seed, _inputProof);
        uint64 calcTotalWeight = 0;

        for(uint32 i=0; i < _whitelistArray.length; i++){
            weightage[_ipfsCID][_whitelistArray[i]] = _weightageArray[i];
            FHE.allow(eSeed, _whitelistArray[i]);
            calcTotalWeight += _weightageArray[i];
        }

        votingAgreements[_ipfsCID] = VotingConfig({
            admin: _admin,
            ipfsCID: _ipfsCID,
            iv: _iv,
            deadline: _deadline,
            seed: eSeed,
            totalYesVotesWeightage: FHE.asEuint64(0),
            totalPossibleWeight: calcTotalWeight, // Store this for UI math
            isFinalized: false,
            isDecryptionRequested: false,
            isPassed: FHE.asEbool(false)
        });

        FHE.allow(eSeed, _admin);
        FHE.allow(eSeed, address(this));
        FHE.allow(votingAgreements[_ipfsCID].totalYesVotesWeightage, address(this));
    }

    function castVote(
        string memory _ipfsCID,
        externalEbool _userVote,
        bytes calldata _inputProof
    ) public {
        VotingConfig storage v = votingAgreements[_ipfsCID];
        require(v.admin != address(0));
        require(!hasVoted[_ipfsCID][msg.sender], "Already voted");
        require(weightage[_ipfsCID][msg.sender] > 0, "Not on whitelist");
        require(block.timestamp <= v.deadline, "Voting ended");

        ebool userVote = FHE.fromExternal(_userVote, _inputProof);

        euint64 userVoteWeightage = FHE.select(
            userVote, 
            FHE.asEuint64(weightage[_ipfsCID][msg.sender]), 
            FHE.asEuint64(0)
        );
        
        v.totalYesVotesWeightage = FHE.add(v.totalYesVotesWeightage, userVoteWeightage);
        hasVoted[_ipfsCID][msg.sender] = true;
        FHE.allow(v.totalYesVotesWeightage, address(this));
    }

    function finalizeVoting(string memory _ipfsCID) public {
        VotingConfig storage v = votingAgreements[_ipfsCID];
        require(v.admin == msg.sender, "Only admin can finalize");
        require(block.timestamp >= v.deadline, "Voting still in progress");
        require(!v.isFinalized, "Already finalized");

        uint64 halfWeight = v.totalPossibleWeight / 2;

        ebool isPassed = FHE.gt(v.totalYesVotesWeightage, FHE.asEuint64(halfWeight));

        v.isPassed = isPassed;

        FHE.makePubliclyDecryptable(isPassed);
        v.isDecryptionRequested = true;

        emit requestVotingResult(_ipfsCID, v.isPassed);
    }

    function completeFinalization(
        string memory _ipfsCID,
        bool decryptedisPassed,
        bytes memory publicDecryptionProof
    ) public {
        VotingConfig storage v = votingAgreements[_ipfsCID];
        require(v.isDecryptionRequested, "Request decryption first");
        require(!v.isFinalized, "Already finalized");

        bytes32[] memory handle = new bytes32[](1);
        handle[0] = FHE.toBytes32(v.isPassed);
        
        bytes memory abiEncoded = abi.encode(decryptedisPassed);
        FHE.checkSignatures(handle, abiEncoded, publicDecryptionProof);

        v.isFinalized = true;
        emit statusFinalized(_ipfsCID, decryptedisPassed);
    }

    function getVoterStatus(string memory _cid, address _voter) public view returns (bool isWhitelisted, uint64 userWeight, bool hasVotedStatus) {
        userWeight = weightage[_cid][_voter];
        isWhitelisted = userWeight > 0;
        hasVotedStatus = hasVoted[_cid][_voter];
        return (isWhitelisted, userWeight, hasVotedStatus);
    }
}