# @vearnfi/contracts

This repository contains a set of smart contracts associated with the vearn protocol. Notably, the Trader contract is responsible for storing user preferences, collecting fees generated by the contract, and initiating swap operations via a DEX.

## Addresses

Testnet

Trader: 0x18558Ae54e703390C39F4Aa936659701D8da4B84

## Overview

1. Upon deployment, the Trader contract sets the protocol owner as the deployer account and defines a set of addresses pointing to the DEXs supported by the protocol. No new DEXs can be added after deployment.
2. The owner then designates an admin account.
3. Users must call the saveConfig function to set a positive reserveBalance amount, indicating the VTHO balance they wish to maintain in their account at all times. Upon completion, the saveConfig function emits a Config event indicating the target account and the associated reserveBalance.
4. Users must also call the approve method on the Energy contract to grant permission for the Trader contract to spend VTHO tokens on their behalf. This operation emits an Approval event indicating the owner of the tokens (target account), the spender (Trader contract), and the amount of tokens that can be spent.
5. The vearn backend catches both the Approval and Config events, and starts monitoring the target account waiting until the VTHO balance reaches a certain threshold. At that point, the vearn server calls the swap method on the Trader contract (on behalf of the admin account), providing parameters such as the target account, DEX ID for the swap, withdrawAmount, and maximum accepted exchange rate. Internally, the swap function calculates the transaction fee incurred and the vearn protocol fee, deducts them from the initial withdrawAmount, and sends the remaining amount to the selected DEX to exchange for VET tokens. This process is completed in a single atomic operation. Upon successful execution, the swap method emits a Swap event, which is also captured by the backend.
6. The owner retains the ability to reset the admin account at any time using the setAdmin function.
7. The owner can adjust the fee charged by the protocol at any time using the setFeeMultiplier function. Allowed values range from 0 to 0.3%.
8. The owner can withdraw accrued fees at any time using the withdrawFees method.

## Getting started

To get started, clone the repository and set environment variables based on the provided example:

```
git clone https://github.com/vearnfi/contracts.git
cd contracts
npm i
cp ./env.example ./env
```

## Testing

Ensure your Docker daemon is running, and then launch a local blockchain:

```
systemctl start docker
docker-compose up -d
npm test
```

## Deployment

```
npm run deploy:testnet
npm run deploy:mainnet
```

## Resources

- [https://docs.vechain.org/core-concepts/transactions/transaction-calculation](https://docs.vechain.org/core-concepts/transactions/transaction-calculation)

- [https://learn.vechain.energy/Vechain/How-to/Calculate-Gas-Fees/](https://learn.vechain.energy/Vechain/How-to/Calculate-Gas-Fees/)

- [https://docs.vechain.org/vechain-and-hardhat/hardhat-sample-project-ethers](https://docs.vechain.org/vechain-and-hardhat/hardhat-sample-project-ethers)

- [https://docs.vechain.org/openzeppelin-compatibility/how-to-recreate/setup-a-thor-solo-node](https://docs.vechain.org/openzeppelin-compatibility/how-to-recreate/setup-a-thor-solo-node)

- [https://blog.vechain.energy/how-to-swap-tokens-in-a-contract-c82082024aed](https://blog.vechain.energy/how-to-swap-tokens-in-a-contract-c82082024aed)

- [https://docs.uniswap.org/contracts/v2/guides/smart-contract-integration/trading-from-a-smart-contract](https://docs.uniswap.org/contracts/v2/guides/smart-contract-integration/trading-from-a-smart-contract)

## Debug

- Set breakpoint
- (VSCode) Open Javascript Debug Terminal
- nvm use 18
- npm run test
- On the DEBUG CONSOLE you can interact with the variables
