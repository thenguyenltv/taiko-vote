
/**
 * 
 * @param {*} web3 
 * @param {*} account 
 * @param {*} tx 
 * @returns true if transaction is successful, false otherwise
 */
async function tnxType0(web3, account, tx) {
    try {
        // check info: nonce, gasPrice, gasLimit, to, data
        // Required fields
        const requiredFields = ['nonce', 'to', 'data'];

        // Check if all required fields are present
        requiredFields.forEach(field => {
            if (!tx.hasOwnProperty(field)) {
                throw new Error(`Transaction is missing required field: ${field}`);
            }
        });

        // Get default values
        if (tx.nonce === undefined) {
            tx.nonce = await web3.eth.getTransactionCount(account.address);
            console.log("Nonce unf:", tx.nonce);
        }

        if (tx.gasPrice === undefined) {
            tx.gasPrice = await web3.eth.getGasPrice();
            console.log("Gas Price unf:", tx.gasPrice);
        }

        if (tx.gasLimit === undefined) {
            tx.gasLimit = await web3.eth.estimateGas(tx) * BigInt(2);
            console.log("Gas Limit unf:", tx.gasLimit);
        }

        if (tx.value === undefined) {
            tx.value = '0x00';
        }

        const signed = await account.signTransaction(tx);  
        // optional: console.log
        // console.log(signed.transactionHash);
        const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
        return receipt;
    } catch (error) {
        console.error('Error sending tnx Type0:', error.message);
    }
}

/**
 * 
 * @param {Web3} web3 
 * @param {web3.eth.accounts} account 
 * @param {} tx 
 * @returns 
 */
async function tnxType2(web3, account, tx) {
    try {
        // check info: nonce, gasPrice, gasLimit, to, data
        // Required fields
        const requiredFields = ['nonce', 'to', 'data'];

        // Check if all required fields are present
        requiredFields.forEach(field => {
            if (!tx.hasOwnProperty(field)) {
                throw new Error(`Transaction is missing required field: ${field}`);
            }
        });

        // Get default values
        if (tx.nonce === undefined) {
            tx.nonce = await web3.eth.getTransactionCount(account.address);
            console.log("Nonce unf:", tx.nonce);
        }

        if(tx.maxFeePerGas === undefined) {
            const baseFee = await web3.eth.getBlock('latest').then(block => block.baseFeePerGas);
            const maxFeePerGas = web3.utils.toHex(BigInt(baseFee) + BigInt(maxPriorityFeePerGas));
            console.log("Max Fee Per Gas unf:", maxFeePerGas);
        }

        if(tx.maxPriorityFeePerGas === undefined) {
            maxPriorityFeePerGas = web3.utils.toWei('1', 'gwei');
            console.log("Max Priority Fee Per Gas unf:", maxPriorityFeePerGas);
        }

        if (tx.gasLimit === undefined) {
            tx.gasLimit = await web3.eth.estimateGas(tx) * BigInt(2);
            console.log("Gas Limit unf:", tx.gasLimit);
        }

        if (tx.value === undefined) {
            tx.value = '0x00';
        }

        // const encodedData = contract.methods.withdraw(amount).encodeABI();
        // const maxPriorityFeePerGas = web3.utils.toWei('1', 'gwei');

        // const baseFee = await web3.eth.getBlock('latest').then(block => block.baseFeePerGas);
        // const maxFeePerGas = web3.utils.toHex(BigInt(baseFee) + BigInt(maxPriorityFeePerGas));

        // var rawTx = {
        //     nonce: tx.nonce,
        //     maxPriorityFeePerGas: maxPriorityFeePerGas,
        //     maxFeePerGas: maxFeePerGas,
        //     gasLimit: web3.utils.toHex(estimatedGas),
        //     to: CONTRACT_ADDRESS,
        //     value: '0x00',
        //     data: encodedData,
        //     type: '0x2', // Specify EIP-1559 transaction type
        //     chainId: CHAIN_ID
        // };

        const signed = await account.signTransaction(tx);
        const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
        return receipt;
    } catch (error) {
        console.error('Error creating and sending transaction:', error.message);
    }
}

async function handleError(promise) {
    try {
        return await promise;
    } catch (error) {
        console.error("Error:", error);
        // Handle the error appropriately here
        return null; // or throw error if you want to propagate it
    }
}

/**
 * Rounds a BigInt in WEI to a specified number of decimal places.
 * 
 * @param {BigInt} num - The number in WEI to round.
 * @param {number} [decimal=18] - The number of decimals in the blockchain, default is 18.
 * @param {number} [to=5] - The number of decimal places to round to, default is 5.
 * @returns {number} The rounded amount in `ETH`.
 */
function convertWeiToNumber(num, decimal = 18, to = 5) {
    return Math.round(Number(num) / (10 ** (decimal - to))) / 10 ** to;
  }

module.exports = { tnxType0, tnxType2, handleError, convertWeiToNumber };

