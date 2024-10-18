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
import Image from "next/image";
import { bookingAddress, bookingAbi, rpcUrl, ownerAddress } from "@/constants";
import { BookRoomModal } from "./BookRoomModal";
import { ReviewModal } from "./ReviewModal";
import { MoreVertical, Loader2 } from "lucide-react";
import { ReviewsDialog } from "./ReviewsDialog";

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
  rooms: Room[]; // 新增
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
  rooms,
}: RoomCardProps) {
  const [selectedRoomReviews, setSelectedRoomReviews] = useState<any[]>([]);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [loadingRoomIds, setLoadingRoomIds] = useState<number[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isOwner = account?.toLowerCase() === ownerAddress.toLowerCase();

  const handleSetAvailability = useCallback(
    async (roomId: number, isAvailable: boolean) => {
      if (!account) return;

      setLoadingRoomIds((prev) => [...prev, roomId]);
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
        onBookRoom(roomId); // 刷新房间状态
      } catch (error: any) {
        console.error("设置房间可用性时出错:", error);
        alert(`设置房间可用性失败: ${error.message}`);
      } finally {
        setLoadingRoomIds((prev) => prev.filter((id) => id !== roomId));
      }
    },
    [account, onBookRoom]
  );

  const handleViewReviews = useCallback(async (roomId: number) => {
    setLoadingRoomIds((prev) => [...prev, roomId]);
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
      setLoadingRoomIds((prev) => prev.filter((id) => id !== roomId));
    }
  }, []);

  const checkRoomAvailability = useCallback(async (roomId: number) => {
    setLoadingRoomIds((prev) => [...prev, roomId]);
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(
        bookingAddress,
        bookingAbi,
        provider
      );
      const roomDetails = await contract.getRoomDetails(roomId);
      alert(
        `房间 ${roomId} 当前状态: ${
          roomDetails.isAvailable ? "可用" : "不可用"
        }`
      );
    } catch (error: any) {
      console.error("检查房间可用性时出错:", error);
      alert(`无法检查房间可用性: ${error.message}`);
    } finally {
      setLoadingRoomIds((prev) => prev.filter((id) => id !== roomId));
    }
  }, []);

  useEffect(() => {
    const initProvider = async () => {
      try {
        const newProvider = new ethers.JsonRpcProvider(rpcUrl);
        await newProvider.getNetwork(); // 测试连接
        setProvider(newProvider);
      } catch (error) {
        console.error("Failed to initialize provider:", error);
        // 可以在这里添加重试逻辑或显示错误消息
      }
    };

    initProvider();
  }, []);

  const fetchRoomDetails = useCallback(
    async (roomId: number) => {
      if (!provider) return;

      setLoadingRoomIds((prev) => [...prev, roomId]);
      try {
        const contract = new ethers.Contract(
          bookingAddress,
          bookingAbi,
          provider
        );
        const roomDetails = await contract.getRoomDetails(roomId);
        // 处理房间详情...
      } catch (error) {
        console.error("Error fetching room details:", error);
        // 显示错误消息给用户
      } finally {
        setLoadingRoomIds((prev) => prev.filter((id) => id !== roomId));
      }
    },
    [provider]
  );

  const handleReview = useCallback(async (roomId: number) => {
    setLoadingRoomIds((prev) => [...prev, roomId]);
    try {
      // 这里我们只是触发 ReviewModal 的打开
      // 实际的评价提交逻辑会在 ReviewModal 组件中处理
      console.log(`准备评价房间 ${roomId}`);
    } catch (error: any) {
      console.error("准备评价时出错:", error);
      alert(`准备评价失败: ${error.message}`);
    } finally {
      setLoadingRoomIds((prev) => prev.filter((id) => id !== roomId));
    }
  }, []);

  const handleReviewComplete = useCallback(
    async (roomId: number) => {
      setLoadingRoomIds((prev) => [...prev, roomId]);
      try {
        await onBookRoom(roomId); // 刷新房间状态
      } catch (error) {
        console.error("刷新房间状态时出错:", error);
      } finally {
        setLoadingRoomIds((prev) => prev.filter((id) => id !== roomId));
      }
    },
    [onBookRoom]
  );

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rooms.map((room) => (
          <Card
            key={room.id}
            className="bg-gray-800 border-gray-700 overflow-hidden flex flex-col relative"
          >
            {loadingRoomIds.includes(room.id) && (
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
                handleSetAvailability={handleSetAvailability}
                handleViewReviews={handleViewReviews}
                checkRoomAvailability={checkRoomAvailability}
                handleReview={handleReview}
                handleReviewComplete={handleReviewComplete}
                isLoading={loadingRoomIds.includes(room.id)}
                isOwner={isOwner}
                isClient={isClient}
              />
            </CardFooter>
          </Card>
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

interface RoomActionsProps {
  room: Room;
  account: string | null;
  onBookRoom: (roomId: number) => Promise<void>;
  handleSetAvailability: (
    roomId: number,
    isAvailable: boolean
  ) => Promise<void>;
  handleViewReviews: (roomId: number) => Promise<void>;
  checkRoomAvailability: (roomId: number) => Promise<void>;
  handleReview: (roomId: number) => Promise<void>;
  handleReviewComplete: (roomId: number) => Promise<void>;
  isLoading: boolean;
  isOwner: boolean;
  isClient: boolean;
}

function RoomActions({
  room,
  account,
  onBookRoom,
  handleSetAvailability,
  handleViewReviews,
  checkRoomAvailability,
  handleReview,
  handleReviewComplete,
  isLoading,
  isOwner,
  isClient,
}: RoomActionsProps) {
  if (!isClient) {
    return <div>Loading actions...</div>;
  }

  const isConnected = isClient && account !== null;

  return (
    <div className="flex justify-between items-center w-full">
      {isConnected && (
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
              onClick={() => handleViewReviews(room.id)}
              className="hover:bg-gray-700"
              disabled={isLoading}
            >
              查看评价
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem
                onClick={() =>
                  handleSetAvailability(room.id, !room.isAvailable)
                }
                className="hover:bg-gray-700"
                disabled={isLoading}
              >
                设置{room.isAvailable ? "已预订" : "空闲"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => checkRoomAvailability(room.id)}
              className="hover:bg-gray-700"
              disabled={isLoading}
            >
              检查可用性
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <div className="flex space-x-2">
        <ReviewModal
          roomId={room.id}
          account={account}
          onReviewComplete={() => handleReviewComplete(room.id)}
        />
        {isConnected && room.isAvailable ? (
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
            {isConnected ? "已预订" : "请连接钱包"}
          </Button>
        )}
      </div>
    </div>
  );
}
