"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, CoinsIcon, WalletIcon, Loader2 } from "lucide-react";
import RoomCard from "@/components/RoomCardModal";
import AddRoomModal from "@/components/AddRoomModal";
import { BookListModal } from "@/components/BookListModal";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";
import { useAccount } from "wagmi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ethers } from "ethers";
import {
  bookingAddress,
  bookingAbi,
  rpcUrl,
  ownerAddress,
  tokenAddress,
  tokenAbi,
} from "@/constants";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const fetchWithRetry = async (
  fetchFunction: () => Promise<any>,
  maxRetries = 3
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFunction();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, i))
      ); // 指数退避
    }
  }
};

export default function Home() {
  const { address, isConnected } = useAccount();
  const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchCategory, setSearchCategory] = useState("all");
  const [rooms, setRooms] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const [isMinting, setIsMinting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isOwner = address?.toLowerCase() === ownerAddress.toLowerCase();

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

  const fetchRooms = useCallback(async () => {
    if (!provider) return;

    try {
      const contract = new ethers.Contract(
        bookingAddress,
        bookingAbi,
        provider
      );
      await fetchWithRetry(() => contract.getAllRooms());
      setRooms(await contract.getAllRooms());
    } catch (error) {
      console.error("获取房间时出错:", error);
      // 显示错误消息给用户
    }
  }, [provider]);

  useEffect(() => {
    if (provider) {
      fetchRooms();
    }
  }, [fetchRooms, provider, refreshTrigger]);

  const refreshRooms = useCallback(() => {
    setRefreshTrigger((prev: number) => prev + 1);
  }, []);

  const handleBookRoom = async (roomId: number) => {
    refreshRooms();
  };

  const filteredRooms = rooms.filter(
    (room: { category: number }) =>
      searchCategory === "all" || room.category.toString() === searchCategory
  );

  const fetchTokenBalance = useCallback(async () => {
    if (!provider || !address) return;

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        tokenAbi,
        provider
      );
      const balance = await tokenContract.balanceOf(address);
      setTokenBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error("获取代币余额时出错:", error);
    }
  }, [provider, address]);

  useEffect(() => {
    if (provider && address) {
      fetchTokenBalance();
    }
  }, [fetchTokenBalance, provider, address]);

  const handleMintTokens = async () => {
    if (!address) {
      alert("请先连接钱包");
      return;
    }

    setIsMinting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);

      const amount = ethers.parseEther("100");
      const tx = await tokenContract.mint(address, amount);
      await tx.wait();

      alert("充值成功！");
      await fetchTokenBalance();
    } catch (error) {
      console.error("充值失败:", error);
      alert("充值失败，请查看控制台了解详情。");
    } finally {
      setIsMinting(false);
    }
  };

  const handleWithdrawTokens = async () => {
    if (!address || !isOwner) {
      alert("只有合约拥有者可以取款");
      return;
    }

    setIsWithdrawing(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(bookingAddress, bookingAbi, signer);

      const tx = await contract.withdrawTokens();
      await tx.wait();

      alert("取款成功！");
      await fetchTokenBalance();
    } catch (error) {
      console.error("取款失败:", error);
      alert("取款失败，请查看控制台了解详情。");
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Hotel Booking DApp</h1>
          <div className="flex items-center space-x-4">
            <ConnectWalletButton />
            {isConnected && (
              <div className="bg-white text-black rounded-md px-3 py-2 text-sm font-medium">
                代币余额: {tokenBalance}
              </div>
            )}
            {isConnected && (
              <>
                <Button
                  className="bg-white text-black hover:bg-gray-100 font-bold py-2 px-4 rounded"
                  onClick={handleMintTokens}
                  disabled={isMinting}
                >
                  {isMinting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CoinsIcon className="h-4 w-4 mr-2" />
                  )}
                  {isMinting ? "充值中..." : "充值"}
                </Button>
                {isOwner && (
                  <Button
                    className="bg-white text-black hover:bg-gray-100 font-bold py-2 px-4 rounded"
                    onClick={handleWithdrawTokens}
                    disabled={isWithdrawing}
                  >
                    {isWithdrawing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <WalletIcon className="h-4 w-4 mr-2" />
                    )}
                    {isWithdrawing ? "取款中..." : "取款"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center mb-4">
          <BookListModal account={address ?? null} isConnected={isConnected} />
          {isOwner && (
            <Button
              className={`
                bg-white text-black hover:bg-gray-100 font-bold py-2 px-4 rounded
                ${
                  isClient && !isConnected
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }
              `}
              disabled={isClient ? !isConnected : undefined}
              onClick={() => isConnected && setIsAddRoomModalOpen(true)}
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              添加房间
            </Button>
          )}
        </div>
        <div className="mb-4">
          <Select
            defaultValue="all"
            onValueChange={(value: string) => setSearchCategory(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择房间类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="0">Presidential</SelectItem>
              <SelectItem value="1">Deluxe</SelectItem>
              <SelectItem value="2">Suite</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div>Loading rooms...</div>
        ) : error ? (
          <div>Error: {error.message}</div>
        ) : (
          <RoomCard
            account={address ?? null}
            onBookRoom={handleBookRoom}
            refreshTrigger={refreshTrigger}
            rooms={filteredRooms}
          />
        )}
      </div>
      {isOwner && (
        <AddRoomModal
          isOpen={isAddRoomModalOpen}
          onClose={() => setIsAddRoomModalOpen(false)}
          onAddRoom={refreshRooms}
        />
      )}
    </div>
  );
}
