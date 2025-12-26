export const ABI = [
    {
      "inputs": [],
      "name": "InvalidKMSSignatures",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ZamaProtocolUnsupported",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bytes32[]",
          "name": "handlesList",
          "type": "bytes32[]"
        },
        {
          "indexed": false,
          "internalType": "bytes",
          "name": "abiEncodedCleartexts",
          "type": "bytes"
        }
      ],
      "name": "PublicDecryptionVerified",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "ipfsCID",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "ebool",
          "name": "isPassed",
          "type": "bytes32"
        }
      ],
      "name": "requestVotingResult",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "string",
          "name": "ipfsCID",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "decryptedIsPassed",
          "type": "bool"
        }
      ],
      "name": "statusFinalized",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_ipfsCID",
          "type": "string"
        },
        {
          "internalType": "externalEbool",
          "name": "_userVote",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "_inputProof",
          "type": "bytes"
        }
      ],
      "name": "castVote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_ipfsCID",
          "type": "string"
        },
        {
          "internalType": "bool",
          "name": "decryptedisPassed",
          "type": "bool"
        },
        {
          "internalType": "bytes",
          "name": "publicDecryptionProof",
          "type": "bytes"
        }
      ],
      "name": "completeFinalization",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "confidentialProtocolId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_ipfsCID",
          "type": "string"
        }
      ],
      "name": "finalizeVoting",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_cid",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "_voter",
          "type": "address"
        }
      ],
      "name": "getVoterStatus",
      "outputs": [
        {
          "internalType": "bool",
          "name": "isWhitelisted",
          "type": "bool"
        },
        {
          "internalType": "uint64",
          "name": "userWeight",
          "type": "uint64"
        },
        {
          "internalType": "bool",
          "name": "hasVotedStatus",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "hasVoted",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_admin",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "_ipfsCID",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "_iv",
          "type": "string"
        },
        {
          "internalType": "uint64",
          "name": "_deadline",
          "type": "uint64"
        },
        {
          "internalType": "address[]",
          "name": "_whitelistArray",
          "type": "address[]"
        },
        {
          "internalType": "uint64[]",
          "name": "_weightageArray",
          "type": "uint64[]"
        },
        {
          "internalType": "externalEuint64",
          "name": "_seed",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "_inputProof",
          "type": "bytes"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "name": "votingAgreements",
      "outputs": [
        {
          "internalType": "address",
          "name": "admin",
          "type": "address"
        },
        {
          "internalType": "string",
          "name": "ipfsCID",
          "type": "string"
        },
        {
          "internalType": "string",
          "name": "iv",
          "type": "string"
        },
        {
          "internalType": "uint64",
          "name": "deadline",
          "type": "uint64"
        },
        {
          "internalType": "euint64",
          "name": "seed",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "totalYesVotesWeightage",
          "type": "bytes32"
        },
        {
          "internalType": "uint64",
          "name": "totalPossibleWeight",
          "type": "uint64"
        },
        {
          "internalType": "bool",
          "name": "isDecryptionRequested",
          "type": "bool"
        },
        {
          "internalType": "bool",
          "name": "isFinalized",
          "type": "bool"
        },
        {
          "internalType": "ebool",
          "name": "isPassed",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "weightage",
      "outputs": [
        {
          "internalType": "uint64",
          "name": "",
          "type": "uint64"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]