require('dotenv').config();
const { Web3 } = require('web3');
const {
    CONTRACT_ADDRESS,
    CONTRACT_ABI,
    CHAIN_ID
} = require('./constant');

// import from utils.js
const { tnxType0 } = require('./utils');

const RPC_URL = "https://rpc.ankr.com/taiko/92f19728a43f08d9aa5600b526678df10e753c8b600a68c5a644623eb6c7acb6"
// https://rpc.mainnet.taiko.xyz //--> khong the dung song song 2 file voi cung 1 rpc (wrap vs vote)
// "https://rpc.ankr.com/taiko/92f19728a43f08d9aa5600b526678df10e753c8b600a68c5a644623eb6c7acb6"
const _F65 = process.env._F65;
const _B400 = process.env._B400;
const _ANH95 = process.env._ANH95;
const _ZERION = process.env._ZERION;
const _F3A = process.env._F3A;
const _971 = process.env._971;

const TKEY = process.argv[2]; // type of private key to use
// 0 - F65, 1 - B400, 2 - ANH95, 3 - ZERION
let address = "";
switch (TKEY) {
    case "0":
        address = _F65;
        break;
    case "1":
        address = _B400;
        break;
    case "2":
        address = _ANH95;
        break;
    case "3":
        address = _ZERION;
        break;
    case "4":
        address = _F3A;
        break;
    case "5":
        address = _971;
        break
    default:
        address = _F65;
        break;
}
const NUM_BATCH = process.argv[3];
const NUM_TNX = process.argv[4];
const GAS_FEE_INCREASE_PERCENT = 0; // 1%
let TIME_WAITING = 10000;

const web3 = new Web3(new Web3.providers.HttpProvider(RPC_URL));
const contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
const account = web3.eth.accounts.privateKeyToAccount(address);

let array_tnx = [];

console.log("Auto Voting Script");
console.log("Address:", account.address);
console.log("argv[2]: 0 - F65, 1 - B400, 2 - ANH95, 3 - ZERION");
console.log("Number of Transactions:", NUM_TNX);

async function loop() {
    let totalTnxSent = 0;
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 10000; // 5 seconds
    const numRound = Math.floor(NUM_TNX / NUM_BATCH);
    const numTnxLatestRound = NUM_TNX - numRound * NUM_BATCH;

    let NONCE;
    let encodedData = contract.methods.vote().encodeABI();
    let gasPrice = await web3.eth.getGasPrice();
    let estimatedGas;
    let gasLimit;

    for (let k = 0; k <= numRound; k++) {
        let startNonceRound = 0;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                // Fetch data from RPC in a loop to handle RPC errors
                // console.log(`Fetching data from RPC (attempt ${attempt + 1})...`);
                NONCE = await web3.eth.getTransactionCount(account.address);
                estimatedGas = await web3.eth.estimateGas({
                    to: CONTRACT_ADDRESS,
                    data: encodedData
                });
                gasLimit = web3.utils.toHex(estimatedGas) * 2;

                // console.log(`Data fetched successfully (attempt ${attempt + 1})`);
                break; // Exit the retry loop if successful
            } catch (error) {
                console.error(`Error fetching data from RPC (attempt ${attempt + 1}):`, error.message);
                if (attempt < MAX_RETRIES - 1) {
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                } else {
                    console.error('Max retries reached. Exiting...');
                    return;
                }
            }
        }

        startNonceRound = NONCE;

        let tnxRound;
        if (k == numRound) {
            tnxRound = numTnxLatestRound;
        } else {
            tnxRound = NUM_BATCH;
        }

        // Start sending transactions
        console.log(`\nSending ${tnxRound} transactions with NONCE start ${startNonceRound}...`);
        for (let i = 0; i < tnxRound; i++) {
            try {
                // tnxType0(NONCE, estimatedGas, gasPrice, gasLimit, encodedData);
                const tx = {
                    to: CONTRACT_ADDRESS,
                    gas: estimatedGas,
                    gasPrice: gasPrice * BigInt(100 + GAS_FEE_INCREASE_PERCENT) / BigInt(100),
                    gasLimit: gasLimit,
                    nonce: NONCE,
                    value: '0x00',
                    data: encodedData
                };
                tnxType0(web3, account, tx);
                NONCE += BigInt(1);
                await new Promise(resolve => setTimeout(resolve, TIME_WAITING / 5));
            } catch (error) {
                console.error('Error creating and sending transaction:', error);
            }
        }


        // Time to complete the transactions
        // maximum 72*5s = 360s
        let nonce;
        let isTxsSuccessful = false
        for (let j = 0; j < 72; j++) {
            nonce = await web3.eth.getTransactionCount(account.address);
            if (nonce >= NONCE) {
                isTxsSuccessful = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, TIME_WAITING / 2));
        }
        if (isTxsSuccessful) {
            console.log(`nonce: ${nonce} and NONCE ${NONCE}`);  
        }
        console.log(`--> Done ${nonce - startNonceRound} transactions!!!\n`);
        totalTnxSent += Number(nonce - startNonceRound);
    }

    // Resend failed transactions
    if (totalTnxSent < NUM_TNX) {
        console.log(`\nResending ${NUM_TNX - totalTnxSent} failed transactions...`);
    }
    while (totalTnxSent < NUM_TNX) {
        let startNonceRound;
        // Resend failed transactions
        NONCE = await web3.eth.getTransactionCount(account.address);
        startNonceRound = NONCE;
        estimatedGas = await web3.eth.estimateGas({
            to: CONTRACT_ADDRESS,
            data: encodedData
        });
        gasLimit = web3.utils.toHex(estimatedGas) * 2;

        // Start sending transactions
        console.log(`\nSending 2 transactions with NONCE start ${NONCE}...`);
        for (let i = 0; i < 2; i++) {
            try {
                // tnxType0(NONCE, estimatedGas, gasPrice, gasLimit, encodedData);
                const tx = {
                    to: CONTRACT_ADDRESS,
                    gas: estimatedGas,
                    gasPrice: gasPrice * BigInt(100 + GAS_FEE_INCREASE_PERCENT) / BigInt(100),
                    gasLimit: gasLimit,
                    nonce: NONCE,
                    value: '0x00',
                    data: encodedData
                };
                tnxType0(web3, account, tx);
                NONCE += BigInt(1);
                await new Promise(resolve => setTimeout(resolve, TIME_WAITING / 3));
            } catch (error) {
                console.error('Error creating and sending transaction:', error);
            }
        }

        let nonce;
        for (let j = 0; j < 72; j++) {
            nonce = await web3.eth.getTransactionCount(account.address);
            if (nonce >= NONCE) {
                console.log(`--> Done ${nonce - startNonceRound} transactions!!!\n`);
                break;
            }
            await new Promise(resolve => setTimeout(resolve, TIME_WAITING / 2));
        }
        totalTnxSent += Number(nonce - startNonceRound);

    }

    console.log("Total Transactions Sent:", totalTnxSent);

}

loop();






