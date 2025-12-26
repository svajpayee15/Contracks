export const ABI =[
    {
      "inputs": [],
      "name": "ZamaProtocolUnsupported",
      "type": "error"
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
          "indexed": true,
          "internalType": "address",
          "name": "vendor",
          "type": "address"
        }
      ],
      "name": "AgreementSigned",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "indexMilestone",
          "type": "uint8"
        }
      ],
      "name": "statusCompleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint8",
          "name": "indexMilestone",
          "type": "uint8"
        }
      ],
      "name": "statusPaid",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "indexMilestone",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "_ipfsCID",
          "type": "string"
        }
      ],
      "name": "approveMileStone",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint8",
          "name": "indexMilestone",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "_ipfsCID",
          "type": "string"
        }
      ],
      "name": "completeMilestone",
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
          "name": "",
          "type": "string"
        }
      ],
      "name": "ffpAgreements",
      "outputs": [
        {
          "internalType": "euint64",
          "name": "eSeed",
          "type": "bytes32"
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
          "internalType": "bool",
          "name": "isSigned",
          "type": "bool"
        },
        {
          "internalType": "euint64",
          "name": "eTotalBudget",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "client",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "vendor",
          "type": "address"
        }
      ],
      "stateMutability": "view",
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
          "internalType": "uint256",
          "name": "_index",
          "type": "uint256"
        }
      ],
      "name": "getMilestone",
      "outputs": [
        {
          "internalType": "string",
          "name": "description",
          "type": "string"
        },
        {
          "internalType": "euint64",
          "name": "amount",
          "type": "bytes32"
        },
        {
          "internalType": "uint64",
          "name": "deadline",
          "type": "uint64"
        },
        {
          "internalType": "euint8",
          "name": "penalty",
          "type": "bytes32"
        },
        {
          "internalType": "enum FFPTemplate.Status",
          "name": "status",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_cid",
          "type": "string"
        }
      ],
      "name": "getMilestoneCount",
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
          "internalType": "address",
          "name": "_client",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_vendor",
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
          "internalType": "string[]",
          "name": "_description",
          "type": "string[]"
        },
        {
          "internalType": "uint64[]",
          "name": "_deadline",
          "type": "uint64[]"
        },
        {
          "internalType": "externalEuint64",
          "name": "_seed",
          "type": "bytes32"
        },
        {
          "internalType": "externalEuint64[]",
          "name": "_amounts",
          "type": "bytes32[]"
        },
        {
          "internalType": "externalEuint8[]",
          "name": "_penalties",
          "type": "bytes32[]"
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
          "internalType": "uint8",
          "name": "indexMilestone",
          "type": "uint8"
        },
        {
          "internalType": "string",
          "name": "_ipfsCID",
          "type": "string"
        }
      ],
      "name": "penalize",
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
        }
      ],
      "name": "signAgreement",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]