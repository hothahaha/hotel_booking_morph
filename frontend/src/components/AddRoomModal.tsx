"use client";

import { useState } from "react";
import { ethers } from "ethers";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bookingAddress, bookingAbi } from "@/constants";

interface AddRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRoom: () => void;
}

export default function AddRoomModal({
  isOpen,
  onClose,
  onAddRoom,
}: AddRoomModalProps) {
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddRoom = async () => {
    if (!category || !price) {
      setError("请填写所有必填字段");
      return;
    }

    setError("");
    setIsLoading(true);

    if (typeof window.ethereum !== "undefined") {
      const provider = new ethers.BrowserProvider(
        window.ethereum as ethers.Eip1193Provider,
        "any"
      );
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(bookingAddress, bookingAbi, signer);

      try {
        const tx = await contract.addRoom(
          ethers.getBigInt(category),
          ethers.parseEther(price)
        );
        await tx.wait();
        onAddRoom(); // 调用这个函数来刷新房间列表
        onClose();
      } catch (error) {
        console.error("Error adding room:", error);
        setError("添加房间时出错");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const isFormValid = category !== "" && price !== "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>添加新房间</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select onValueChange={(value: string) => setCategory(value)}>
            <SelectTrigger>
              <SelectValue placeholder="选择房间类型 *" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Presidential</SelectItem>
              <SelectItem value="1">Deluxe</SelectItem>
              <SelectItem value="2">Suite</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="每晚价格 (ETH) *"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
        <Button
          onClick={handleAddRoom}
          disabled={!isFormValid || isLoading}
          className={`
            w-full py-2 text-lg
            ${
              isFormValid && !isLoading
                ? "bg-white text-black hover:bg-gray-100"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          {isLoading ? "处理中..." : "添加房间"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
