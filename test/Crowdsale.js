const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdsale", function () {
	let owner, acc_1, Referrable, referrable
	
	beforeEach(async function () {
		[owner, acc_1] = await ethers.getSigners()

		Referrable = await ethers.getContractFactory("TestableCrowdsale");
		referrable = await Referrable.deploy(
			0,
			0,
			0,
			"0x0000000000000000000000000000000000000000",
		);
		await referrable.deployed();
	})
	it("can create referral", async function () {
		const Referrable = await ethers.getContractFactory("TestableCrowdsale");
		const referrable = await Referrable.deploy(
			0,
			0,
			0,
			"0x0000000000000000000000000000000000000000"
		);
		await referrable.deployed();

		await referrable.createReferral(
			`50${"0".repeat(18)}`,
			`50${"0".repeat(18)}`
		);

		let referrals = await referrable.getReferrals();
		expect(referrals.referrerPrize).to.equal(ethers.utils.parseEther("0.25"))
		expect(referrals.referredPrize).to.equal(ethers.utils.parseEther("0.25"))
	});
});
