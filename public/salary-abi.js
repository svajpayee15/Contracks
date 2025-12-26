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
          "internalType": "address",
          "name": "employee",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "newDate",
          "type": "uint64"
        }
      ],
      "name": "SalaryIncremented",
      "type": "event"
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
      "name": "increment",
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
          "internalType": "externalEuint64",
          "name": "_seed",
          "type": "bytes32"
        },
        {
          "internalType": "externalEuint64",
          "name": "_baseSalary",
          "type": "bytes32"
        },
        {
          "internalType": "externalEuint64",
          "name": "_joiningBonus",
          "type": "bytes32"
        },
        {
          "internalType": "externalEuint8",
          "name": "_taxRate",
          "type": "bytes32"
        },
        {
          "internalType": "externalEuint8",
          "name": "_incrementRate",
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
      "name": "salaryAgreement",
      "outputs": [
        {
          "internalType": "address",
          "name": "employer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "employee",
          "type": "address"
        },
        {
          "internalType": "uint64",
          "name": "startDateOfIncrement",
          "type": "uint64"
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
          "internalType": "euint64",
          "name": "seed",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "baseSalary",
          "type": "bytes32"
        },
        {
          "internalType": "euint64",
          "name": "joiningBonus",
          "type": "bytes32"
        },
        {
          "internalType": "euint8",
          "name": "taxRate",
          "type": "bytes32"
        },
        {
          "internalType": "euint8",
          "name": "incrementRate",
          "type": "bytes32"
        },
        {
          "internalType": "bool",
          "name": "isSigned",
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