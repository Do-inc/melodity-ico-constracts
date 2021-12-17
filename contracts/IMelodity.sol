// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IMelodity {
    /**
     * Lock the provided amount of MELD for "relativeReleaseTime" seconds starting from now
     * NOTE: This method is capped
     * NOTE: time definition in the locks is relative!
     */
    function insertLock(
        address account,
        uint256 amount,
        uint256 relativeReleaseTime
    ) external;

    function saleLock(address account, uint256 amount) external;

	function burnUnsold(uint256 amountToBurn) external;
}