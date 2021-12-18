const { expect } = require("chai")
const { ethers } = require("hardhat")

const generateMelodity = async () => {
	const Melodity = await ethers.getContractFactory("Melodity")
	const melodity = await Melodity.deploy()
	return await melodity.deployed()
}

const generateCrowdsale = async (
	melodity,
	start = 0,
	end = 9999999999,
	funds = ethers.utils.parseEther("350000000.0")
) => {
	Crowdsale = await ethers.getContractFactory("TestableCrowdsale")
	crowdsale = await Crowdsale.deploy(
		start,
		end,
		funds,
		melodity.address
	)

	await crowdsale.deployed()

	// grant admin role for referral release
	await melodity.grantRole(
		"0x0000000000000000000000000000000000000000000000000000000000000000",
		crowdsale.address
	)

	// grant crowdsale role for everything else
	await melodity.grantRole(
		"0x0000000000000000000000000000000000000000000000000000000000000001",
		crowdsale.address
	)
	return crowdsale
}

const timetravel = async (seconds = 3600) => {
	await network.provider.send("evm_increaseTime", [seconds])
	await network.provider.send("evm_mine")
}

describe("Crowdsale", function () {
	let owner,
		acc_1,
		acc_2,
		crowdsale,
		melodity,
		multisig_wallet = "0x01Af10f1343C05855955418bb99302A6CF71aCB8"

	beforeEach(async function () {
		[owner, acc_1, acc_2] = await ethers.getSigners()

		melodity = await generateMelodity()
		crowdsale = await generateCrowdsale(melodity)
	})
	it("reverts if funds are sent directly", async function () {
		try {
			await owner.sendTransaction({
				to: crowdsale.address,
				value: ethers.utils.parseEther("0.1"),
			})
		} catch (e) {
			expect(e.message).to.equals(
				"VM Exception while processing transaction: reverted with reason string " +
					"'Direct funds receiving not enabled, call 'buy' directly'"
			)
		}
	})
	it("can buy without referral", async function () {
		expect(await ethers.provider.getBalance(multisig_wallet)).to.equal(0)

		await crowdsale.buy("0x0000000000000000000000000000000000000000", {
			value: ethers.utils.parseEther("1.0"),
		})
		let locks = await melodity.locksOf(owner.address)

		// first conversion round => 1 BNB = 6000 MELD
		/**
		 * Lock the bought amount:
		 *  - 10% released immediately (minted)
		 *  - 15% released after 3 months
		 *  - 25% released after 9 month (every 6 months starting from the third)
		 *  - 25% released after 15 month (every 6 months starting from the third)
		 *  - 25% released after 21 month (every 6 months starting from the third)
		 */
		expect(locks.length).to.equal(4)
		expect(locks[0].locked).to.equals(ethers.utils.parseEther("900.0"))
		expect(locks[1].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(locks[2].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(locks[3].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(await melodity.balanceOf(owner.address)).to.equals(
			ethers.utils.parseEther("600.0")
		)

		// check that funds are proxied correctly
		expect(await ethers.provider.getBalance(multisig_wallet)).to.equals(
			ethers.utils.parseEther("1.0")
		)

		// check supply is reduced and distributed is increased
		expect(await crowdsale.supply()).to.equals(
			ethers.utils.parseEther("349994000.0")
		)
		expect(await crowdsale.distributed()).to.equals(
			ethers.utils.parseEther("6000.0")
		)
	})
	it("can buy with an invalid referral", async function () {
		expect(await ethers.provider.getBalance(multisig_wallet)).to.equal(
			ethers.utils.parseEther("1.0")
		)

		await crowdsale.buy(acc_1.address, {
			value: ethers.utils.parseEther("1.0"),
		})
		let locks = await melodity.locksOf(owner.address)

		// first conversion round => 1 BNB = 6000 MELD
		/**
		 * Lock the bought amount:
		 *  - 10% released immediately (minted)
		 *  - 15% released after 3 months
		 *  - 25% released after 9 month (every 6 months starting from the third)
		 *  - 25% released after 15 month (every 6 months starting from the third)
		 *  - 25% released after 21 month (every 6 months starting from the third)
		 */
		expect(locks.length).to.equal(4)
		expect(locks[0].locked).to.equals(ethers.utils.parseEther("900.0"))
		expect(locks[1].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(locks[2].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(locks[3].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(await melodity.balanceOf(owner.address)).to.equals(
			ethers.utils.parseEther("600.0")
		)

		// check that funds are proxied correctly
		expect(await ethers.provider.getBalance(multisig_wallet)).to.equals(
			ethers.utils.parseEther("2.0")
		)

		// check supply is reduced and distributed is increased
		expect(await crowdsale.supply()).to.equals(
			ethers.utils.parseEther("349994000.0")
		)
		expect(await crowdsale.distributed()).to.equals(
			ethers.utils.parseEther("6000.0")
		)
	})
	it("can buy with a valid referral", async function () {
		expect(await ethers.provider.getBalance(multisig_wallet)).to.equal(
			ethers.utils.parseEther("2.0")
		)

		await crowdsale
			.connect(acc_1)
			.createReferral("0", `100${"0".repeat(18)}`)

		await crowdsale.buy(acc_1.address, {
			value: ethers.utils.parseEther("1.0"),
		})
		let locks = await melodity.locksOf(owner.address)

		// first conversion round => 1 BNB = 6000 MELD
		/**
		 * Lock the bought amount:
		 *  - 10% released immediately (minted)
		 *  - 15% released after 3 months
		 *  - 25% released after 9 month (every 6 months starting from the third)
		 *  - 25% released after 15 month (every 6 months starting from the third)
		 *  - 25% released after 21 month (every 6 months starting from the third)
		 */
		expect(locks.length).to.equal(4)
		expect(locks[0].locked).to.equals(ethers.utils.parseEther("904.5"))
		expect(locks[1].locked).to.equals(ethers.utils.parseEther("1507.5"))
		expect(locks[2].locked).to.equals(ethers.utils.parseEther("1507.5"))
		expect(locks[3].locked).to.equals(ethers.utils.parseEther("1507.5"))
		expect(await melodity.balanceOf(owner.address)).to.equals(
			ethers.utils.parseEther("603.0")
		)

		// check that funds are proxied correctly
		expect(await ethers.provider.getBalance(multisig_wallet)).to.equals(
			ethers.utils.parseEther("3.0")
		)

		// check supply is reduced and distributed is increased
		expect(await crowdsale.supply()).to.equals(
			ethers.utils.parseEther("349993970.0")
		)
		expect(await crowdsale.distributed()).to.equals(
			ethers.utils.parseEther("6030.0")
		)
	})
	it("cannot call destroy before end", async function () {
		try {
			await crowdsale.destroy()
		} catch (e) {
			expect(e.message).to.equals(
				"VM Exception while processing transaction: reverted with reason string " +
					"'Destruction not enabled yet, you may call this function starting from Friday, April 1, 2022 00:59:59 UTC'"
			)
		}
	})
	it("referrer prize is correctly computed", async function () {
		await crowdsale
			.connect(acc_1)
			.createReferral(`100${"0".repeat(18)}`, "0")

		await crowdsale.buy(acc_1.address, {
			value: ethers.utils.parseEther("1.0"),
		})

		// check that prize is computed correctly
		expect((await crowdsale.connect(acc_1).getReferrals()).prize).to.equals(
			ethers.utils.parseEther("30.0")
		)
	})
	it("can redeem referral prize", async function () {
		// crowdsale ends in 30 mins
		crowdsale = await generateCrowdsale(melodity, 0, (Date.now() / 1000 | 0) + 1800)

		await crowdsale
			.connect(acc_1)
			.createReferral(`100${"0".repeat(18)}`, "0")

		await crowdsale.buy(acc_1.address, {
			value: ethers.utils.parseEther("1.0"),
		})

		await timetravel()

		await crowdsale.connect(acc_1).redeemReferralPrize()
		expect((await melodity.locksOf(acc_1.address))[0].locked).to.equals(ethers.utils.parseEther("30.0"))
	})
	it("referrer prize cannot be redeemed before end", async function () {
		await crowdsale
			.connect(acc_1)
			.createReferral(`100${"0".repeat(18)}`, "0")

		await crowdsale.buy(acc_1.address, {
			value: ethers.utils.parseEther("1.0"),
		})

		try {
			await crowdsale.connect(acc_1).redeemReferralPrize()
		} catch (e) {
			expect(e.message).to.equals(
				"VM Exception while processing transaction: reverted with reason string " +
					"'Referral prize can be redeemed only after the end of the ICO'"
			)
		}
	})
	it("referrer prize cannot be redeemed if empty", async function () {
		await crowdsale
			.connect(acc_1)
			.createReferral(`100${"0".repeat(18)}`, "0")

		try {
			await crowdsale.connect(acc_1).redeemReferralPrize()
		} catch (e) {
			expect(e.message).to.equals(
				"VM Exception while processing transaction: reverted with reason string " +
					"'No referral prize to redeem'"
			)
		}
	})
	it("is started returns the correct value", async function () {
		expect(await crowdsale.isStarted()).to.equals(true)
		crowdsale = await generateCrowdsale(melodity, 9999999999)
		expect(await crowdsale.isStarted()).to.equals(false)
	})
	it("can call destroy after end", async function () {
		crowdsale = await generateCrowdsale(melodity, 0, 0)
		expect(await crowdsale.supply()).to.equals(ethers.utils.parseEther("350000000.0"))
		
		await crowdsale.destroy()

		expect(await crowdsale.supply()).to.equals(ethers.utils.parseEther("0.0"))
	})
	it("can buy 1 time only with a ref code", async function () {
		await crowdsale
			.connect(acc_1)
			.createReferral("0", `100${"0".repeat(18)}`)
		
		await crowdsale
			.connect(acc_2)
			.createReferral("0", `100${"0".repeat(18)}`)
		
		await crowdsale.buy(acc_1.address, {
			value: ethers.utils.parseEther("1.0")
		})

		let locks = await melodity.locksOf(owner.address)

		expect(locks.length).to.equal(4)
		expect(locks[0].locked).to.equals(ethers.utils.parseEther("904.5"))
		expect(locks[1].locked).to.equals(ethers.utils.parseEther("1507.5"))
		expect(locks[2].locked).to.equals(ethers.utils.parseEther("1507.5"))
		expect(locks[3].locked).to.equals(ethers.utils.parseEther("1507.5"))
		expect(await melodity.balanceOf(owner.address)).to.equals(
			ethers.utils.parseEther("603.0")
		)

		await crowdsale.buy(acc_1.address, {
			value: ethers.utils.parseEther("1.0")
		})

		locks = await melodity.locksOf(owner.address)

		expect(locks.length).to.equal(8)
		expect(locks[4].locked).to.equals(ethers.utils.parseEther("900.0"))
		expect(locks[5].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(locks[6].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(locks[7].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(await melodity.balanceOf(owner.address)).to.equals(
			ethers.utils.parseEther("1203.0")
		)

		await crowdsale.buy(acc_2.address, {
			value: ethers.utils.parseEther("1.0")
		})

		locks = await melodity.locksOf(owner.address)

		expect(locks.length).to.equal(12)
		expect(locks[8].locked).to.equals(ethers.utils.parseEther("900.0"))
		expect(locks[9].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(locks[10].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(locks[11].locked).to.equals(ethers.utils.parseEther("1500.0"))
		expect(await melodity.balanceOf(owner.address)).to.equals(
			ethers.utils.parseEther("1803.0")
		)
	})
	it("is tier computation correct", async function () {
		let tokens_bought, exceeding_eth, keeper
		keeper = await crowdsale.computeTokensAmount(ethers.utils.parseEther("1.0"))
		tokens_bought = keeper[0].toString()
		exceeding_eth = keeper[1].toString()
		expect(tokens_bought).to.equal(ethers.utils.parseEther("6000.0"))
		expect(exceeding_eth).to.equal(ethers.utils.parseEther("0.0"))

		keeper = await crowdsale.computeTokensAmount(ethers.utils.parseEther("2.0"))
		tokens_bought = keeper[0].toString()
		exceeding_eth = keeper[1].toString()
		expect(tokens_bought).to.equal(ethers.utils.parseEther("12000.0"))
		expect(exceeding_eth).to.equal(ethers.utils.parseEther("0.0"))

		keeper = await crowdsale.computeTokensAmount(ethers.utils.parseEther("4100.0"))
		tokens_bought = keeper[0].toString()
		exceeding_eth = keeper[1].toString()
		expect(tokens_bought).to.equal(ethers.utils.parseEther("24600000.0")) // 24.6 mln
		expect(exceeding_eth).to.equal(ethers.utils.parseEther("0.0"))

		keeper = await crowdsale.computeTokensAmount(ethers.utils.parseEther("4200.0"))
		tokens_bought = keeper[0].toString()
		exceeding_eth = keeper[1].toString()
		expect(tokens_bought).to.equal("25100000000000000000002000") // 25.1 mln
		expect(exceeding_eth).to.equal(ethers.utils.parseEther("0.0"))

		keeper = await crowdsale.computeTokensAmount(ethers.utils.parseEther("4201.0"))
		tokens_bought = keeper[0].toString()
		exceeding_eth = keeper[1].toString()
		expect(tokens_bought).to.equal("25103000000000000000002000") // 25.103 mln
		expect(exceeding_eth).to.equal(ethers.utils.parseEther("0.0"))

		keeper = await crowdsale.computeTokensAmount(ethers.utils.parseEther("350000.0"))
		tokens_bought = keeper[0].toString()
		exceeding_eth = keeper[1].toString()
		expect(tokens_bought).to.equal(ethers.utils.parseEther("350000000.0")) // 350 mln
		expect(exceeding_eth).to.equal("45833333333333333333336")
	})
	it("refund exceeding ether", async function () {		
		let old_balance = await ethers.provider.getBalance(owner.address)

		await crowdsale.buy(acc_1.address, {
			value: ethers.utils.parseEther("350000.0")
		})

		let locks = await melodity.locksOf(owner.address)

		expect(locks.length).to.equal(4)
		expect(locks[0].locked).to.equals(ethers.utils.parseEther("52500000.0"))
		expect(locks[1].locked).to.equals(ethers.utils.parseEther("87500000.0"))
		expect(locks[2].locked).to.equals(ethers.utils.parseEther("87500000.0"))
		expect(locks[3].locked).to.equals(ethers.utils.parseEther("87500000.0"))
		expect(await melodity.balanceOf(owner.address)).to.equals(
			ethers.utils.parseEther("35000000.0")
		)
		
		expect(await crowdsale.toRefund(owner.address)).to.equals("45833333333333333333336")
		expect(await ethers.provider.getBalance(crowdsale.address)).equals("45833333333333333333336")
	
		await crowdsale.refund()

		expect(await crowdsale.toRefund(owner.address)).to.equals(0)
		expect(await ethers.provider.getBalance(crowdsale.address)).equals(0)
	})
})
