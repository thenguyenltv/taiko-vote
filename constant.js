module.exports = {
    CONTRACT_VOTE: '0x4D1E2145082d0AB0fDa4a973dC4887C7295e21aB',
    ABI_VOTE: [
        { stateMutability: 'payable', type: 'fallback' },
        {
          inputs: [],
          name: 'vote',
          outputs: [],
          stateMutability: 'payable',
          type: 'function'
        }
      ],
    
    CHAIN_ID: '0x28c58' // taiko mainnet
};