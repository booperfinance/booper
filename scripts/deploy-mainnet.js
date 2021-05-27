// We require the Hardhat Runtime Environment explicitly here. This is optional 
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile 
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const idex_address = "0xB705268213D593B8FD88d3FDEFF93AFF5CbDcfAE";
  const feeBPS = 10;
  const daoFeeBPS = 10;

  // We get the contract to deploy
  const Booper = await hre.ethers.getContractFactory("boop");
  const booper = await Booper.deploy(idex_address, feeBPS, daoFeeBPS);

  await booper.deployed();

  console.log("Booper deployed to:", booper.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
