require('dotenv').config();
const { Web3 } = require('web3');
const {
    CONTRACT_VOTE,
    ABI_VOTE,
} = require('./constant');

const { tnxType0, tnxType2, handleError} = require('./utils');

const ETH_PRICE = 2600;
const GAS_USAGE = 21116;

RPC_URL = process.env.RPC_URL;
const privateKey = process.env._key;
console.log("RPC_URL:", RPC_URL);

// const PRIVATE_KEY = process.argv[2]; // type of private key to use
// const NUM_TNX = process.argv[2];
// let GAS_FEE_INCREASE_PERCENT = process.argv[3]; 
// let TNX_PER_BATCH = process.argv[4];

const TOTAL_GAS = process.argv[2];

const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
const contract = new web3.eth.Contract(ABI_VOTE, CONTRACT_VOTE);
const account = web3.eth.accounts.privateKeyToAccount(privateKey);

/**
 * Gioi thieu ve cach chay script
 */
console.log("\no ___________________VOTING__________________");
console.log("o", account.address);
console.log('%s\x1b[34m%s\x1b[0m', "o Change params: ", "_key | RPC_URL");
console.log("o Change CLI: node Vote.js [Amount of Gas in USD]");
console.log("o Ex: node Vote.js 0.5 (Total 0.5$ in fee)")

/**
 * This function is used to send a transaction to the voting contract
 * Just send, not waiting for the result
 */
async function InitializeVoting(NONCE, gasIncrease) {
    try {
        const encodedData = contract.methods.vote().encodeABI();
        const estimatedGas = await web3.eth.estimateGas({
            to: CONTRACT_VOTE,
            data: encodedData,
        });
        const gas_Limit = web3.utils.toHex(estimatedGas) * 2;
        let max_Priority_Fee_Per_Gas = await web3.eth.getGasPrice();
        max_Priority_Fee_Per_Gas = max_Priority_Fee_Per_Gas * BigInt(100 + gasIncrease) / BigInt(100);
        const max_Fee_Per_Gas = web3.utils.toWei('0.25', 'gwei');

        /** EIP-1559 (Type 2 transaction) */
        const tx = {
            nonce: NONCE,
            to: CONTRACT_VOTE,
            data: encodedData,
            value: '0x00',
            maxPriorityFeePerGas: max_Priority_Fee_Per_Gas,
            maxFeePerGas: max_Fee_Per_Gas,
            gasLimit: gas_Limit,
            type: '0x2', // Specify EIP-1559 transaction type
        };


        const fee = web3.utils.fromWei((max_Priority_Fee_Per_Gas * BigInt(estimatedGas)).toString(), 'ether');
        return [tx, fee];
    }
    catch (error) {
        console.error('Error sending vote:', error.message);
    }
}

/**
 * Return NUM_TNX, TNX_PER_BATCH, GAS_FEE_INCREASE_PERCENT
 * @param {number} TOTAL_GAS - Total gas amount
 * @param {BigInt} Gas_Price - Current gas price (e.g., 125000001n)
 */
function ProcessTotalGas(TOTAL_GAS, Gas_Price) {
    const total_gas = parseFloat(TOTAL_GAS);
    const gas_in_eth = total_gas / ETH_PRICE;

    const avg_gas_per_tnx = parseFloat(web3.utils.fromWei((Gas_Price * BigInt(GAS_USAGE)).toString(), 'ether'));
    
    if(avg_gas_per_tnx > 0.000005){
        return [null, null, null]
    }

    let NUM_TNX = Math.floor(Math.random() * (31)) + 400;
    const TNX_PER_BATCH = Math.floor(Math.random() * (6)) + 10;

    let GAS_FEE_INCREASE_PERCENT = Math.ceil((gas_in_eth / NUM_TNX - avg_gas_per_tnx) / avg_gas_per_tnx * 100);
    
    if (GAS_FEE_INCREASE_PERCENT < 0){
        NUM_TNX = Math.ceil(gas_in_eth / avg_gas_per_tnx);
        GAS_FEE_INCREASE_PERCENT = 0;
    }

    return [NUM_TNX, TNX_PER_BATCH, GAS_FEE_INCREASE_PERCENT];
}

ProcessTotalGas(TOTAL_GAS, 125000001n);
async function SendTnx() {
    const Gas_Price = await handleError(web3.eth.getGasPrice());
    let [NUM_TNX, TNX_PER_BATCH, GAS_FEE_INCREASE_PERCENT] = ProcessTotalGas(TOTAL_GAS, Gas_Price);

    console.log(`\n*** Total ${NUM_TNX} tnx with gas increase ${GAS_FEE_INCREASE_PERCENT} percent ***\n`)
    
    if (NUM_TNX == null || TNX_PER_BATCH == null) {
        return;
    }
    if (parseInt(TOTAL_GAS) > 1){
        console.log(`Total gas (process.argv[2]) > 1$`);
        return;
    }
    

    let NONCE = await handleError(web3.eth.getTransactionCount(account.address));
    if(NONCE == null || NONCE == undefined){
        console.log("Fetching error");
        return;
    }
    let startNonceRound = NONCE;

    let txCount = 0, failedTxCount = 0;
    while (txCount < NUM_TNX) {
        TNX_PER_BATCH = Math.min(TNX_PER_BATCH, NUM_TNX - txCount);
        console.log('\x1b[34m%s\x1b[0m', `\nSending ${TNX_PER_BATCH} transactions with NONCE start ${NONCE}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        [tx, fee] = await InitializeVoting(NONCE, GAS_FEE_INCREASE_PERCENT);
        await new Promise(resolve => setTimeout(resolve, 1500));
        for (let i = 0; i < TNX_PER_BATCH; i++) {
            try {
                tnxType2(web3, account, tx);
                console.log(`Fee: ${fee} ETH`);
                NONCE += BigInt(1);
                tx.nonce = NONCE;
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error('Sending Tnx Error:', error.message);
            }
        }   

        let nonce;
        let TIME_WAITING = 5000;
        for (let j = 0; j < 60; j++) {
            nonce = await handleError(web3.eth.getTransactionCount(account.address));
            if (nonce >= startNonceRound + BigInt(TNX_PER_BATCH)) {
                console.log(`--> Done ${nonce - startNonceRound} transactions!!!\n`);
                break;
            }
            await new Promise(resolve => setTimeout(resolve, TIME_WAITING));
        }

        txCount += Number(nonce - startNonceRound);
        failedTxCount = Number(NONCE - nonce);
        NONCE = startNonceRound = nonce;

        if(failedTxCount > 0) {
            GAS_FEE_INCREASE_PERCENT += 2;
            console.log('%s\x1b[31m%s\x1b[0m%s', `(`, `+`, `) GAS_FEE_INCREASE_PERCENT ${GAS_FEE_INCREASE_PERCENT}%`);
        }

    }
}

SendTnx();