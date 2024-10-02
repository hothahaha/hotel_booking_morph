"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { bookingAddress, bookingAbi, rpcUrl } from "@/constants";

interface Booking {
  guest: string;
  roomId: number;
  checkInDate: number;
  checkOutDate: number;
}

interface BookListModalProps {
  account: string | null;
}

export function BookListModal({ account }: BookListModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (!account) return;

    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(
        bookingAddress,
        bookingAbi,
        provider
      );
      const bookingsData = await contract.getBookingsByGuest(account);
      setBookings(bookingsData);
    } catch (error) {
      console.error("获取预订信息时出错:", error);
      alert("获取预订信息失败。请重试。");
    } finally {
      setIsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    if (isOpen) {
      fetchBookings();
    }
  }, [isOpen, fetchBookings]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-white text-black hover:bg-gray-100 font-bold py-2 px-4 rounded">
          查看订单列表
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>订单列表</DialogTitle>
          <DialogDescription>查看您的所有预订记录。</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <p>加载中...</p>
          ) : bookings.length === 0 ? (
            <p>暂无订单</p>
          ) : (
            <ul className="space-y-2">
              {bookings.map((booking, index) => (
                <BookingItem key={index} booking={booking} />
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface BookingItemProps {
  booking: Booking;
}

function BookingItem({ booking }: BookingItemProps) {
  return (
    <li className="border p-2 rounded">
      <p>房间 ID: {booking.roomId.toString()}</p>
      <p>
        入住日期:{" "}
        {new Date(Number(booking.checkInDate) * 1000).toLocaleDateString()}
      </p>
      <p>
        离开日期:{" "}
        {new Date(Number(booking.checkOutDate) * 1000).toLocaleDateString()}
      </p>
    </li>
  );
}
