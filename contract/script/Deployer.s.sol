// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {HotelToken} from "../src/HotelToken.sol";
import {HotelBooking} from "../src/HotelBooking.sol";

contract DeployerScript is Script {
    function setUp() public {}

    function run() public returns (HotelBooking) {
        vm.startBroadcast();
        HotelToken token = new HotelToken();
        HotelBooking hotelBooking = new HotelBooking(address(token));

        vm.stopBroadcast();
        return hotelBooking;
    }
}
