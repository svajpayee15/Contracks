// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract PlainAgreementTemplate is ZamaEthereumConfig {
    
    struct Agreement {
        address sender;
        string ipfsCID;
        string iv; 
        euint64 eSeed;
        bool isSigned;
        address receiver; 
    }

    mapping(string => Agreement) public agreements;

    event AgreementCreated(string indexed cid, address sender, address receiver);
    event AgreementSigned(string indexed cid, address signer);

    function initialize(
        address _receiver,
        string memory _ipfsCID,
        string memory _iv,
        externalEuint64 _seed,
        bytes calldata _inputProof
    ) public {
        require(agreements[_ipfsCID].sender == address(0), "Exists");

        euint64 eSeed = FHE.fromExternal(_seed, _inputProof);

        
        // Grant access to Sender and Receiver
        FHE.allow(eSeed, msg.sender);
        FHE.allow(eSeed, _receiver);
        FHE.allow(eSeed, address(this));

        agreements[_ipfsCID] = Agreement({
            sender: msg.sender,
            ipfsCID: _ipfsCID,
            iv: _iv,
            eSeed: eSeed,
            isSigned: false,
            receiver: _receiver
        });

        emit AgreementCreated(_ipfsCID, msg.sender, _receiver);
    }

    function signAgreement(string memory _cid) public {
        require(!agreements[_cid].isSigned);
        require(msg.sender == agreements[_cid].receiver, "Only Receiver can sign");
        agreements[_cid].isSigned = true;
        emit AgreementSigned(_cid, msg.sender);
    }
}