// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

abstract contract Referrable {
	using EnumerableSet for EnumerableSet.AddressSet;

	event ReferralCreated(address creator);
	event ReferralUsed(address referrer, address referred);
	event ReferralPrizeRedeemed(address referrer);

	struct Referral {
		uint256 referrerPrize;
		uint256 referredPrize;
		uint256 prize;
	}

	mapping(address => Referral) public referrals;
	
	EnumerableSet.AddressSet private alreadyReferred;
	uint256 public baseReferral;
	uint256 public baseReferralDecimals;

	/**
		@param _baseReferral Maximum referral prize that will be splitted between the referrer
				and the referred
		@param _baseReferralDecimals Number of decimal under the base (18) the referral value is.
				This values allow for decimal values like 0.5%, the minimum is 0.[0 x 17 times]1 
	 */
	constructor(uint256 _baseReferral, uint256 _baseReferralDecimals) {
		baseReferralDecimals = _baseReferralDecimals;
		
		// high precision (18 decimals) the base referral is already in the normalized form
		// 1_[0 x 18 times] = 1%
		// 5_[0 x 17 times] = 0.5%
		baseReferral = _baseReferral * 10 ** (18 - _baseReferralDecimals);
	}

	/**
		@param _referrerPercent Percentage of baseReferral that is destinated to the referrer,
				18 decimal position needed for the unit
		@param _referredPercent Percentage of baseReferral that is destinated to the referred,
				18 decimal position needed for the unit
	 */
	function createReferral(uint256 _referrerPercent, uint256 _referredPercent) public {
		require(
			_referrerPercent + _referredPercent == 100 * 10 ** 18,
			"All the referral percentage must be distributed (100%)"
		);
		require(
			referrals[msg.sender].referrerPrize == 0 || referrals[msg.sender].referredPrize == 0,
			"Referral already initialized, unable to edit it"
		);
		require(
			referrals[msg.sender].prize == 0,
			"Referral has already been used, unable to edit it"
		);

		uint256 referrerPrize = baseReferral * _referrerPercent / 10 ** 20; // 18 decimals + transposition from integer to percentage
		uint256 referredPrize = baseReferral * _referredPercent / 10 ** 20; // 18 decimals + transposition from integer to percentage

		referrals[msg.sender] = Referral({
			referrerPrize: referrerPrize,
			referredPrize: referredPrize,
			prize: 0
		});

		emit ReferralCreated(msg.sender);
	}

	/**
		@param _ref Referrer address
		@param _value Value of the currency whose bonus should be computed
		@return (
			Referred bonus based on the submitted _value,
			Total value of the bonus, may be used for minting calculations
		)
	 */
	function computeReferralPrize(address _ref, uint256 _value) internal returns(uint256, uint256) {	
		if (
			// check if the referrer address is active and compute the referral if it is
			referrals[_ref].referrerPrize + referrals[_ref].referredPrize == baseReferral &&
			
			// check that no other referral have veen used before, if any referral have been used
			// any new ref-code will not be considered
			!alreadyReferred.contains(msg.sender)
			) {
			// insert the sender in the list of the referred user locking it from any other call
			alreadyReferred.add(msg.sender);

			uint256 referrerBonus = _value * referrals[_ref].referrerPrize / 10 ** 20; // 18 decimals + transposition from integer to percentage
			uint256 referredBonus = _value * referrals[_ref].referredPrize / 10 ** 20; // 18 decimals + transposition from integer to percentage

			referrals[_ref].prize += referrerBonus;

			emit ReferralUsed(_ref, msg.sender);
			return (referredBonus, referrerBonus + referredBonus);
		}
		// fallback to no bonus if the ref code is not active or already used a ref code
		return (0, 0);
	}

	function redeemReferralPrize() virtual public;

	function getReferrals() public view returns(Referral memory) {
		return referrals[msg.sender];
	}
}