require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-vyper");
require('hardhat-deploy');
require("hardhat-gas-reporter");


const ALCHEMY_API_KEY = "lZTa7hOnMII_E4WXR0dIP_KXvXnakO73";
const PRIVATE_KEY = "";

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  vyper: "0.2.12",
  gasReporter: {
    currency: 'USD',
    gasPrice: 108
  },
  networks: {
    rinkeby: {
      url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [`0x${PRIVATE_KEY}`]
    }
  }
};

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});