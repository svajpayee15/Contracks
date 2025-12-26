export const ABI = [
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
          "name": "employee",
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
          "indexed": true,
          "internalType": "string",
          "name": "ipfsCID",
          "type": "string"
        }
      ],
      "name": "PayoutCalculated",
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
          "indexed": true,
          "internalType": "address",
          "name": "employee",
          "type": "address"
        }
      ],
      "name": "PerformanceSubmitted",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_ipfsCID",
          "type": "string"
        }
      ],
      "name": "calculatePayout",
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
        },
        {
          "internalType": "externalEbool",
          "name": "_employerSatisfied",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "_inputProof",
          "type": "bytes"
        }
      ],
      "name": "employerSatisfaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_employer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_employee",
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
          "internalType": "externalEuint64",
          "name": "_seed",
          "type": "bytes32"
        },
        {
          "internalType": "externalEuint128",
          "name": "_target",
          "type": "bytes32"
        },
        {
          "internalType": "externalEuint128",
          "name": "_bonus",
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
      "name": "performanceAgreements",
      "outputs": [
        {
          "internalType": "address",
          "name": "employee",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "employer",
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
          "internalType": "bool",
          "name": "isSigned",
          "type": "bool"
        },
        {
          "internalType": "euint64",
          "name": "seed",
          "type": "bytes32"
        },
        {
          "internalType": "euint128",
          "name": "target",
          "type": "bytes32"
        },
        {
          "internalType": "euint128",
          "name": "bonus",
          "type": "bytes32"
        },
        {
          "internalType": "euint128",
          "name": "actualPerformance",
          "type": "bytes32"
        },
        {
          "internalType": "euint128",
          "name": "finalPayout",
          "type": "bytes32"
        },
        {
          "internalType": "ebool",
          "name": "employerSatisfied",
          "type": "bytes32"
        },
        {
          "internalType": "ebool",
          "name": "isFinalized",
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
          "name": "_ipfsCID",
          "type": "string"
        }
      ],
      "name": "signAgreement",
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
          "internalType": "externalEuint128",
          "name": "_actualPerformance",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "_inputProof",
          "type": "bytes"
        }
      ],
      "name": "submitPerformance",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]