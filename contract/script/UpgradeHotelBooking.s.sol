// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HotelBookingV2} from "../src/HotelBookingV2.sol";
import {Upgrades} from "openzeppelin-foundry-upgrades/Upgrades.sol";

contract UpgradeHotelBooking is Script {
    function run() external {
        address proxyAddress = vm.envAddress("PROXY_ADDRESS");
        vm.startBroadcast();

        // 使用完整的合约路径
        Upgrades.upgradeProxy(
            proxyAddress,
            "HotelBookingV2.sol:HotelBookingV2",
            ""
        );

        console.log("Upgrade completed successfully");

        vm.stopBroadcast();
    }
}
