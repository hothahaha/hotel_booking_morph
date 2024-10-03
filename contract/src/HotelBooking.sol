// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract HotelBooking is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    ERC20Upgradeable public token;
    uint256 public roomCount;

    // Enums
    enum RoomCategory {
        Presidential,
        Deluxe,
        Suite
    }

    // Structs
    struct Review {
        address guest;
        uint8 rating;
        string comment;
    }

    struct Room {
        uint256 id;
        RoomCategory category;
        uint256 pricePerNight;
        bool isAvailable;
        Review[] reviews;
    }

    struct Booking {
        address guest;
        uint256 roomId;
        uint256 checkInDate;
        uint256 checkOutDate;
    }

    // Mappings
    mapping(uint256 => Room) public rooms;
    mapping(uint256 => Booking) public roomBookings;

    // 新增：用于存储每个房间的所有预订
    mapping(uint256 => Booking[]) private roomBookingsHistory;

    // Events
    event RoomAdded(uint256 roomId, string category, uint256 pricePerNight);
    event RoomBooked(
        uint256 roomId,
        address guest,
        uint256 checkInDate,
        uint256 checkOutDate
    );
    event RoomAvailabilityChanged(uint256 roomId, bool isAvailable);
    event ReviewAdded(
        uint256 roomId,
        address guest,
        uint8 rating,
        string comment
    );
    event TokensWithdrawn(address indexed owner, uint256 amount);

    // 自定义错误
    error HotelBooking__OnlyOwner();
    error HotelBooking__RoomDoesNotExist();
    error HotelBooking__InvalidRating();
    error HotelBooking__InvalidBookingDates();
    error HotelBooking__NoAvailableRoom();
    error HotelBooking__BookingTooShort();
    error HotelBooking__InsufficientTokenBalance();
    error HotelBooking__TokenTransferFailed();
    error HotelBooking__InsufficientContractBalance();

    // Modifiers
    modifier roomExists(uint256 roomId) {
        if (roomId >= roomCount) revert HotelBooking__RoomDoesNotExist();
        _;
    }

    modifier validRating(uint8 rating) {
        if (rating == 0 || rating > 5) revert HotelBooking__InvalidRating();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _token) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        token = ERC20Upgradeable(_token);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // External functions
    function addRoom(
        RoomCategory category,
        uint256 pricePerNight
    ) external onlyOwner {
        uint256 roomId = roomCount++;
        Room storage room = rooms[roomId];
        room.id = roomId;
        room.category = category;
        room.pricePerNight = pricePerNight;
        room.isAvailable = true;
        emit RoomAdded(roomId, _getCategoryString(category), pricePerNight);
    }

    function setRoomAvailability(
        uint256 roomId,
        bool isAvailable
    ) external onlyOwner roomExists(roomId) {
        rooms[roomId].isAvailable = isAvailable;
        emit RoomAvailabilityChanged(roomId, isAvailable);
    }

    function bookRoomByCategory(
        RoomCategory category,
        uint256 checkInDate,
        uint256 checkOutDate
    ) external {
        if (checkInDate >= checkOutDate)
            revert HotelBooking__InvalidBookingDates();

        uint256 roomId = _findAvailableRoomByCategory(category);
        if (roomId == type(uint256).max) revert HotelBooking__NoAvailableRoom();

        uint256 daysBooked = (checkOutDate - checkInDate) / 1 days;
        if (daysBooked == 0) revert HotelBooking__BookingTooShort();

        uint256 totalPrice = daysBooked * rooms[roomId].pricePerNight;
        if (token.balanceOf(msg.sender) < totalPrice)
            revert HotelBooking__InsufficientTokenBalance();

        Booking memory newBooking = Booking({
            guest: msg.sender,
            roomId: roomId,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate
        });

        roomBookings[roomId] = newBooking;
        roomBookingsHistory[roomId].push(newBooking);

        if (!token.transferFrom(msg.sender, address(this), totalPrice))
            revert HotelBooking__TokenTransferFailed();

        emit RoomBooked(roomId, msg.sender, checkInDate, checkOutDate);
    }

    function addReview(
        uint256 roomId,
        uint8 rating,
        string memory comment
    ) external roomExists(roomId) validRating(rating) {
        rooms[roomId].reviews.push(
            Review({guest: msg.sender, rating: rating, comment: comment})
        );
        emit ReviewAdded(roomId, msg.sender, rating, comment);
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        if (token.balanceOf(address(this)) < amount)
            revert HotelBooking__InsufficientContractBalance();
        if (!token.transfer(owner(), amount))
            revert HotelBooking__TokenTransferFailed();
        emit TokensWithdrawn(owner(), amount);
    }

    // Public view functions
    function getRoomDetails(
        uint256 roomId
    )
        public
        view
        roomExists(roomId)
        returns (
            string memory category,
            uint256 pricePerNight,
            bool isAvailable,
            Review[] memory reviews
        )
    {
        Room memory room = rooms[roomId];
        return (
            _getCategoryString(room.category),
            room.pricePerNight,
            room.isAvailable,
            room.reviews
        );
    }

    function getBookingDetails(
        uint256 roomId
    )
        public
        view
        roomExists(roomId)
        returns (
            address guest,
            uint256 checkInDate,
            uint256 checkOutDate,
            string memory category
        )
    {
        Booking memory booking = roomBookings[roomId];
        Room memory room = rooms[roomId];
        return (
            booking.guest,
            booking.checkInDate,
            booking.checkOutDate,
            _getCategoryString(room.category)
        );
    }

    function getAllRooms() public view returns (Room[] memory) {
        Room[] memory allRooms = new Room[](roomCount);
        for (uint256 i = 0; i < roomCount; i++) {
            allRooms[i] = rooms[i];
        }
        return allRooms;
    }

    function getBookingsByGuest(
        address guest
    ) public view returns (Booking[] memory) {
        uint256 bookingCount = 0;
        for (uint256 i = 0; i < roomCount; i++) {
            if (roomBookings[i].guest == guest) {
                bookingCount++;
            }
        }

        Booking[] memory guestBookings = new Booking[](bookingCount);
        uint256 index = 0;
        for (uint256 i = 0; i < roomCount; i++) {
            if (roomBookings[i].guest == guest) {
                guestBookings[index] = roomBookings[i];
                index++;
            }
        }

        return guestBookings;
    }

    // 新增：获取指定房间ID的所有预订
    function getBookingsByRoomId(
        uint256 roomId
    ) public view returns (Booking[] memory) {
        return roomBookingsHistory[roomId];
    }

    // Internal functions
    function _findAvailableRoomByCategory(
        RoomCategory category
    ) internal view returns (uint256) {
        for (uint256 i = 0; i < roomCount; i++) {
            if (rooms[i].category == category && rooms[i].isAvailable) {
                return rooms[i].id;
            }
        }
        return type(uint256).max; // Return a max value to indicate no available room
    }

    function _getCategoryString(
        RoomCategory category
    ) internal pure returns (string memory) {
        if (category == RoomCategory.Presidential) return "Presidential";
        if (category == RoomCategory.Deluxe) return "Deluxe";
        if (category == RoomCategory.Suite) return "Suite";
        return "";
    }
}
