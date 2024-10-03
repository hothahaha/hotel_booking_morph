// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HotelBooking} from "../src/HotelBooking.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployHotelBookingUUPS is Script {
    function run() external {
        vm.startBroadcast();

        // 部署模拟代币
        ERC20Mock mockToken = new ERC20Mock();
        console.log("MockToken deployed at:", address(mockToken));

        // 部署实现合约
        HotelBooking implementation = new HotelBooking();
        console.log(
            "HotelBooking implementation deployed at:",
            address(implementation)
        );

        // 编码初始化函数调用
        bytes memory data = abi.encodeWithSelector(
            HotelBooking.initialize.selector,
            address(mockToken)
        );

        // 部署代理合约
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), data);
        console.log("HotelBooking proxy deployed at:", address(proxy));

        // 验证代理合约是否正确初始化
        HotelBooking upgradeable = HotelBooking(address(proxy));
        address tokenAddress = address(upgradeable.token());
        console.log("Token address in the contract:", tokenAddress);
        require(tokenAddress == address(mockToken), "Token address mismatch");

        vm.stopBroadcast();
    }
}
