/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/beam.json`.
 */
export type Beam = {
  address: 'EV5iVxtuerZqQiqBFytRxZtdtWmDiqBengp47izzLEBn'
  metadata: {
    name: 'beam'
    version: '0.1.0'
    spec: '0.1.0'
    description: 'Created with Anchor'
  }
  instructions: [
    {
      name: 'addContact'
      discriminator: [184, 47, 126, 40, 45, 107, 85, 172]
      accounts: [
        {
          name: 'owner'
          writable: true
          signer: true
        },
        {
          name: 'contact'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [99, 111, 110, 116, 97, 99, 116]
              },
              {
                kind: 'account'
                path: 'owner'
              },
              {
                kind: 'arg'
                path: 'address'
              },
            ]
          }
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'address'
          type: 'pubkey'
        },
        {
          name: 'name'
          type: 'string'
        },
      ]
    },
    {
      name: 'addEmployee'
      discriminator: [14, 82, 239, 156, 50, 90, 189, 61]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
          relations: ['treasury']
        },
        {
          name: 'treasury'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'admin'
              },
            ]
          }
        },
        {
          name: 'employeeInfo'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [101, 109, 112, 108, 111, 121, 101, 101]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
              {
                kind: 'arg'
                path: 'employee'
              },
            ]
          }
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'employee'
          type: 'pubkey'
        },
        {
          name: 'name'
          type: 'string'
        },
        {
          name: 'department'
          type: 'string'
        },
        {
          name: 'position'
          type: 'string'
        },
        {
          name: 'baseSalary'
          type: 'u64'
        },
      ]
    },
    {
      name: 'approveReimbursement'
      discriminator: [232, 142, 163, 162, 234, 149, 212, 86]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
          relations: ['treasury']
        },
        {
          name: 'treasury'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'admin'
              },
            ]
          }
        },
        {
          name: 'reimbursement'
          writable: true
        },
        {
          name: 'employeeInfo'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [101, 109, 112, 108, 111, 121, 101, 101]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
              {
                kind: 'account'
                path: 'reimbursement.employee'
                account: 'reimbursement'
              },
            ]
          }
        },
        {
          name: 'clock'
          address: 'SysvarC1ock11111111111111111111111111111111'
        },
      ]
      args: []
    },
    {
      name: 'closeLegacyTreasury'
      discriminator: [44, 201, 223, 147, 120, 58, 87, 5]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
        },
        {
          name: 'treasury'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'admin'
              },
            ]
          }
        },
        {
          name: 'vault'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [118, 97, 117, 108, 116]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
            ]
          }
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: []
    },
    {
      name: 'closeRecord'
      discriminator: [111, 192, 122, 188, 38, 234, 242, 249]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
          relations: ['treasury']
        },
        {
          name: 'treasury'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'admin'
              },
            ]
          }
        },
        {
          name: 'record'
          writable: true
        },
      ]
      args: []
    },
    {
      name: 'closeTreasury'
      discriminator: [113, 239, 0, 73, 12, 113, 171, 43]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
        },
        {
          name: 'treasury'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'admin'
              },
            ]
          }
        },
        {
          name: 'vault'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [118, 97, 117, 108, 116]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
            ]
          }
        },
        {
          name: 'adminTokenAccount'
          docs: ["Admin's token account to receive remaining vault balance"]
          writable: true
        },
        {
          name: 'tokenProgram'
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        },
      ]
      args: []
    },
    {
      name: 'createTreasury'
      discriminator: [254, 98, 217, 51, 25, 88, 140, 45]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
        },
        {
          name: 'treasury'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'admin'
              },
            ]
          }
        },
        {
          name: 'vault'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [118, 97, 117, 108, 116]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
            ]
          }
        },
        {
          name: 'tokenMint'
        },
        {
          name: 'tokenProgram'
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'name'
          type: 'string'
        },
      ]
    },
    {
      name: 'paySalary'
      discriminator: [162, 31, 116, 166, 157, 237, 84, 90]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
          relations: ['treasury']
        },
        {
          name: 'treasury'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'admin'
              },
            ]
          }
        },
        {
          name: 'vault'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [118, 97, 117, 108, 116]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
            ]
          }
        },
        {
          name: 'employee'
          writable: true
        },
        {
          name: 'employeeInfo'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [101, 109, 112, 108, 111, 121, 101, 101]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
              {
                kind: 'account'
                path: 'employee'
              },
            ]
          }
        },
        {
          name: 'employeeTokenAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'employee'
              },
              {
                kind: 'const'
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ]
              },
              {
                kind: 'account'
                path: 'tokenMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'payroll'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [112, 97, 121, 114, 111, 108, 108]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
              {
                kind: 'account'
                path: 'employee'
              },
              {
                kind: 'arg'
                path: 'recordId'
              },
            ]
          }
        },
        {
          name: 'tokenMint'
        },
        {
          name: 'tokenProgram'
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        },
        {
          name: 'associatedTokenProgram'
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
        },
        {
          name: 'clock'
          address: 'SysvarC1ock11111111111111111111111111111111'
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'recordId'
          type: 'u64'
        },
        {
          name: 'memo'
          type: 'string'
        },
      ]
    },
    {
      name: 'rejectReimbursement'
      discriminator: [217, 69, 37, 211, 92, 24, 243, 147]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
          relations: ['treasury']
        },
        {
          name: 'treasury'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'admin'
              },
            ]
          }
        },
        {
          name: 'reimbursement'
          writable: true
        },
        {
          name: 'clock'
          address: 'SysvarC1ock11111111111111111111111111111111'
        },
      ]
      args: []
    },
    {
      name: 'removeContact'
      discriminator: [2, 132, 185, 93, 96, 119, 186, 89]
      accounts: [
        {
          name: 'owner'
          writable: true
          signer: true
        },
        {
          name: 'contact'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [99, 111, 110, 116, 97, 99, 116]
              },
              {
                kind: 'account'
                path: 'owner'
              },
              {
                kind: 'arg'
                path: 'address'
              },
            ]
          }
        },
      ]
      args: [
        {
          name: 'address'
          type: 'pubkey'
        },
      ]
    },
    {
      name: 'removeEmployee'
      discriminator: [16, 10, 234, 98, 224, 29, 67, 64]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
          relations: ['treasury']
        },
        {
          name: 'treasury'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'admin'
              },
            ]
          }
        },
        {
          name: 'employeeInfo'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [101, 109, 112, 108, 111, 121, 101, 101]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
              {
                kind: 'arg'
                path: 'employee'
              },
            ]
          }
        },
      ]
      args: [
        {
          name: 'employee'
          type: 'pubkey'
        },
      ]
    },
    {
      name: 'submitReimbursement'
      discriminator: [182, 169, 201, 191, 49, 249, 157, 194]
      accounts: [
        {
          name: 'employee'
          writable: true
          signer: true
        },
        {
          name: 'treasury'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'treasury.admin'
                account: 'treasury'
              },
            ]
          }
        },
        {
          name: 'reimbursement'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [
                  114,
                  101,
                  105,
                  109,
                  98,
                  117,
                  114,
                  115,
                  101,
                  109,
                  101,
                  110,
                  116,
                ]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
              {
                kind: 'account'
                path: 'employee'
              },
              {
                kind: 'arg'
                path: 'recordId'
              },
            ]
          }
        },
        {
          name: 'clock'
          address: 'SysvarC1ock11111111111111111111111111111111'
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'recordId'
          type: 'u64'
        },
        {
          name: 'amount'
          type: 'u64'
        },
        {
          name: 'description'
          type: 'string'
        },
      ]
    },
    {
      name: 'transferFromTreasury'
      discriminator: [210, 193, 3, 97, 177, 29, 113, 248]
      accounts: [
        {
          name: 'admin'
          writable: true
          signer: true
          relations: ['treasury']
        },
        {
          name: 'treasury'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'admin'
              },
            ]
          }
        },
        {
          name: 'vault'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [118, 97, 117, 108, 116]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
            ]
          }
        },
        {
          name: 'recipient'
          writable: true
        },
        {
          name: 'recipientTokenAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'recipient'
              },
              {
                kind: 'const'
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ]
              },
              {
                kind: 'account'
                path: 'tokenMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'transferRecord'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 97, 110, 115, 102, 101, 114]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
              {
                kind: 'account'
                path: 'recipient'
              },
              {
                kind: 'arg'
                path: 'recordId'
              },
            ]
          }
        },
        {
          name: 'tokenMint'
        },
        {
          name: 'tokenProgram'
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        },
        {
          name: 'associatedTokenProgram'
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
        },
        {
          name: 'clock'
          address: 'SysvarC1ock11111111111111111111111111111111'
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'recordId'
          type: 'u64'
        },
        {
          name: 'amount'
          type: 'u64'
        },
        {
          name: 'memo'
          type: 'string'
        },
      ]
    },
    {
      name: 'transferP2P'
      discriminator: [99, 22, 125, 53, 83, 243, 11, 66]
      accounts: [
        {
          name: 'sender'
          writable: true
          signer: true
        },
        {
          name: 'recipient'
          writable: true
        },
        {
          name: 'treasury'
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 101, 97, 115, 117, 114, 121]
              },
              {
                kind: 'account'
                path: 'treasury.admin'
                account: 'treasury'
              },
            ]
          }
        },
        {
          name: 'senderTokenAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'sender'
              },
              {
                kind: 'const'
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ]
              },
              {
                kind: 'account'
                path: 'tokenMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'recipientTokenAccount'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'account'
                path: 'recipient'
              },
              {
                kind: 'const'
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169,
                ]
              },
              {
                kind: 'account'
                path: 'tokenMint'
              },
            ]
            program: {
              kind: 'const'
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89,
              ]
            }
          }
        },
        {
          name: 'transferRecord'
          writable: true
          pda: {
            seeds: [
              {
                kind: 'const'
                value: [116, 114, 97, 110, 115, 102, 101, 114]
              },
              {
                kind: 'account'
                path: 'treasury'
              },
              {
                kind: 'account'
                path: 'sender'
              },
              {
                kind: 'arg'
                path: 'recordId'
              },
            ]
          }
        },
        {
          name: 'tokenMint'
        },
        {
          name: 'tokenProgram'
          address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
        },
        {
          name: 'associatedTokenProgram'
          address: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
        },
        {
          name: 'clock'
          address: 'SysvarC1ock11111111111111111111111111111111'
        },
        {
          name: 'systemProgram'
          address: '11111111111111111111111111111111'
        },
      ]
      args: [
        {
          name: 'recordId'
          type: 'u64'
        },
        {
          name: 'amount'
          type: 'u64'
        },
        {
          name: 'memo'
          type: 'string'
        },
      ]
    },
  ]
  accounts: [
    {
      name: 'contact'
      discriminator: [227, 113, 227, 39, 193, 116, 172, 45]
    },
    {
      name: 'employee'
      discriminator: [98, 238, 61, 252, 130, 77, 105, 67]
    },
    {
      name: 'payroll'
      discriminator: [194, 86, 146, 159, 169, 29, 234, 51]
    },
    {
      name: 'reimbursement'
      discriminator: [17, 80, 187, 57, 184, 243, 245, 101]
    },
    {
      name: 'transfer'
      discriminator: [175, 196, 153, 160, 209, 90, 145, 151]
    },
    {
      name: 'treasury'
      discriminator: [238, 239, 123, 238, 89, 1, 168, 253]
    },
  ]
  errors: [
    {
      code: 6000
      name: 'unauthorized'
      msg: 'You are not authorized to perform this action'
    },
    {
      code: 6001
      name: 'employeeAlreadyExists'
      msg: 'This employee has already been added'
    },
    {
      code: 6002
      name: 'employeeNotFound'
      msg: 'Employee not found in the treasury'
    },
    {
      code: 6003
      name: 'maxEmployeesReached'
      msg: 'Maximum number of employees reached'
    },
    {
      code: 6004
      name: 'insufficientFunds'
      msg: 'Insufficient funds in treasury vault'
    },
    {
      code: 6005
      name: 'invalidReimbursementStatus'
      msg: 'Invalid reimbursement status for this operation'
    },
    {
      code: 6006
      name: 'invalidAmount'
      msg: 'Amount must be greater than zero'
    },
    {
      code: 6007
      name: 'nameTooLong'
      msg: 'Name exceeds maximum length'
    },
    {
      code: 6008
      name: 'descriptionTooLong'
      msg: 'Description exceeds maximum length'
    },
    {
      code: 6009
      name: 'memoTooLong'
      msg: 'Memo exceeds maximum length'
    },
    {
      code: 6010
      name: 'recipientNotEmployee'
      msg: 'Recipient is not an employee of this treasury'
    },
    {
      code: 6011
      name: 'cannotTransferToSelf'
      msg: 'Cannot transfer to yourself'
    },
    {
      code: 6012
      name: 'invalidTokenMint'
      msg: 'Invalid token mint for this treasury'
    },
    {
      code: 6013
      name: 'departmentTooLong'
      msg: 'Department name exceeds maximum length'
    },
    {
      code: 6014
      name: 'positionTooLong'
      msg: 'Position name exceeds maximum length'
    },
    {
      code: 6015
      name: 'notWhitelistedAdmin'
      msg: 'Wallet is not whitelisted to create a treasury'
    },
  ]
  types: [
    {
      name: 'contact'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'owner'
            type: 'pubkey'
          },
          {
            name: 'address'
            type: 'pubkey'
          },
          {
            name: 'name'
            type: 'string'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
    {
      name: 'employee'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'wallet'
            type: 'pubkey'
          },
          {
            name: 'treasury'
            type: 'pubkey'
          },
          {
            name: 'name'
            type: 'string'
          },
          {
            name: 'department'
            type: 'string'
          },
          {
            name: 'position'
            type: 'string'
          },
          {
            name: 'baseSalary'
            type: 'u64'
          },
          {
            name: 'pendingReimbursement'
            type: 'u64'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
    {
      name: 'payroll'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'employee'
            type: 'pubkey'
          },
          {
            name: 'amount'
            type: 'u64'
          },
          {
            name: 'baseSalary'
            type: 'u64'
          },
          {
            name: 'reimbursementAmount'
            type: 'u64'
          },
          {
            name: 'timestamp'
            type: 'i64'
          },
          {
            name: 'memo'
            type: 'string'
          },
          {
            name: 'treasury'
            type: 'pubkey'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
    {
      name: 'reimbursement'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'employee'
            type: 'pubkey'
          },
          {
            name: 'amount'
            type: 'u64'
          },
          {
            name: 'description'
            type: 'string'
          },
          {
            name: 'status'
            type: 'u8'
          },
          {
            name: 'approvedBy'
            type: {
              option: 'pubkey'
            }
          },
          {
            name: 'approvedAt'
            type: {
              option: 'i64'
            }
          },
          {
            name: 'timestamp'
            type: 'i64'
          },
          {
            name: 'treasury'
            type: 'pubkey'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
    {
      name: 'transfer'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'sender'
            type: 'pubkey'
          },
          {
            name: 'recipient'
            type: 'pubkey'
          },
          {
            name: 'amount'
            type: 'u64'
          },
          {
            name: 'memo'
            type: 'string'
          },
          {
            name: 'timestamp'
            type: 'i64'
          },
          {
            name: 'treasury'
            type: 'pubkey'
          },
          {
            name: 'transferType'
            type: 'u8'
          },
          {
            name: 'bump'
            type: 'u8'
          },
        ]
      }
    },
    {
      name: 'treasury'
      type: {
        kind: 'struct'
        fields: [
          {
            name: 'admin'
            type: 'pubkey'
          },
          {
            name: 'name'
            type: 'string'
          },
          {
            name: 'employees'
            type: {
              vec: 'pubkey'
            }
          },
          {
            name: 'tokenMint'
            type: 'pubkey'
          },
          {
            name: 'bump'
            type: 'u8'
          },
          {
            name: 'vaultBump'
            type: 'u8'
          },
        ]
      }
    },
  ]
  constants: [
    {
      name: 'contactSeed'
      type: 'bytes'
      value: '[99, 111, 110, 116, 97, 99, 116]'
    },
    {
      name: 'employeeSeed'
      type: 'bytes'
      value: '[101, 109, 112, 108, 111, 121, 101, 101]'
    },
    {
      name: 'payrollSeed'
      type: 'bytes'
      value: '[112, 97, 121, 114, 111, 108, 108]'
    },
    {
      name: 'reimbursementSeed'
      type: 'bytes'
      value: '[114, 101, 105, 109, 98, 117, 114, 115, 101, 109, 101, 110, 116]'
    },
    {
      name: 'seed'
      type: 'string'
      value: '"beam"'
    },
    {
      name: 'transferSeed'
      type: 'bytes'
      value: '[116, 114, 97, 110, 115, 102, 101, 114]'
    },
    {
      name: 'treasurySeed'
      type: 'bytes'
      value: '[116, 114, 101, 97, 115, 117, 114, 121]'
    },
    {
      name: 'vaultSeed'
      type: 'bytes'
      value: '[118, 97, 117, 108, 116]'
    },
  ]
}
