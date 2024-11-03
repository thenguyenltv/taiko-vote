require('dotenv').config();
const { Web3 } = require('web3');
const {
    CONTRACT_VOTE,
    ABI_VOTE,
} = require('./constant');

const { tnxType0, tnxType2, handleError} = require('./utils');

RPC_URL = process.env.RPC_URL;
console.log("RPC_URL:", RPC_URL);

// const PRIVATE_KEY = process.argv[2]; // type of private key to use
const NUM_TNX = process.argv[2];
let GAS_FEE_INCREASE_PERCENT = process.argv[3]; 
let TNX_PER_BATCH = process.argv[4];
const privateKey = process.env._key;

const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
const contract = new web3.eth.Contract(ABI_VOTE, CONTRACT_VOTE);
const account = web3.eth.accounts.privateKeyToAccount(privateKey);

console.log("o ___________________VOTING__________________");
console.log("o", account.address);
console.log("o Number of Transactions:", NUM_TNX);
console.log("o -------------------------------------------\n");

/**
 * Check the value of GAS_FEE_INCREASE_PERCENT
 * @returns {number} GAS_FEE_INCREASE_PERCENT
 */
function CheckGAS_FEE_INCREASE_PERCENT() {
    number_gas = Number(GAS_FEE_INCREASE_PERCENT);
    if (isNaN(number_gas)) {
        console.log("Invalid GAS_FEE_INCREASE_PERCENT");
        number_gas = 0;
        process.exit(1);
    }
    return number_gas;
}

/**
 * This function is used to send a transaction to the voting contract
 * Just send, not waiting for the result
 */
async function InitializeVoting(NONCE, gasIncrease) {
    try {
        const encodedData = contract.methods.vote().encodeABI();
        const estimatedGas = await web3.eth.estimateGas({
            to: CONTRACT_VOTE,
            data: encodedData
        });
        const gas_Limit = web3.utils.toHex(estimatedGas) * 2;
        // let gasPrice = (await web3.eth.getGasPrice());
        // gasPrice = gasPrice * BigInt(100 + gasIncrease) / BigInt(100);
        let max_Priority_Fee_Per_Gas = await web3.eth.getGasPrice();
        max_Priority_Fee_Per_Gas = max_Priority_Fee_Per_Gas * BigInt(100 + gasIncrease) / BigInt(100);
        const max_Fee_Per_Gas = web3.utils.toWei('0.25', 'gwei');

        /** Type 0 transaction */
        // const tx = {
        //     to: CONTRACT_VOTE,
        //     gas: estimatedGas,
        //     gasPrice: gasPrice,
        //     gasLimit: gasLimit,
        //     nonce: NONCE,
        //     value: '0x00',
        //     data: encodedData
        // };

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


        // console.log(`Fee gas in ETH: ${web3.utils.fromWei((max_Priority_Fee_Per_Gas * BigInt(estimatedGas)).toString(), 'ether')}`);
        const fee = web3.utils.fromWei((max_Priority_Fee_Per_Gas * BigInt(estimatedGas)).toString(), 'ether');
        // tnxType2(web3, account, tx);
        return [tx, fee];
    }
    catch (error) {
        console.error('Error sending vote:', error.message);
    }
}


async function SendTnx() {
    // console.log("GAS_FEE_INCREASE_PERCENT:", GAS_FEE_INCREASE_PERCENT);
    TNX_PER_BATCH = parseInt(TNX_PER_BATCH) || 1;
    // console.log("TNX_PER_BATCH:", TNX_PER_BATCH);
    gasIncrease = CheckGAS_FEE_INCREASE_PERCENT();

    // let NONCE = await web3.eth.getTransactionCount(account.address);
    let NONCE = await handleError(web3.eth.getTransactionCount(account.address));
    let startNonceRound = NONCE;
    // console.log("Test:", startNonceRound + BigInt(TNX_PER_BATCH));

    let txCount = 0, failedTxCount = 0;
    while (txCount < NUM_TNX) {
        TNX_PER_BATCH = Math.min(TNX_PER_BATCH, NUM_TNX - txCount);
        console.log('\x1b[34m%s\x1b[0m', `\nSending ${TNX_PER_BATCH} transactions with NONCE start ${NONCE}...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        [tx, fee] = await InitializeVoting(NONCE, gasIncrease);
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
            nonce = await web3.eth.getTransactionCount(account.address);
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
            // increase gas price
            gasIncrease += 1;
            console.log('%s\x1b[31m%s\x1b[0m%s', `(`, `+`, `) GAS_FEE_INCREASE_PERCENT ${gasIncrease}%`);
        }

    }
}

SendTnx();