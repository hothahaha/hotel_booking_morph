"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";
import { bookingAddress, bookingAbi, rpcUrl } from "@/constants";
import { BookRoomModal } from "./BookRoomModal";
import { ReviewModal } from "./ReviewModal";
import { MoreVertical, Loader2 } from "lucide-react";

interface Room {
  id: number;
  category: string;
  pricePerNight: ethers.BigNumberish;
  isAvailable: boolean;
}

interface RoomCardProps {
  account: string | null;
  onBookRoom: (roomId: number) => Promise<void>;
  refreshTrigger: number;
}

const getCategoryImage = (category: string | number): string => {
  const categoryMap: Record<string, string> = {
    "0": "/2071.png",
    "1": "/2149.png",
    "2": "/7715.png",
  };
  return categoryMap[String(category)] || "/7715.png";
};

const getCategoryString = (category: string | number): string => {
  const categoryMap: Record<string, string> = {
    "0": "Presidential",
    "1": "Deluxe",
    "2": "Suite",
  };
  return categoryMap[String(category)] || "Unknown";
};

export default function RoomCard({
  account,
  onBookRoom,
  refreshTrigger,
}: RoomCardProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomReviews, setSelectedRoomReviews] = useState<any[]>([]);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRooms = useCallback(async () => {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(bookingAddress, bookingAbi, provider);

    try {
      const roomsData = await contract.getAllRooms();
      console.log("获取的房间数据:", roomsData);
      setRooms(roomsData);
    } catch (error) {
      console.error("获取房间时出错:", error);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms, refreshTrigger]);

  const handleSetAvailability = useCallback(
    async (roomId: number, isAvailable: boolean) => {
      if (!account) return;

      setIsLoading(true);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum as any);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(
          bookingAddress,
          bookingAbi,
          signer
        );

        const tx = await contract.setRoomAvailability(roomId, isAvailable);
        await tx.wait();

        console.log(`房间 ${roomId} 的可用性已设置为 ${isAvailable}`);
        fetchRooms(); // 刷新房间列表
      } catch (error: any) {
        console.error("设置房间可用性时出错:", error);
        alert(`设置房间可用性失败: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    },
    [account, fetchRooms]
  );

  const handleViewReviews = useCallback(async (roomId: number) => {
    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(
        bookingAddress,
        bookingAbi,
        provider
      );

      const roomDetails = await contract.getRoomDetails(roomId);
      setSelectedRoomReviews(roomDetails.reviews);
      setIsReviewsOpen(true);
    } catch (error: any) {
      console.error("获取房间评价时出错:", error);
      alert(`无法获取房间评价: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rooms.map((room) => (
          <RoomCardItem
            key={room.id}
            room={room}
            account={account}
            onBookRoom={onBookRoom}
            handleSetAvailability={handleSetAvailability}
            handleViewReviews={handleViewReviews}
            isLoading={isLoading}
          />
        ))}
      </div>
      <ReviewsDialog
        isOpen={isReviewsOpen}
        onOpenChange={setIsReviewsOpen}
        reviews={selectedRoomReviews}
      />
    </>
  );
}

interface RoomCardItemProps {
  room: Room;
  account: string | null;
  onBookRoom: (roomId: number) => Promise<void>;
  handleSetAvailability: (
    roomId: number,
    isAvailable: boolean
  ) => Promise<void>;
  handleViewReviews: (roomId: number) => Promise<void>;
  isLoading: boolean;
}

function RoomCardItem({
  room,
  account,
  onBookRoom,
  handleSetAvailability,
  handleViewReviews,
  isLoading,
}: RoomCardItemProps) {
  const [isSettingAvailability, setIsSettingAvailability] = useState(false);

  const handleSetAvailabilityWithLoading = async (isAvailable: boolean) => {
    setIsSettingAvailability(true);
    try {
      await handleSetAvailability(room.id, isAvailable);
    } finally {
      setIsSettingAvailability(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700 overflow-hidden flex flex-col relative">
      {isSettingAvailability && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      )}
      <div className="relative w-full h-64">
        <Image
          src={getCategoryImage(room.category)}
          alt={`${getCategoryString(room.category)} 图片`}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: "cover" }}
          priority
        />
      </div>
      <CardHeader>
        <CardTitle className="text-white text-xl">
          {getCategoryString(room.category)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-white text-lg">
          价格: {ethers.formatEther(room.pricePerNight)} ETH
        </p>
        <p className="text-white text-lg">
          状态: {room.isAvailable ? "可预订" : "已预订"}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <RoomActions
          room={room}
          account={account}
          onBookRoom={onBookRoom}
          handleSetAvailability={(roomId: number, isAvailable: boolean) =>
            handleSetAvailabilityWithLoading(isAvailable)
          }
          handleViewReviews={handleViewReviews}
          isLoading={isLoading || isSettingAvailability}
        />
      </CardFooter>
    </Card>
  );
}

interface RoomActionsProps {
  room: Room;
  account: string | null;
  onBookRoom: (roomId: number) => Promise<void>;
  handleSetAvailability: (
    roomId: number,
    isAvailable: boolean
  ) => Promise<void>;
  handleViewReviews: (roomId: number) => Promise<void>;
  isLoading: boolean;
}

function RoomActions({
  room,
  account,
  onBookRoom,
  handleSetAvailability,
  handleViewReviews,
  isLoading,
}: RoomActionsProps) {
  return (
    <>
      <div className="flex space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4 text-white" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-gray-800 text-white border-gray-700"
          >
            <DropdownMenuItem
              onClick={() => handleSetAvailability(room.id, !room.isAvailable)}
              className="hover:bg-gray-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              设置{room.isAvailable ? "已预订" : "空闲"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleViewReviews(room.id)}
              className="hover:bg-gray-700"
            >
              查看评价
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex space-x-2">
        {!room.isAvailable && (
          <ReviewModal
            roomId={room.id}
            account={account}
            onReviewComplete={() => onBookRoom(room.id)}
          />
        )}
        {room.isAvailable ? (
          <BookRoomModal
            roomCategory={Number(room.category)}
            account={account}
            onBookingComplete={() => onBookRoom(room.id)}
            room={room}
          />
        ) : (
          <Button
            disabled
            className="bg-gray-600 text-gray-400 cursor-not-allowed"
          >
            已预订
          </Button>
        )}
      </div>
    </>
  );
}

interface ReviewsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  reviews: any[];
}

function ReviewsDialog({ isOpen, onOpenChange, reviews }: ReviewsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>房间评价</DialogTitle>
          <DialogDescription>查看该房间的所有评价。</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {reviews.length === 0 ? (
            <p>暂无评价</p>
          ) : (
            <ul className="space-y-2">
              {reviews.map((review, index) => (
                <li key={index} className="border p-2 rounded">
                  <p>评分: {review.rating.toString()} / 5</p>
                  <p>评论: {review.comment}</p>
                  <p>
                    评价者: {review.guest.slice(0, 6)}...
                    {review.guest.slice(-4)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
