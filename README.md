# Getting started

Clone repo and set env vars based on provided example.

```
>> git clone https://github.com/vearnfi/contracts.git
>> cd contracts
>> npm i
>> cp ./env.example ./env
```

## Testing

Start your docker deamon and launch a local blockchain.

```
systemctl start docker
docker-compose up -d
npm test
```

## Challenges

1. How to compute the transaction cost associated to the swap function within itself
   in order to deduce said amount from the target account?

2. How to set a max withdraw amount to protect accounts with a large VTHO balance from a malicious actor who triggers a swap on a low liquidity DEX and attempts a sandwich attack? Should we set a MAX_WITHDRAW_AMOUNT value which is multiplied by the
   base gas price? Should we calculate the dex output and require slippage to be below certain threshold?

## Resources

- [https://docs.vechain.org/vechain-and-hardhat/hardhat-sample-project-ethers](https://docs.vechain.org/vechain-and-hardhat/hardhat-sample-project-ethers)

- [https://docs.vechain.org/openzeppelin-compatibility/how-to-recreate/setup-a-thor-solo-node](https://docs.vechain.org/openzeppelin-compatibility/how-to-recreate/setup-a-thor-solo-node)

- [https://blog.vechain.energy/how-to-swap-tokens-in-a-contract-c82082024aed](https://blog.vechain.energy/how-to-swap-tokens-in-a-contract-c82082024aed)
- [https://docs.uniswap.org/contracts/v2/guides/smart-contract-integration/trading-from-a-smart-contract](https://docs.uniswap.org/contracts/v2/guides/smart-contract-integration/trading-from-a-smart-contract)

# Debug

- Set breakpoint
- (VSCode) Open Javascript Debug Terminal
- nvm use 18
- npm run test
- On the DEBUG CONSOLE you can interact with the variables
