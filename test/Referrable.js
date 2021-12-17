const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Referrable", function () {
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
		await referrable.createReferral(
			`10${"0".repeat(18)}`,
			`90${"0".repeat(18)}`
		);

		let referrals = await referrable.getReferrals();
		expect(referrals.referrerPrize).to.equal(ethers.utils.parseEther("0.05"))
		expect(referrals.referredPrize).to.equal(ethers.utils.parseEther("0.45"))
	});
	it("fail if percentage is not 100%", async function () {
		try {
			await referrable.createReferral(
				`9${"0".repeat(18)}`,
				`90${"0".repeat(18)}`
			);
		}
		catch (e) {
			expect(e.message).to.equals(
				"VM Exception while processing transaction: reverted with reason string " +
					"'All the referral percentage must be distributed (100%)'"
			);
		}
	});
	it("fail if already initialized the referrer", async function () {
		try {
			await referrable.createReferral(
				`10${"0".repeat(18)}`,
				`90${"0".repeat(18)}`
			);

			await referrable.createReferral(
				`50${"0".repeat(18)}`,
				`50${"0".repeat(18)}`
			);
		}
		catch (e) {
			expect(e.message).to.equals(
				"VM Exception while processing transaction: reverted with reason string " +
					"'Referral already initialized, unable to edit it'"
			);
		}
	});
});
