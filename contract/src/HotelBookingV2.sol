// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./HotelBooking.sol";

/// @custom:oz-upgrades-from HotelBooking
contract HotelBookingV2 is HotelBooking {
    // 新增方法：获取房间是否可用
    function isRoomAvailable(uint256 roomId) public view returns (bool) {
        require(roomId < roomCount, "Room does not exist");
        return rooms[roomId].isAvailable;
    }
}
