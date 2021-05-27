const { expect } = require("chai");
const hre = require("hardhat");
const {BigNumber} = require("ethers");
const { ethers } = require("hardhat");

describe("Booper construction", function() {
  it("Should deploy contract successfully", async function() {
    const Idex = await hre.ethers.getContractFactory("erc20");
    const idex = await Idex.deploy("Idex", "IDEX", 18, BigNumber.from(10).pow(9));
    const Booper = await hre.ethers.getContractFactory("boop");
    const feeBPS = 100; // 1%
    const daoFeeBPS = 2500; // 25%
    const booper = await Booper.deploy(idex.address, feeBPS, daoFeeBPS);
    await booper.deployed();
    const [owner, addr1, addr2] = await ethers.getSigners();

    expect(await booper.balanceOf(owner.address)).to.equal(0);
    expect(await booper.totalSupply()).to.equal(0);
    expect(await booper.totalRevenue()).to.equal(1);
  });
});

const ONE_HUNDRED_PERCENT_IN_BPS = 10000; // 100%
const feeBPS = 100; // 1%
const daoFeeBPS = 2500; // 25%
const amount = BigNumber.from(10).pow(18);
const MAX_UINT256 = BigNumber.from(2).pow(256).sub(1);

let Idex;
let idex;
let owner, addr1, addr2;
let Booper;
let booper;

beforeEach(async function () {
  Idex = await hre.ethers.getContractFactory("erc20");
  idex = await Idex.deploy("Idex", "IDEX", 18, BigNumber.from(10).pow(9));

  [owner, addr1, addr2] = await ethers.getSigners();
  Booper = await hre.ethers.getContractFactory("boop");
  booper = await Booper.deploy(idex.address, feeBPS, daoFeeBPS);

  await booper.deployed();
});

describe("Booper mint/unmint", function() {
  it("Should mint and un-mint correctly", async function() {
    expect(await booper.totalSupply()).to.equal(0);
    before = await idex.balanceOf(owner.address);

    const MAX_UINT256 = BigNumber.from(2).pow(256).sub(1);
    await idex.approve(booper.address, MAX_UINT256);

    await booper.boop(amount);
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(amount));
    expect(await booper.balanceOf(owner.address)).to.equal(amount);
    expect(await booper.totalSupply()).to.equal(amount);

    await booper.unboop(amount);
    const fees = amount.mul(feeBPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    const returned_amount_after_fees = before.sub(fees); 
    expect(await idex.balanceOf(owner.address)).to.equal(returned_amount_after_fees);
    expect(await booper.balanceOf(owner.address)).to.equal(0);
    expect(await booper.totalSupply()).to.equal(0);
  });

  it("Should repeated mint/unmint correctly", async function() {
    expect(await booper.totalSupply()).to.equal(0);
    before = await idex.balanceOf(owner.address);

    const MAX_UINT256 = BigNumber.from(2).pow(256).sub(1);
    await idex.approve(booper.address, MAX_UINT256);

    await booper.boop(amount);
    expect(await booper.totalSupply()).to.equal(amount);
    expect(await booper.totalBooped()).to.equal(amount);
    expect(await booper.boopedAmount(owner.address)).to.equal(amount);

    await booper.unboop(amount);
    expect(await booper.totalSupply()).to.equal(0);
    expect(await booper.totalBooped()).to.equal(0);
    expect(await booper.boopedAmount(owner.address)).to.equal(0);

    await booper.boop(amount);
    expect(await booper.totalSupply()).to.equal(amount);
    expect(await booper.totalBooped()).to.equal(amount);
    expect(await booper.boopedAmount(owner.address)).to.equal(amount);
  });
});

describe("Booper transfer", function() {
  it("Should transfer correctly - failure case", async function() {
    await idex.approve(booper.address, amount);
    await booper.boop(amount);
    expect(await booper.balanceOf(owner.address)).to.equal(amount);
    expect(await booper.boopedAmount(owner.address)).to.equal(amount);
    expect(await booper.totalBooped()).to.equal(amount);

    await booper.transfer(addr1.address, amount);
    expect(await booper.balanceOf(owner.address)).to.equal(0);
    expect(await booper.balanceOf(addr1.address)).to.equal(amount);
    expect(await booper.boopedAmount(owner.address)).to.equal(0);
    expect(await booper.boopedAmount(addr1.address)).to.equal(0);
    expect(await booper.totalBooped()).to.equal(0);

    let success = false;
    try {
      await booper.transfer(addr1.address, amount);
    } catch (error) {
      success = true;
    }
    expect(success).to.equal(true);
    expect(await booper.balanceOf(owner.address)).to.equal(0);
    expect(await booper.balanceOf(addr1.address)).to.equal(amount);
    expect(await booper.boopedAmount(owner.address)).to.equal(0);
    expect(await booper.boopedAmount(addr1.address)).to.equal(0);
    expect(await booper.totalBooped()).to.equal(0);
  });

  it("Should transfer correctly - success case", async function() {
    expect(await booper.totalSupply()).to.equal(0);
    before = await idex.balanceOf(owner.address);

    const MAX_UINT256 = BigNumber.from(2).pow(256).sub(1);
    await idex.approve(booper.address, MAX_UINT256);

    await booper.boop(amount);
    expect(await booper.balanceOf(owner.address)).to.equal(amount);
    expect(await booper.totalBooped()).to.equal(amount);
    expect(await booper.boopedAmount(owner.address)).to.equal(amount);
    expect(await booper.totalSupply()).to.equal(amount);
    expect(await booper.totalRevenue()).to.equal(1);

    await booper.transfer(addr1.address, amount);
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(amount));
    expect(await booper.balanceOf(owner.address)).to.equal(0);
    expect(await booper.totalBooped()).to.equal(0);
    expect(await booper.boopedAmount(owner.address)).to.equal(0);
    expect(await booper.balanceOf(addr1.address)).to.equal(amount);
    expect(await booper.boopedAmount(addr1.address)).to.equal(0);
    expect(await booper.totalSupply()).to.equal(amount);
    expect(await booper.totalRevenue()).to.equal(1);

    await booper.connect(addr1).transfer(owner.address, amount);
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(amount));
    expect(await booper.balanceOf(owner.address)).to.equal(amount);
    expect(await booper.totalBooped()).to.equal(0);
    expect(await booper.boopedAmount(owner.address)).to.equal(0);
    expect(await booper.balanceOf(addr1.address)).to.equal(0);
    expect(await booper.boopedAmount(addr1.address)).to.equal(0);
    expect(await booper.totalSupply()).to.equal(amount);
    expect(await booper.totalRevenue()).to.equal(1);
  });
});

describe("Booper fee calculations", function() {
  it("Should estimate staking rewards correctly - single participant", async function() {
    const before = await idex.balanceOf(owner.address);

    await idex.approve(booper.address, MAX_UINT256);

    await booper.unboop(1);

    await booper.boop(amount);
    expect(await booper.totalRevenue()).to.equal(1);
    expect(await idex.balanceOf(booper.address)).to.equal(amount);

    const fees = amount.mul(feeBPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    const dao_share = fees.mul(daoFeeBPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    await booper.unboop(amount);
    expect(await booper.totalRevenue()).to.equal(fees.add(1));
    expect(await booper.daoFeesAccrued()).to.equal(dao_share);
    expect(await idex.balanceOf(booper.address)).to.equal(fees);
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(fees));

    await booper.boop(amount);
    expect(await booper.totalRevenue()).to.equal(fees.add(1));
    expect(await booper.daoFeesAccrued()).to.equal(dao_share);
    expect(await idex.balanceOf(booper.address)).to.equal(amount.add(fees));

    // Each unboop operation has 2 parts: "burn" and "rewards claim"
    // protocol fees from 1st burn + second burn
    const new_fees_protocol = fees.mul(2);
    // dao's share of burn fees
    const new_fees_dao = new_fees_protocol.mul(daoFeeBPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    // rewards claim from first burn after deducting dao share
    const paid_amount = fees.add(dao_share).sub(new_fees_dao);
    // protocol fees from rewards claim
    const new_fees_rewards = new_fees_protocol.mul(feeBPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    // dao share of fees from rewards claim
    const dao_share_2 = new_fees_rewards.mul(daoFeeBPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    // fees not paid yet (protocol fees from the new burn)
    const fees_current_burn = fees.mul(feeBPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    const dao_share_current_burn = fees_current_burn.mul(daoFeeBPS).div(ONE_HUNDRED_PERCENT_IN_BPS);
    // total revenue
    const revenue = new_fees_protocol.add(new_fees_rewards).add(dao_share_current_burn).sub(fees_current_burn).sub(dao_share_2);
    // final estimate of dao share
    const dao_share_final = revenue.mul(daoFeeBPS).div(ONE_HUNDRED_PERCENT_IN_BPS);

    await booper.unboop(amount);
    expect(await booper.totalRevenue()).to.equal(revenue.add(1));
    expect(await booper.daoFeesAccrued()).to.equal(dao_share_final);
    expect(await idex.balanceOf(booper.address)).to.equal(revenue.sub(paid_amount));
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(revenue).add(paid_amount));

    await booper.boop(amount);
    await booper.unboop(amount);
  });

  it("Should estimate staking rewards correctly - multi participant", async function() {
    const iterations = 10;

    await idex.approve(booper.address, MAX_UINT256);
    await idex.connect(addr1).approve(booper.address, MAX_UINT256);

    // stake
    await idex.transfer(addr1.address, amount);
    await booper.connect(addr1).boop(amount);

    // stake and unstake
    for(i = 0; i < iterations; i++) {
      await booper.boop(amount.mul(10000));
      await booper.unboop(amount.mul(10000));
    }

    for(i = 0; i < iterations; i++) {
      await booper.boop(amount.mul(10000));
      await booper.transfer(addr2.address, amount.mul(10000));
      await booper.connect(addr2).unboop(amount.mul(10000));
    }

    // unstake
    await booper.connect(addr1).unboop(amount);

    const arbitrageur_balance = await idex.balanceOf(addr2.address);
    const staker_balance = await idex.balanceOf(owner.address);
    const dao_share = await idex.balanceOf(booper.address);
    const addr_balance = await idex.balanceOf(addr1.address);
    const final_balance = staker_balance.add(dao_share).add(addr_balance).add(arbitrageur_balance);
    expect(await idex.balanceOf(addr2.address)).to.equal(amount.mul(99).mul(1000));
    expect(addr_balance).to.gt(amount);
    expect(await booper.totalSupply()).to.equal(0);
    expect(await idex.totalSupply()).to.equal(final_balance);
  });

  it("Should resist flashloan attacks", async function() {
    const iterations = 10;

    await idex.approve(booper.address, MAX_UINT256);
    await idex.connect(addr1).approve(booper.address, MAX_UINT256);
    await idex.connect(addr2).approve(booper.address, MAX_UINT256);

    // stake
    await idex.transfer(addr1.address, amount);
    await booper.connect(addr1).boop(amount);

    // stake and unstake
    for(i = 0; i < iterations; i++) {
      await booper.boop(amount.mul(10000));
      await booper.unboop(amount.mul(10000));
    }

    // simulate flashloan attach
    await idex.transfer(addr2.address, amount.mul(100000));
    await booper.connect(addr2).boop(amount.mul(100000));
    await booper.connect(addr2).unboop(amount.mul(100000));
    await idex.connect(addr2).transfer(owner.address, amount.mul(99000));

    // unstake
    await booper.connect(addr1).unboop(amount);

    const addr_balance = await idex.balanceOf(addr1.address);
    const attacker_balance = await idex.balanceOf(addr2.address);
    expect(addr_balance).to.gt(attacker_balance);
  });


  it("Should claim correctly", async function() {
    const iterations = 10;

    await idex.approve(booper.address, MAX_UINT256);
    await idex.connect(addr1).approve(booper.address, MAX_UINT256);

    // stake
    await idex.transfer(addr1.address, amount);
    await booper.connect(addr1).boop(amount);

    // stake and unstake
    for(i = 0; i < iterations; i++) {
      await booper.boop(amount.mul(10000));
      await booper.unboop(amount.mul(10000));
    }

    await booper.connect(addr1).claim();

    const addr_balance = await idex.balanceOf(addr1.address);
    expect(addr_balance).to.gt(amount);
  });

  it("Should add rewards correctly", async function() {
    await idex.approve(booper.address, MAX_UINT256);
    await idex.connect(addr1).approve(booper.address, MAX_UINT256);

    // stake
    await idex.transfer(addr1.address, amount);
    await booper.connect(addr1).boop(amount);
        
    await booper.addToRewards(amount.mul(100000));

    expect(await booper.totalRevenue()).to.equal(amount.mul(100000).add(1));

    // claim
    await booper.connect(addr1).claim();
    const addr_balance = await idex.balanceOf(addr1.address);
    expect(addr_balance).to.gt(amount.mul(100));
  });

  it("Should not add rewards if no one is staking", async function() {
    let success = false;
    try {
      await booper.addToRewards(amount.mul(100000));
    } catch (error) {
      success = true;
    }
    expect(success).to.equal(true);
  });

  it("Should account idex sent via erc20 transfer correctly", async function() {
    await idex.approve(booper.address, MAX_UINT256);
    await idex.connect(addr1).approve(booper.address, MAX_UINT256);

    // stake
    await idex.transfer(addr1.address, amount);
    await booper.connect(addr1).boop(amount);

    await idex.transfer(booper.address, amount.mul(100000));
    await booper.sendSwapperPayment(idex.address);

    expect(await booper.totalRevenue()).to.equal(amount.mul(100000).add(1));
  });

  it("Should account generic erc20 added to rewards correctly", async function() {
    const Token = await hre.ethers.getContractFactory("erc20");
    const token = await Token.deploy("Token", "TOKEN", 18, 1);

    await token.connect(addr1).approve(booper.address, MAX_UINT256);
    await token.transfer(addr1.address, amount);

    await idex.approve(booper.address, MAX_UINT256);
    await idex.connect(addr1).approve(booper.address, MAX_UINT256);

    // stake
    await idex.transfer(addr1.address, amount);
    await booper.connect(addr1).boop(amount);

    await token.connect(addr1).transfer(booper.address, amount);
    await booper.sendSwapperPayment(token.address);

    expect(await token.balanceOf(owner.address)).to.equal(amount);
  });

  it("Should send dao payment correctly", async function() {
    await idex.approve(booper.address, MAX_UINT256);
    await idex.connect(addr1).approve(booper.address, MAX_UINT256);

    // stake
    await idex.transfer(addr1.address, amount.mul(100000).add(amount));
    await booper.connect(addr1).boop(amount);

    const before = await idex.balanceOf(owner.address);
    await idex.transfer(addr2.address, before);

    await booper.connect(addr1).addToRewards(amount.mul(100000));

    await booper.sendDaoPayment();
    expect(await idex.balanceOf(owner.address)).to.equal(amount.mul(25000));
  });

  it("Should receive direct payments", async function() {
    prov = ethers.getDefaultProvider();
    const before = await prov.getBalance(owner.address);
    await owner.sendTransaction({to: booper.address, value: amount});
    expect(await booper.paymentsReceived()).to.equal(amount);
    await booper.sendSwapperPayment(ethers.constants.AddressZero);
    expect(await booper.paymentsReceived()).to.equal(BigNumber.from(0));
    expect(await prov.getBalance(owner.address)).to.equal(before);
  });

  it("Should not payment on invalid token address", async function() {
    await idex.approve(booper.address, MAX_UINT256);
    await booper.boop(amount);
    await booper.addToRewards(amount.mul(100000));
    let success = false;
    try {
      // not a contract so this should raise an error
      await booper.sendSwapperPayment(owner.address);
    } catch (error) {
      success = true;
    }
    expect(success).to.equal(true);
  });
});


describe("Booper stored address management", function() {
  it("Should assign addresses at initialization", async function() {
    expect(await booper.owner()).to.equal(owner.address);
    expect(await booper.dao()).to.equal(owner.address);
    expect(await booper.swapper()).to.equal(owner.address);
    expect(await booper.feeController()).to.equal(owner.address);
  });

  it("Should fail on unauthorized access - changeOwner", async function() {
    let success = true;    
    try {
      await booper.connect(addr1).changeOwner(addr1.address);
      success = false;
    } catch (error) {}
    expect(await booper.owner()).to.equal(owner.address);
    expect(success).to.equal(true);
  });

  it("Should succeed on authorized access - changeOwner", async function() {
    await booper.changeOwner(addr1.address);
    expect(await booper.owner()).to.equal(addr1.address);
  });

  it("Should fail on unauthorized access - changeDao", async function() {
    let success = true;    
    try {
      await booper.connect(addr1).changeDao(addr1.address);
      success = false;
    } catch (error) {}
    expect(await booper.dao()).to.equal(owner.address);
    expect(success).to.equal(true);
  });

  it("Should succeed on authorized access - changeDao", async function() {
    await booper.changeDao(addr1.address);
    expect(await booper.dao()).to.equal(addr1.address);
  });

  it("Should fail on unauthorized access - changeFeeController", async function() {
    let success = true;    
    try {
      await booper.connect(addr1).changeFeeController(addr1.address);
      success = false;
    } catch (error) {}
    expect(await booper.feeController()).to.equal(owner.address);
    expect(success).to.equal(true);
  });

  it("Should succeed on authorized access - changeFeeController", async function() {
    await booper.changeFeeController(addr1.address);
    expect(await booper.feeController()).to.equal(addr1.address);
  });

  it("Should fail on unauthorized access - changeSwapper", async function() {
    let success = true;    
    try {
      await booper.connect(addr1).changeSwapper(addr1.address);
      success = false;
    } catch (error) {}
    expect(await booper.swapper()).to.equal(owner.address);
    expect(success).to.equal(true);
  });

  it("Should succeed on authorized access - changeSwapper", async function() {
    await booper.changeSwapper(addr1.address);
    expect(await booper.swapper()).to.equal(addr1.address);
  });

  it("Should fail on unauthorized access - changeTradeFeeBPS", async function() {
    let success = true;    
    try {
      await booper.addr1.changeTradeFeeBPS(100);
      success = false;
    } catch (error) {}
    expect(await booper.feeBPS()).to.equal(feeBPS);
    expect(success).to.equal(true);
  });

  it("Should fail on invalid value - changeTradeFeeBPS", async function() {
    let success = true;    
    try {
      await booper.changeTradeFeeBPS(ONE_HUNDRED_PERCENT_IN_BPS);
      success = false;
    } catch (error) {}
    expect(await booper.feeBPS()).to.equal(feeBPS);
    expect(success).to.equal(true);
  });

  it("Should succeed on authorized access - changeTradeFeeBPS", async function() {
    await booper.changeTradeFeeBPS(BigNumber.from(50));
    expect(await booper.feeBPS()).to.equal(BigNumber.from(50));
  });

  it("Should fail on unauthorized access - changeDaoFeeBPS", async function() {
    let success = true;    
    try {
      await booper.addr1.changeDaoFeeBPS(100);
      success = false;
    } catch (error) {}
    expect(await booper.daoFeeBPS()).to.equal(daoFeeBPS);
    expect(success).to.equal(true);
  });

  it("Should fail on invalid value - changeDaoFeeBPS", async function() {
    let success = true;    
    try {
      await booper.changeDaoFeeBPS(ONE_HUNDRED_PERCENT_IN_BPS);
      success = false;
    } catch (error) {}
    expect(await booper.daoFeeBPS()).to.equal(daoFeeBPS);
    expect(success).to.equal(true);
  });

  it("Should succeed on authorized access - changeDaoFeeBPS", async function() {
    await booper.changeDaoFeeBPS(BigNumber.from(100));
    expect(await booper.daoFeeBPS()).to.equal(BigNumber.from(100));
  });
});