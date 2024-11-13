require('dotenv').config();
const { Web3 } = require('web3');
const {
    CONTRACT_VOTE,
    ABI_VOTE,
} = require('./constant');

const { tnxType0, tnxType2, handleError} = require('./utils');

// const ETH_PRICE = 2850;
const GAS_USAGE = 21116;

RPC_URL = process.env.RPC_URL;
const privateKey = process.env._key;

const TOTAL_POINT = process.argv[2];

const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
const contract = new web3.eth.Contract(ABI_VOTE, CONTRACT_VOTE);
const account = web3.eth.accounts.privateKeyToAccount(privateKey);

/**
 * Gioi thieu ve cach chay script
 */
console.log("\no ___________________VOTING__________________");
console.log("o", account.address);
console.log('%s\x1b[34m%s\x1b[0m', "o Change params: ", "_key | RPC_URL");
console.log("o Change CLI: node Vote.js [Point wana get]");
console.log("o Ex: node Vote.js 73580 (Vote to reach 73580 points)")

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
 * @param {number} TOTAL_GAS - Total gas amount in ETH
 * @param {BigInt} Gas_Price - Current gas price (e.g., 125000001n)
 */
function ProcessTotalGas(TOTAL_GAS, Gas_Price) {
    const total_gas = parseFloat(TOTAL_GAS);
    const avg_gas_per_tnx = parseFloat(web3.utils.fromWei((Gas_Price * BigInt(GAS_USAGE)).toString(), 'ether'));
    
    if(avg_gas_per_tnx > 0.0000045){
        console.log("Gas price is so high, wait and try again!");
        return [null, null, null]
    }

    const TNX_PER_BATCH = Math.floor(Math.random() * (6)) + 10;
    NUM_TNX = Math.ceil(total_gas / avg_gas_per_tnx);
    // gas_increase = (.45 - avg_gas) / avg_gas * 100
    GAS_FEE_INCREASE_PERCENT = (0.0000045 - Number(avg_gas_per_tnx)) / Number(avg_gas_per_tnx) * 100;

    return [NUM_TNX, TNX_PER_BATCH, GAS_FEE_INCREASE_PERCENT];
}

// ProcessTotalGas(TOTAL_GAS, 125000001n);
async function SendTnx() {
    let avg_gas_price = 0n;
    for (let index = 0; index < 30; index++) {
        const Gas_Price = await handleError(web3.eth.getGasPrice());
        if (Gas_Price === null) {
            console.error("Failed to fetch Gas Price");
            return;
        }
        avg_gas_price = (avg_gas_price + Gas_Price) / 2n;
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // gwei / 10 * 2 = total_point
    // ==> gwei = total_point / 2 * 10
    // Do do, total_gas = gwei --> ether
    const TOTAL_GAS_In_Wei = web3.utils.toWei((Math.ceil(parseInt(TOTAL_POINT) / 2.1 * 10)).toString(), 'Gwei');
    const TOTAL_GAS = web3.utils.fromWei(TOTAL_GAS_In_Wei, 'ether');
    console.log(`\nTotal Point: ${parseInt(TOTAL_POINT)}`);
    console.log(`Total gas: ${parseFloat(TOTAL_GAS)}`);

    let [NUM_TNX, TNX_PER_BATCH, GAS_FEE_INCREASE_PERCENT] = ProcessTotalGas(TOTAL_GAS, avg_gas_price);
    
    console.log(`==> Total ${NUM_TNX} tnx with gas increase ${GAS_FEE_INCREASE_PERCENT} percent\n`)
    
    if (NUM_TNX == null || TNX_PER_BATCH == null) {
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
                await new Promise(resolve => setTimeout(resolve, 500));
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