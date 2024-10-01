// const { Web3 } = require('web3');

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
        console.log(signed.transactionHash);
        const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
        return receipt;
    } catch (error) {
        console.error('Error creating and sending transaction:', error.message);
    }
}

async function tnxType2(amount) {
    try {

        console.log("Account Address:", account.address);

        const encodedData = contract.methods.withdraw(amount).encodeABI();
        const maxPriorityFeePerGas = web3.utils.toWei('1', 'gwei');
        const estimatedGas = await web3.eth.estimateGas({
            to: CONTRACT_ADDRESS,
            data: encodedData
        });

        console.log("Estimated Gas:", estimatedGas);

        const baseFee = await web3.eth.getBlock('latest').then(block => block.baseFeePerGas);
        const maxFeePerGas = web3.utils.toHex(BigInt(baseFee) + BigInt(maxPriorityFeePerGas));

        var rawTx = {
            nonce: '0x' + (await web3.eth.getTransactionCount(account.address, 'pending')).toString(16),
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            maxFeePerGas: maxFeePerGas,
            gasLimit: web3.utils.toHex(estimatedGas),
            to: CONTRACT_ADDRESS,
            value: '0x00',
            data: encodedData,
            type: '0x2', // Specify EIP-1559 transaction type
            chainId: CHAIN_ID
        };

        console.log("--------Raw Tnx--------\n", rawTx);

        account.signTransaction(rawTx).then(signed => {
            web3.eth.sendSignedTransaction(signed.rawTransaction)
                .on('receipt', receipt => console.log(receipt.transactionHash, "\n"))
                .on('error', error => console.error("Transaction failed:", error.message, "\n"));
        });
    } catch (error) {
        console.error('Error creating and sending transaction:', error.message);
    }
}

module.exports = { tnxType0, tnxType2 };

