"use client";

import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription, // 新增
} from "@/components/ui/dialog";
import {
  bookingAddress,
  bookingAbi,
  tokenAbi,
  tokenAddress,
} from "@/constants";

interface BookRoomModalProps {
  roomCategory: number;
  account: string | null;
  onBookingComplete: () => void;
  room: {
    id: number;
    pricePerNight: ethers.BigNumberish;
  };
}

export function BookRoomModal({
  roomCategory,
  account,
  onBookingComplete,
  room,
}: BookRoomModalProps) {
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    // 设置默认日期
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    setCheckInDate(formatDate(today));
    setCheckOutDate(formatDate(tomorrow));
  }, []);

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const handleBookRoom = useCallback(async () => {
    if (!account) {
      alert("请先连接您的钱包。");
      return;
    }

    const checkInTimestamp = Math.floor(new Date(checkInDate).getTime() / 1000);
    const checkOutTimestamp = Math.floor(
      new Date(checkOutDate).getTime() / 1000
    );

    console.log("预订参数:", {
      roomCategory,
      checkInTimestamp,
      checkOutTimestamp,
    });

    if (checkInTimestamp >= checkOutTimestamp) {
      alert("退房日期必须在入住日期之后。");
      return;
    }

    setIsBooking(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(bookingAddress, bookingAbi, signer);
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);

      // 检查房间是否可用
      const roomDetails = await contract.getRoomDetails(roomCategory);
      console.log("房间详情:", roomDetails);
      if (!roomDetails.isAvailable) {
        throw new Error("所选房间已不可用");
      }

      // 检查用户余额
      const balance = await tokenContract.balanceOf(account);
      console.log("用户余额:", balance.toString());

      // 计算总价
      const daysBooked = Math.ceil(
        (checkOutTimestamp - checkInTimestamp) / (24 * 60 * 60)
      );
      const totalPrice = BigInt(room.pricePerNight) * BigInt(daysBooked);
      console.log("总价:", totalPrice.toString());

      if (balance < totalPrice) {
        throw new Error("代币余额不足");
      }

      // 检查授权
      const allowance = await tokenContract.allowance(account, bookingAddress);
      console.log("当前授权:", allowance.toString());
      if (allowance < totalPrice) {
        console.log("正在请求授权...");
        const approveTx = await tokenContract.approve(
          bookingAddress,
          totalPrice
        );
        await approveTx.wait();
        console.log("授权成功");
      }

      // 估算 gas
      console.log("正在估算 gas...");
      const estimatedGas = await contract.bookRoomByCategory.estimateGas(
        roomCategory,
        checkInTimestamp,
        checkOutTimestamp
      );
      console.log("估算的 gas:", estimatedGas.toString());

      // 预订房间
      console.log("正在发送预订交易...");
      const tx = await contract.bookRoomByCategory(
        roomCategory,
        checkInTimestamp,
        checkOutTimestamp,
        { gasLimit: (estimatedGas * BigInt(120)) / BigInt(100) }
      );
      console.log("交易已发送:", tx.hash);
      await tx.wait();
      console.log("交易已确认");

      setIsOpen(false);
      onBookingComplete();
    } catch (error: any) {
      console.error("预订房间时出错:", error);
      if (error.reason) {
        alert(`预订房间失败: ${error.reason}`);
      } else if (error.message) {
        alert(`预订房间失败: ${error.message}`);
      } else {
        alert("预订房间失败。请检查控制台以获取更多信息。");
      }
    } finally {
      setIsBooking(false);
    }
  }, [
    account,
    checkInDate,
    checkOutDate,
    roomCategory,
    room,
    onBookingComplete,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          预定房间
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>预定房间</DialogTitle>
          <DialogDescription>请选择您的入住和离开日期。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <DateInput
            label="入住日期"
            value={checkInDate}
            onChange={setCheckInDate}
          />
          <DateInput
            label="离开日期"
            value={checkOutDate}
            onChange={setCheckOutDate}
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleBookRoom}
            className={`font-bold py-2 px-4 rounded ${
              isBooking
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-700"
            } text-white`}
            disabled={isBooking}
          >
            {isBooking ? "预定中..." : "确认预定"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DateInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function DateInput({ label, value, onChange }: DateInputProps) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <label htmlFor={label} className="text-right">
        {label}
      </label>
      <Input
        id={label}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="col-span-3"
      />
    </div>
  );
}
