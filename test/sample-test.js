const { expect } = require("chai");
const hre = require("hardhat");
const {BigNumber} = require("ethers")

describe("Booper construction", function() {
  it("Should deploy contract successfully", async function() {
    const Idex = await hre.ethers.getContractFactory("erc20");
    const idex = await Idex.deploy("Idex", "IDEX", 18, BigNumber.from(10).pow(9));
    const Booper = await hre.ethers.getContractFactory("boop");
    const feeBPS = 10;
    const devFeeBPS = 10;
    const booper = await Booper.deploy(idex.address, feeBPS, devFeeBPS);
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
    const devFeeBPS = 10;
    const booper = await Booper.deploy(idex.address, feeBPS, devFeeBPS);

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
    const devFeeBPS = 10;
    const booper = await Booper.deploy(idex.address, feeBPS, devFeeBPS);
  
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
    const devFeeBPS = 10;
    const booper = await Booper.deploy(idex.address, feeBPS, devFeeBPS);
  
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
    const devFeeBPS = 10;
    const booper = await Booper.deploy(idex.address, feeBPS, devFeeBPS);
  
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
    const dev_share = fees.mul(devFeeBPS).div(1000);
    await booper.unboop(amount);
    expect(await booper.totalRevenue()).to.equal(fees);
    expect(await booper.devFeeAccrued()).to.equal(dev_share);
    expect(await idex.balanceOf(booper.address)).to.equal(fees);
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(fees));

    await booper.boop(amount);
    expect(await booper.totalRevenue()).to.equal(fees);
    expect(await booper.devFeeAccrued()).to.equal(dev_share);
    expect(await idex.balanceOf(booper.address)).to.equal(amount.add(fees));

    const paid_fee = fees.sub(dev_share.mul(2));
    const dev_share_2 = paid_fee.mul(devFeeBPS).div(1000);
    const new_fees = fees.add(fees).add(dev_share_2);
    const dev_share_final = new_fees.mul(devFeeBPS).div(1000);

    await booper.unboop(amount);
    expect(await booper.totalRevenue()).to.equal(new_fees);
    expect(await booper.devFeeAccrued()).to.equal(dev_share_final);
    expect(await idex.balanceOf(booper.address)).to.equal(new_fees.sub(paid_fee));
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(new_fees).add(paid_fee));
  });
});