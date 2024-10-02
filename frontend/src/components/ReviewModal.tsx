"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { bookingAddress, bookingAbi } from "@/constants";

interface ReviewModalProps {
  roomId: number;
  account: string | null;
  onReviewComplete: () => void;
}

export function ReviewModal({
  roomId,
  account,
  onReviewComplete,
}: ReviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = useCallback(async () => {
    if (!account) {
      alert("请先连接您的钱包。");
      return;
    }

    setIsSubmitting(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(bookingAddress, bookingAbi, signer);

      const tx = await contract.addReview(roomId, rating, comment);
      await tx.wait();

      setIsOpen(false);
      onReviewComplete();
    } catch (error: any) {
      console.error("提交评价时出错:", error);
      alert(`提交评价失败: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [account, roomId, rating, comment, onReviewComplete]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
          评价
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>提交评价</DialogTitle>
          <DialogDescription>
            请为您的住宿体验打分并留下评论。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ReviewInput
            label="评分"
            type="number"
            min={1}
            max={5}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          />
          <ReviewInput
            label="评论"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitReview}
            className={`font-bold py-2 px-4 rounded ${
              isSubmitting
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-700"
            } text-white`}
            disabled={isSubmitting}
          >
            {isSubmitting ? "提交中..." : "提交评价"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ReviewInputProps {
  label: string;
  type?: string;
  min?: number;
  max?: number;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ReviewInput({ label, ...props }: ReviewInputProps) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <label htmlFor={label} className="text-right">
        {label}
      </label>
      <Input id={label} className="col-span-3" {...props} />
    </div>
  );
}
