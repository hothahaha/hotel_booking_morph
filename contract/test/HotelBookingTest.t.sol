// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {HotelBooking} from "../src/HotelBooking.sol";
import {ERC20Mock} from "@openzeppelin/contracts/mocks/token/ERC20Mock.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract HotelBookingTest is Test {
    ERC20Mock mockToken;
    HotelBooking bookingImplementation;
    HotelBooking booking;
    address owner = address(1);
    address guest1 = address(2);
    address guest2 = address(3);

    function setUp() public {
        mockToken = new ERC20Mock();
        mockToken.mint(address(this), 1000 ether);

        bookingImplementation = new HotelBooking();

        bytes memory data = abi.encodeWithSelector(
            HotelBooking.initialize.selector,
            address(mockToken)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(bookingImplementation),
            data
        );
        booking = HotelBooking(address(proxy));

        vm.prank(address(this));
        booking.transferOwnership(owner);

        vm.startPrank(owner);
        booking.addRoom(HotelBooking.RoomCategory.Presidential, 1 ether);
        booking.addRoom(HotelBooking.RoomCategory.Deluxe, 0.5 ether);
        booking.addRoom(HotelBooking.RoomCategory.Suite, 0.3 ether);
        vm.stopPrank();

        mockToken.mint(guest1, 10 ether);
        mockToken.mint(guest2, 10 ether);
    }

    function testInitialize() public view {
        assertEq(address(booking.token()), address(mockToken));
        assertEq(booking.owner(), owner);
    }

    function testAddRoom() public {
        vm.prank(owner);
        booking.addRoom(HotelBooking.RoomCategory.Presidential, 2 ether);

        (string memory category, uint256 price, bool available, ) = booking
            .getRoomDetails(3);
        assertEq(category, "Presidential");
        assertEq(price, 2 ether);
        assertTrue(available);
    }

    function testSetRoomAvailability() public {
        vm.prank(owner);
        booking.setRoomAvailability(0, false);

        (, , bool available, ) = booking.getRoomDetails(0);
        assertFalse(available);
    }

    function testBookRoomByCategory() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 2 ether);

        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate + 2 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate,
            checkOutDate
        );

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

    function testFailBookRoomWithInsufficientBalance() public {
        vm.startPrank(guest1);
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

    function testBookRoomWithInvalidDates() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 2 ether);

        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate;

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

    function testBookRoomWithZeroDuration() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 2 ether);

        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate + 1;

        vm.expectRevert(HotelBooking.HotelBooking__BookingTooShort.selector);
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate,
            checkOutDate
        );

        vm.stopPrank();
    }

    function testAddReview() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 2 ether);

        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate + 2 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate,
            checkOutDate
        );

        booking.addReview(0, 5, "Excellent stay!");

        (, , , HotelBooking.Review[] memory reviews) = booking.getRoomDetails(
            0
        );
        assertEq(reviews.length, 1);
        assertEq(reviews[0].guest, guest1);
        assertEq(reviews[0].rating, 5);
        assertEq(reviews[0].comment, "Excellent stay!");

        vm.stopPrank();
    }

    function testAddInvalidReview() public {
        vm.startPrank(guest1);
        vm.expectRevert(HotelBooking.HotelBooking__InvalidRating.selector);
        booking.addReview(0, 6, "Invalid rating");
        vm.stopPrank();
    }

    function testWithdrawTokens() public {
        // 首先，让客人预订房间，这样合约就有了一些代币
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 2 ether);

        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate + 2 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate,
            checkOutDate
        );
        vm.stopPrank();

        // 检查合约的代币余额
        uint256 contractBalance = mockToken.balanceOf(address(booking));
        assertEq(
            contractBalance,
            2 ether,
            "Contract should have 2 ether worth of tokens"
        );

        // 记录所有者的初始余额
        uint256 initialOwnerBalance = mockToken.balanceOf(owner);

        // 所有者提取代币
        vm.prank(owner);
        booking.withdrawTokens();

        // 验证所有代币都被转移到了所有者账户
        uint256 finalOwnerBalance = mockToken.balanceOf(owner);
        assertEq(
            finalOwnerBalance,
            initialOwnerBalance + contractBalance,
            "All tokens should be transferred to owner"
        );

        // 验证合约余额现在为零
        uint256 finalContractBalance = mockToken.balanceOf(address(booking));
        assertEq(
            finalContractBalance,
            0,
            "Contract balance should be zero after withdrawal"
        );
    }

    function testFailWithdrawTokensNonOwner() public {
        vm.prank(guest1);
        vm.expectRevert("Ownable: caller is not the owner");
        booking.withdrawTokens();
    }

    function testGetAllRooms() public view {
        HotelBooking.Room[] memory allRooms = booking.getAllRooms();
        assertEq(allRooms.length, 3);
        assertEq(
            uint(allRooms[0].category),
            uint(HotelBooking.RoomCategory.Presidential)
        );
        assertEq(
            uint(allRooms[1].category),
            uint(HotelBooking.RoomCategory.Deluxe)
        );
        assertEq(
            uint(allRooms[2].category),
            uint(HotelBooking.RoomCategory.Suite)
        );
    }

    function testGetBookingsByGuest() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 10 ether);

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

        HotelBooking.Booking[] memory guest1Bookings = booking
            .getBookingsByGuest(guest1);
        assertEq(guest1Bookings.length, 2);
        assertEq(guest1Bookings[0].checkInDate, checkInDate1);
        assertEq(guest1Bookings[1].checkInDate, checkInDate2);
    }

    function testGetBookingsByRoomId() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 10 ether);

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

        HotelBooking.Booking[] memory roomBookings = booking
            .getBookingsByRoomId(0);
        assertEq(roomBookings.length, 2, "Room should have 2 bookings");
        assertEq(roomBookings[0].checkInDate, checkInDate1);
        assertEq(roomBookings[0].checkOutDate, checkOutDate1);
        assertEq(
            roomBookings[0].totalPrice,
            2 ether,
            "Total price for first booking should be 2 ether"
        );
        assertEq(roomBookings[1].checkInDate, checkInDate2);
        assertEq(roomBookings[1].checkOutDate, checkOutDate2);
        assertEq(
            roomBookings[1].totalPrice,
            3 ether,
            "Total price for second booking should be 3 ether"
        );
    }

    function testFailAddRoomNonOwner() public {
        vm.prank(guest1);
        vm.expectRevert("Ownable: caller is not the owner");
        booking.addRoom(HotelBooking.RoomCategory.Presidential, 1 ether);
    }

    function testFailSetRoomAvailabilityNonOwner() public {
        vm.prank(guest1);
        vm.expectRevert("Ownable: caller is not the owner");
        booking.setRoomAvailability(0, false);
    }

    function testSetRoomAvailabilityNonExistentRoom() public {
        vm.prank(owner);
        vm.expectRevert(HotelBooking.HotelBooking__RoomDoesNotExist.selector);
        booking.setRoomAvailability(100, false);
    }

    function testAddReviewNonExistentRoom() public {
        vm.prank(guest1);
        vm.expectRevert(HotelBooking.HotelBooking__RoomDoesNotExist.selector);
        booking.addReview(100, 5, "Great room!");
    }

    function testWithdrawTokensInsufficientBalance() public {
        vm.prank(owner);
        vm.expectRevert(
            HotelBooking.HotelBooking__InsufficientContractBalance.selector
        );
        booking.withdrawTokens();
    }

    function testGetRoomDetailsNonExistentRoom() public {
        vm.expectRevert(HotelBooking.HotelBooking__RoomDoesNotExist.selector);
        booking.getRoomDetails(100);
    }

    function testGetBookingDetailsNonExistentRoom() public {
        vm.expectRevert(HotelBooking.HotelBooking__RoomDoesNotExist.selector);
        booking.getBookingDetails(100);
    }

    function testGetCategoryString() public view {
        assertEq(
            booking.getCategoryString(HotelBooking.RoomCategory.Presidential),
            "Presidential"
        );
        assertEq(
            booking.getCategoryString(HotelBooking.RoomCategory.Deluxe),
            "Deluxe"
        );
        assertEq(
            booking.getCategoryString(HotelBooking.RoomCategory.Suite),
            "Suite"
        );
    }

    function testBookRoomTotalPrice() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 2 ether);

        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate + 2 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate,
            checkOutDate
        );

        HotelBooking.Booking[] memory bookings = booking.getBookingsByGuest(
            guest1
        );
        assertEq(bookings.length, 1, "Should have one booking");
        assertEq(
            bookings[0].totalPrice,
            2 ether,
            "Total price should be 2 ether for 2 days"
        );

        vm.stopPrank();
    }

    function testBookRoomTotalPriceMultipleDays() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 5 ether);

        uint256 checkInDate = block.timestamp;
        uint256 checkOutDate = checkInDate + 5 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate,
            checkOutDate
        );

        HotelBooking.Booking[] memory bookings = booking.getBookingsByGuest(
            guest1
        );
        assertEq(bookings.length, 1, "Should have one booking");
        assertEq(
            bookings[0].totalPrice,
            5 ether,
            "Total price should be 5 ether for 5 days"
        );

        vm.stopPrank();
    }

    function testBookRoomTotalPriceDifferentCategories() public {
        vm.startPrank(guest1);
        mockToken.approve(address(booking), 10 ether);

        uint256 checkInDate1 = block.timestamp;
        uint256 checkOutDate1 = checkInDate1 + 2 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Presidential,
            checkInDate1,
            checkOutDate1
        );

        uint256 checkInDate2 = checkInDate1 + 7 days;
        uint256 checkOutDate2 = checkInDate2 + 4 days;
        booking.bookRoomByCategory(
            HotelBooking.RoomCategory.Deluxe,
            checkInDate2,
            checkOutDate2
        );

        HotelBooking.Booking[] memory bookings = booking.getBookingsByGuest(
            guest1
        );
        assertEq(bookings.length, 2, "Should have two bookings");
        assertEq(
            bookings[0].totalPrice,
            2 ether,
            "Total price for Presidential should be 2 ether for 2 days"
        );
        assertEq(
            bookings[1].totalPrice,
            2 ether,
            "Total price for Deluxe should be 2 ether for 4 days"
        );

        vm.stopPrank();
    }
}
