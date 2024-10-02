"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { PlusIcon, WalletIcon, LogOutIcon } from "lucide-react";
import RoomCard from "@/components/RoomCardModal";
import AddRoomModal from "@/components/AddRoomModal";
import { BookListModal } from "@/components/BookListModal";

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider;
  }
}

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.BrowserProvider(window.ethereum, "any");
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
      } catch (error) {
        console.error("连接钱包失败:", error);
      }
    } else {
      alert("请安装 MetaMask!");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsHovering(false);
  };

  const refreshRooms = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleBookRoom = async (roomId: number) => {
    // 这里只需要刷新房间列表
    refreshRooms();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8 relative">
          <div className="w-full">
            <h1 className="text-3xl font-bold text-center">
              Hotel Booking DApp
            </h1>
          </div>
          <div className="absolute right-0">
            {account ? (
              <Button
                variant="outline"
                className={`
                  flex items-center gap-2 
                  ${
                    isHovering
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-white text-black hover:bg-gray-100"
                  }
                `}
                onClick={disconnectWallet}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {isHovering ? (
                  <>
                    <LogOutIcon className="h-4 w-4" />
                    断开连接
                  </>
                ) : (
                  <>
                    <WalletIcon className="h-4 w-4" />
                    {`${account.slice(0, 6)}...${account.slice(-4)}`}
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex items-center gap-2 bg-white text-black border-black hover:bg-gray-100"
                onClick={connectWallet}
              >
                <WalletIcon className="h-4 w-4" />
                连接钱包
              </Button>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center mb-4">
          <BookListModal account={account} />
          <Button
            className={`
              flex items-center gap-2 
              bg-white text-black hover:bg-gray-100
              ${!account && "opacity-50 cursor-not-allowed"}
            `}
            disabled={!account}
            onClick={() => setIsAddRoomModalOpen(true)}
          >
            <PlusIcon className="h-4 w-4" />
            添加房屋
          </Button>
        </div>
        <RoomCard
          account={account}
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
