"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, ListOrdered } from "lucide-react";
import RoomCard from "@/components/RoomCardModal";
import AddRoomModal from "@/components/AddRoomModal";
import { BookListModal } from "@/components/BookListModal";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useAccount, useDisconnect } from "wagmi";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshRooms = useCallback(() => {
    setRefreshTrigger((prev: number) => prev + 1);
  }, []);

  const handleBookRoom = async (roomId: number) => {
    // 这里只需要刷新房间列表
    refreshRooms();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Hotel Booking DApp</h1>
          <ConnectWalletButton />
        </div>
        <div className="flex justify-between items-center mb-4">
          <BookListModal account={address ?? null} />
          <Button
            className={`
              flex items-center gap-2 
              bg-white text-black hover:bg-gray-100
              ${!isConnected && "opacity-50 cursor-not-allowed"}
            `}
            disabled={!isConnected}
            onClick={() => setIsAddRoomModalOpen(true)}
          >
            <PlusIcon className="h-4 w-4" />
            添加房间
          </Button>
        </div>
        <RoomCard
          account={address ?? null}
          onBookRoom={handleBookRoom}
          refreshTrigger={refreshTrigger}
        />
      </div>
      <AddRoomModal
        isOpen={isAddRoomModalOpen}
        onClose={() => setIsAddRoomModalOpen(false)}
        onAddRoom={refreshRooms}
      />
    </div>
  );
}
