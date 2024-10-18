import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Review {
  guest: string;
  rating: number;
  comment: string;
}

interface ReviewsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reviews: Review[];
}

export function ReviewsDialog({
  isOpen,
  onOpenChange,
  reviews,
}: ReviewsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>房间评价</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {reviews.length === 0 ? (
            <p>暂无评价</p>
          ) : (
            reviews.map((review, index) => (
              <div key={index} className="border-b border-gray-700 pb-4">
                <p className="font-semibold">
                  评分: {review.rating.toString()}/5
                </p>
                <p className="text-sm text-gray-400">评价者: {review.guest}</p>
                <p className="mt-2">{review.comment}</p>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
