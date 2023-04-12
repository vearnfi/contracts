import hre from "hardhat";

const VTHO_CONTRACT_ADDRESS = process.env.VTHO_CONTRACT_ADDRESS;
const VEROCKET_UNI_ROUTER_ADDRESS = process.env.VEROCKET_UNI_ROUTER_ADDRESS;

async function main() {
  console.log("Deploying contract...");
  console.log(
    `Using network ${hre.network.name} (${hre.network.config.chainId})`
  );

  const signers = await hre.thor.getSigners();
  const deployer = signers[0];

  const Trader = await hre.thor.getContractFactory("Trader");
  const trader = await Trader.connect(deployer).deploy(
    VTHO_CONTRACT_ADDRESS,
    VEROCKET_UNI_ROUTER_ADDRESS
  );

  await trader.deployed();
  console.log(`Trader contract deployed to ${JSON.stringify(trader)}`); // TODO: show contract address
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
