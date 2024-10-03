// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {HotelBooking} from "../src/HotelBooking.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract BookingTest is Test {
    ERC20Mock mockToken;
    HotelBooking bookingImplementation;
    HotelBooking booking;
    address owner = address(1);
    address guest1 = address(2);
    address guest2 = address(3);

    function setUp() public virtual {
        // 部署 MockERC20 代币
        mockToken = new ERC20Mock();
        mockToken.mint(address(this), 1000 ether);

        // 部署实现合约
        bookingImplementation = new HotelBooking();

        // 部署代理合约
        bytes memory data = abi.encodeWithSelector(
            HotelBooking.initialize.selector,
            address(mockToken)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(bookingImplementation),
            data
        );
        booking = HotelBooking(address(proxy));

        // 转移所有权给 owner
        vm.prank(address(this));
        booking.transferOwnership(owner);

        // 为测试准备一些房间
        vm.startPrank(owner);
        booking.addRoom(HotelBooking.RoomCategory.Presidential, 1 ether);
        booking.addRoom(HotelBooking.RoomCategory.Deluxe, 0.5 ether);
        booking.addRoom(HotelBooking.RoomCategory.Suite, 0.3 ether);
        vm.stopPrank();

        // 为客人准备一些代币
        mockToken.mint(guest1, 10 ether);
        mockToken.mint(guest2, 10 ether);
    }

    function testBookRoomByCategory() public {
        vm.startPrank(guest1);

        // 批准代币使用
        mockToken.approve(address(booking), 2 ether);

        // 预订房间
        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate + 2 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate,
            checkOutDate
        );

        // 验证预订
        (
            address bookedGuest,
            uint256 bookedCheckIn,
            uint256 bookedCheckOut,
            string memory category
        ) = booking.getBookingDetails(0);
        assertEq(bookedGuest, guest1);
        assertEq(bookedCheckIn, checkInDate);
        assertEq(bookedCheckOut, checkOutDate);
        assertEq(category, "Presidential");

        vm.stopPrank();
    }

    function testFailBookWithInsufficientBalance() public {
        vm.startPrank(guest1);

        // 只批准 0.5 ether，不足以预订总统套房
        mockToken.approve(address(booking), 0.5 ether);

        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate + 2 days;

        vm.expectRevert(
            HotelBooking.HotelBooking__InsufficientTokenBalance.selector
        );
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate,
            checkOutDate
        );

        vm.stopPrank();
    }

    function testGetBookingsByGuest() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 10 ether);

        // Guest1 预订两个房间
        uint256 checkInDate1 = block.timestamp;
        uint256 checkOutDate1 = checkInDate1 + 2 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate1,
            checkOutDate1
        );

        uint256 checkInDate2 = checkInDate1 + 7 days;
        uint256 checkOutDate2 = checkInDate2 + 3 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Deluxe,
            checkInDate2,
            checkOutDate2
        );

        vm.stopPrank();

        // Guest2 预订一个房间
        vm.startPrank(guest2);
        mockToken.approve(address(booking), 5 ether);
        uint256 checkInDate3 = block.timestamp;
        uint256 checkOutDate3 = checkInDate3 + 1 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Suite,
            checkInDate3,
            checkOutDate3
        );
        vm.stopPrank();

        // 获取 Guest1 的预订
        HotelBooking.Booking[] memory guest1Bookings = booking
            .getBookingsByGuest(guest1);

        // 验证 Guest1 有两个预订
        assertEq(guest1Bookings.length, 2, "Guest1 should have 2 bookings");

        // 验证预订详情
        assertEq(
            guest1Bookings[0].guest,
            guest1,
            "First booking guest should be guest1"
        );
        assertEq(
            guest1Bookings[0].checkInDate,
            checkInDate1,
            "First booking check-in date mismatch"
        );
        assertEq(
            guest1Bookings[0].checkOutDate,
            checkOutDate1,
            "First booking check-out date mismatch"
        );

        assertEq(
            guest1Bookings[1].guest,
            guest1,
            "Second booking guest should be guest1"
        );
        assertEq(
            guest1Bookings[1].checkInDate,
            checkInDate2,
            "Second booking check-in date mismatch"
        );
        assertEq(
            guest1Bookings[1].checkOutDate,
            checkOutDate2,
            "Second booking check-out date mismatch"
        );

        // 获取 Guest2 的预订
        HotelBooking.Booking[] memory guest2Bookings = booking
            .getBookingsByGuest(guest2);

        // 验证 Guest2 有一个预订
        assertEq(guest2Bookings.length, 1, "Guest2 should have 1 booking");

        // 验证 Guest2 的预订详情
        assertEq(
            guest2Bookings[0].guest,
            guest2,
            "Guest2 booking guest should be guest2"
        );
        assertEq(
            guest2Bookings[0].checkInDate,
            checkInDate3,
            "Guest2 booking check-in date mismatch"
        );
        assertEq(
            guest2Bookings[0].checkOutDate,
            checkOutDate3,
            "Guest2 booking check-out date mismatch"
        );
    }

    function testBookWithInvalidDates() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 2 ether);

        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate; // 相同的日期，应该失败

        vm.expectRevert(
            HotelBooking.HotelBooking__InvalidBookingDates.selector
        );
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate,
            checkOutDate
        );

        vm.stopPrank();
    }

    function testBookWithZeroDuration() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 2 ether);

        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate + 1; // 不足一天，应该失败

        vm.expectRevert(HotelBooking.HotelBooking__BookingTooShort.selector);
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate,
            checkOutDate
        );

        vm.stopPrank();
    }

    function testGetBookingsByRoomId() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 10 ether);

        // 为同一个房间预订两次
        uint256 checkInDate1 = block.timestamp;
        uint256 checkOutDate1 = checkInDate1 + 2 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate1,
            checkOutDate1
        );

        uint256 checkInDate2 = checkInDate1 + 7 days;
        uint256 checkOutDate2 = checkInDate2 + 3 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate2,
            checkOutDate2
        );

        vm.stopPrank();

        // 获取房间的预订历史
        HotelBooking.Booking[] memory roomBookings = booking
            .getBookingsByRoomId(0);

        // 验证预订历史
        assertEq(roomBookings.length, 2, "Room should have 2 bookings");
        assertEq(
            roomBookings[0].guest,
            guest1,
            "First booking guest should be guest1"
        );
        assertEq(
            roomBookings[0].checkInDate,
            checkInDate1,
            "First booking check-in date mismatch"
        );
        assertEq(
            roomBookings[0].checkOutDate,
            checkOutDate1,
            "First booking check-out date mismatch"
        );
        assertEq(
            roomBookings[1].guest,
            guest1,
            "Second booking guest should be guest1"
        );
        assertEq(
            roomBookings[1].checkInDate,
            checkInDate2,
            "Second booking check-in date mismatch"
        );
        assertEq(
            roomBookings[1].checkOutDate,
            checkOutDate2,
            "Second booking check-out date mismatch"
        );
    }
}
