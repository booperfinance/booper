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
    expect(await booper.totalRevenue()).to.equal(1);
  });
});

const feeBPS = 10;
const daoFeeBPS = 250;
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
    const fees = amount.mul(feeBPS).div(1000);
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
  it("Should estimate fees correctly - single participant", async function() {
    const before = await idex.balanceOf(owner.address);

    await idex.approve(booper.address, MAX_UINT256);

    await booper.unboop(1);

    await booper.boop(amount);
    expect(await booper.totalRevenue()).to.equal(1);
    expect(await idex.balanceOf(booper.address)).to.equal(amount);

    const fees = amount.mul(feeBPS).div(1000);
    const dao_share = fees.mul(daoFeeBPS).div(1000);
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
    const new_fees_dao = new_fees_protocol.mul(daoFeeBPS).div(1000);
    // rewards claim from first burn after deducting dao share
    const paid_amount = fees.add(dao_share).sub(new_fees_dao);
    // protocol fees from rewards claim
    const new_fees_rewards = new_fees_protocol.mul(feeBPS).div(1000);
    // dao share of fees from rewards claim
    const dao_share_2 = new_fees_rewards.mul(daoFeeBPS).div(1000);
    // fees not paid yet (protocol fees from the new burn)
    const fees_current_burn = fees.mul(feeBPS).div(1000);
    const dao_share_current_burn = fees_current_burn.mul(daoFeeBPS).div(1000);
    // total revenue
    const revenue = new_fees_protocol.add(new_fees_rewards).add(dao_share_current_burn).sub(fees_current_burn).sub(dao_share_2);
    // final estimate of dao share
    const dao_share_final = revenue.mul(daoFeeBPS).div(1000);

    await booper.unboop(amount);
    expect(await booper.totalRevenue()).to.equal(revenue.add(1));
    expect(await booper.daoFeesAccrued()).to.equal(dao_share_final);
    expect(await idex.balanceOf(booper.address)).to.equal(revenue.sub(paid_amount));
    expect(await idex.balanceOf(owner.address)).to.equal(before.sub(revenue).add(paid_amount));

    await booper.boop(amount);
    await booper.unboop(amount);
  });

  it("Should estimate fees correctly - multi participant", async function() {
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
    expect(addr_balance.gt(amount)).to.equal(true);
    expect(await booper.totalSupply()).to.equal(0);
    expect(await idex.totalSupply()).to.equal(final_balance);
  });
});
