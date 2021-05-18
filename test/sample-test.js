const { expect } = require("chai");
const hre = require("hardhat");
const {BigNumber} = require("ethers")

describe("Booper construction", function() {
  it("Should deploy contract successfully", async function() {
    const Idex = await hre.ethers.getContractFactory("erc20");
    const idex = await Idex.deploy("Idex", "IDEX", 18, BigNumber.from(10).pow(9));
    const Booper = await hre.ethers.getContractFactory("boop");
    const feeBPS = 10;
    const daoFeeBPS = 10;
    const booper = await Booper.deploy(idex.address, feeBPS, daoFeeBPS);
    await booper.deployed();
    const [owner, addr1, addr2] = await ethers.getSigners();

    expect(await booper.balanceOf(owner.address)).to.equal(0);
    expect(await booper.totalSupply()).to.equal(0);
    expect(await booper.totalRevenue()).to.equal(0);
  });
});

describe("Booper mint/unmint", function() {
  it("Should mint and un-mint correctly", async function() {
    const Idex = await hre.ethers.getContractFactory("erc20");
    const idex = await Idex.deploy("Idex", "IDEX", 18, BigNumber.from(10).pow(9));
  
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Booper = await hre.ethers.getContractFactory("boop");
    const feeBPS = 10;
    const daoFeeBPS = 10;
    const booper = await Booper.deploy(idex.address, feeBPS, daoFeeBPS);

    const amount = BigNumber.from(10).pow(18);

    await booper.deployed();
    expect(await booper.totalSupply()).to.equal(0);
    before = await idex.balanceOf(owner.address);

    const MAX_UINT256 = BigNumber.from(2).pow(256).sub(1);
    await idex.approve(booper.address, MAX_UINT256);
    await booper.approve(booper.address, MAX_UINT256);

    await booper.boop(amount);
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(amount));
    expect(await booper.balanceOf(owner.address)).to.equal(amount);
    expect(await booper.totalSupply()).to.equal(amount);

    await booper.unboop(amount);
    const fees = amount.mul(feeBPS).div(1000);
    const returned_amount_after_fees = before.sub(fees); 
    expect(await idex.balanceOf(owner.address)).to.equal(returned_amount_after_fees);
    expect(await booper.balanceOf(owner.address)).to.equal(0);
    expect(await booper.totalSupply()).to.equal(0);
  });

  it("Should repeated boop/unboop correctly", async function() {
    const Idex = await hre.ethers.getContractFactory("erc20");
    const idex = await Idex.deploy("Idex", "IDEX", 18, BigNumber.from(10).pow(9));
  
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Booper = await hre.ethers.getContractFactory("boop");
    const feeBPS = 10;
    const daoFeeBPS = 10;
    const booper = await Booper.deploy(idex.address, feeBPS, daoFeeBPS);
  
    const amount = BigNumber.from(10).pow(18);
  
    await booper.deployed();

    expect(await booper.totalSupply()).to.equal(0);
    before = await idex.balanceOf(owner.address);

    const MAX_UINT256 = BigNumber.from(2).pow(256).sub(1);
    await idex.approve(booper.address, MAX_UINT256);
    await booper.approve(booper.address, MAX_UINT256);

    await booper.boop(amount.mul(10));
    expect(await booper.totalSupply()).to.equal(amount.mul(10));
    expect(await booper.totalBooped()).to.equal(amount.mul(10));
    expect(await booper.boopedAmount(owner.address)).to.equal(amount.mul(10));

    await booper.unboop(amount.mul(10));
    expect(await booper.totalSupply()).to.equal(0);
    expect(await booper.totalBooped()).to.equal(0);
    expect(await booper.boopedAmount(owner.address)).to.equal(amount.mul(0));

    await booper.boop(amount.mul(10));
    expect(await booper.totalSupply()).to.equal(amount.mul(10));
    expect(await booper.totalBooped()).to.equal(amount.mul(10));
    expect(await booper.boopedAmount(owner.address)).to.equal(amount.mul(10));
  });
});

describe("Booper transfer", function() {
  it("Should transfer correctly", async function() {
    const Idex = await hre.ethers.getContractFactory("erc20");
    const idex = await Idex.deploy("Idex", "IDEX", 18, BigNumber.from(10).pow(9));
  
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Booper = await hre.ethers.getContractFactory("boop");
    const feeBPS = 10;
    const daoFeeBPS = 10;
    const booper = await Booper.deploy(idex.address, feeBPS, daoFeeBPS);
  
    const amount = BigNumber.from(10).pow(18);
  
    await booper.deployed();

    expect(await booper.totalSupply()).to.equal(0);
    before = await idex.balanceOf(owner.address);

    const MAX_UINT256 = BigNumber.from(2).pow(256).sub(1);
    await idex.approve(booper.address, MAX_UINT256);
    await booper.approve(booper.address, MAX_UINT256);

    await booper.boop(amount);
    expect(await booper.balanceOf(owner.address)).to.equal(amount);
    expect(await booper.totalBooped()).to.equal(amount);
    expect(await booper.boopedAmount(owner.address)).to.equal(amount);
    expect(await booper.totalSupply()).to.equal(amount);
    expect(await booper.totalRevenue()).to.equal(0);

    await booper.transfer(addr1.address, amount);
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(amount));
    expect(await booper.balanceOf(owner.address)).to.equal(0);
    expect(await booper.totalBooped()).to.equal(0);
    expect(await booper.boopedAmount(owner.address)).to.equal(0);
    expect(await booper.balanceOf(addr1.address)).to.equal(amount);
    expect(await booper.boopedAmount(addr1.address)).to.equal(0);
    expect(await booper.totalSupply()).to.equal(amount);
    expect(await booper.totalRevenue()).to.equal(0);

    await booper.connect(addr1).transfer(owner.address, amount);
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(amount));
    expect(await booper.balanceOf(owner.address)).to.equal(amount);
    expect(await booper.totalBooped()).to.equal(0);
    expect(await booper.boopedAmount(owner.address)).to.equal(0);
    expect(await booper.balanceOf(addr1.address)).to.equal(0);
    expect(await booper.boopedAmount(addr1.address)).to.equal(0);
    expect(await booper.totalSupply()).to.equal(amount);
    expect(await booper.totalRevenue()).to.equal(0);
  });
});

describe("Booper fee calculations", function() {
  it("Should estimate fees correctly - single participant", async function() {
    const Idex = await hre.ethers.getContractFactory("erc20");
    const idex = await Idex.deploy("Idex", "IDEX", 18, BigNumber.from(10).pow(9));
  
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Booper = await hre.ethers.getContractFactory("boop");
    const feeBPS = 10;
    const daoFeeBPS = 250;
    const booper = await Booper.deploy(idex.address, feeBPS, daoFeeBPS);
  
    const amount = BigNumber.from(10).pow(18);
  
    await booper.deployed();

    const before = await idex.balanceOf(owner.address);

    const MAX_UINT256 = BigNumber.from(2).pow(256).sub(1);
    await idex.approve(booper.address, MAX_UINT256);
    await booper.approve(booper.address, MAX_UINT256);

    await booper.boop(amount);
    expect(await booper.totalRevenue()).to.equal(0);
    expect(await idex.balanceOf(booper.address)).to.equal(amount);

    const fees = amount.mul(feeBPS).div(1000);
    const dao_share = fees.mul(daoFeeBPS).div(1000);
    await booper.unboop(amount);
    expect(await booper.totalRevenue()).to.equal(fees);
    expect(await booper.daoFeesAccrued()).to.equal(dao_share);
    expect(await idex.balanceOf(booper.address)).to.equal(fees);
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(fees));

    await booper.boop(amount);
    expect(await booper.totalRevenue()).to.equal(fees);
    expect(await booper.daoFeesAccrued()).to.equal(dao_share);
    expect(await idex.balanceOf(booper.address)).to.equal(amount.add(fees));

    // Each unboop operation has 2 parts: "burn" and "rewards claim"
    // protocol fees from 1st burn + second burn
    const new_fees_protocol = fees.mul(2);
    // dao's share of burn fees
    const new_fees_dao = new_fees_protocol.mul(daoFeeBPS).div(1000);
    // rewards claim from first burn after deducting dao share
    const paid_amount = fees.sub(new_fees_dao);
    // protocol fees from rewards claim
    const new_fees_rewards = new_fees_protocol.mul(feeBPS).div(1000);
    // dao share of fees from rewards claim
    const dao_share_2 = new_fees_rewards.mul(daoFeeBPS).div(1000);
    // fees not paid yet (protocol fees from the new burn)
    const fees_current_burn = fees.mul(feeBPS).div(1000);
    // total revenue
    const revenue = new_fees_protocol.add(new_fees_rewards).sub(fees_current_burn).sub(dao_share_2);
    // final estimate of dao share
    const dao_share_final = revenue.mul(daoFeeBPS).div(1000);

    await booper.unboop(amount);
    expect(await booper.totalRevenue()).to.equal(revenue);
    expect(await booper.daoFeesAccrued()).to.equal(dao_share_final);
    expect(await idex.balanceOf(booper.address)).to.equal(revenue.sub(paid_amount));
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(revenue).add(paid_amount));
  });
});