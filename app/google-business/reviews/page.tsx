"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ChevronRight,
  Filter,
  Loader2,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface Review {
  name: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl: string;
  };
  starRating: string;
  comment: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
}

export default function GoogleBusinessReviewsPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 認証状態を確認
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/google/locations");
        if (response.ok) {
          setIsAuthenticated(true);
          const data = await response.json();
          if (data.locations) {
            setLocations(data.locations);
            if (data.locations.length > 0) {
              setSelectedLocation(data.locations[0].name);
            }
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    if (mounted) {
      checkAuth();
    }
  }, [mounted]);

  // レビューを取得
  useEffect(() => {
    const fetchReviews = async () => {
      if (!selectedLocation) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/google/reviews?locationId=${selectedLocation}`
        );
        if (response.ok) {
          const data = await response.json();
          setReviews(data.reviews || []);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "レビューの取得に失敗しました");
        }
      } catch (error) {
        console.error("Fetch reviews error:", error);
        setError("レビューの取得中にエラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedLocation) {
      fetchReviews();
    }
  }, [selectedLocation]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // レビューに返信
  const replyToReview = async () => {
    if (!selectedReview || !replyText) return;

    setIsReplying(true);

    try {
      const response = await fetch("/api/google/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewId: selectedReview.name,
          reply: replyText,
        }),
      });

      if (response.ok) {
        // 返信成功後、レビュー一覧を更新
        const updatedReviews = reviews.map((review) => {
          if (review.name === selectedReview.name) {
            return {
              ...review,
              reviewReply: {
                comment: replyText,
                updateTime: new Date().toISOString(),
              },
            };
          }
          return review;
        });
        setReviews(updatedReviews);
        setReplyText("");
        setSelectedReview(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "レビューへの返信に失敗しました");
      }
    } catch (error) {
      console.error("Reply to review error:", error);
      setError("レビューへの返信中にエラーが発生しました");
    } finally {
      setIsReplying(false);
    }
  };

  // レビューを更新
  const refreshReviews = async () => {
    if (!selectedLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/google/reviews?locationId=${selectedLocation}`
      );
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "レビューの更新に失敗しました");
      }
    } catch (error) {
      console.error("Refresh reviews error:", error);
      setError("レビューの更新中にエラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // 星評価を数値に変換
  const getStarRating = (rating: string) => {
    switch (rating) {
      case "ONE":
        return 1;
      case "TWO":
        return 2;
      case "THREE":
        return 3;
      case "FOUR":
        return 4;
      case "FIVE":
        return 5;
      default:
        return 0;
    }
  };

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 検索フィルター
  const filteredReviews = searchTerm
    ? reviews.filter(
        (review) =>
          review.reviewer?.displayName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          review.comment?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : reviews;

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar currentPath="/google-business/reviews" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader
          title="Googleレビュー管理"
          currentPath="/google-business/reviews"
          searchPlaceholder="レビューを検索..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          backUrl="/"
        />

        {/* Main area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <motion.h1
                className="text-xl md:text-2xl font-bold"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                Googleレビュー管理
              </motion.h1>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedLocation}
                  onValueChange={setSelectedLocation}
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="ロケーションを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.name} value={location.name}>
                        {location.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={refreshReviews}
                  disabled={isLoading}
                >
                  <RefreshCw
                    size={16}
                    className={cn("mr-2", isLoading && "animate-spin")}
                  />
                  更新
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>エラー</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isAuthenticated && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>
                    Googleビジネスプロフィールと連携してください
                  </CardTitle>
                  <CardDescription>
                    Googleレビューを管理するには、まずGoogleビジネスプロフィールと連携する必要があります。
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild>
                    <a href="/google-business/connect">連携ページへ移動</a>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="all" className="w-full mb-6">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="all">すべて</TabsTrigger>
                  <TabsTrigger value="unreplied">未返信</TabsTrigger>
                  <TabsTrigger value="replied">返信済み</TabsTrigger>
                </TabsList>
                <Button variant="outline" size="sm">
                  <Filter size={14} className="mr-2" /> フィルター
                </Button>
              </div>

              <TabsContent value="all">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2
                      size={24}
                      className="animate-spin text-muted-foreground"
                    />
                  </div>
                ) : filteredReviews.length > 0 ? (
                  <div className="space-y-4">
                    {filteredReviews.map((review) => (
                      <ReviewCard
                        key={review.name}
                        review={review}
                        onReply={() => {
                          setSelectedReview(review);
                          setReplyText(review.reviewReply?.comment || "");
                        }}
                        formatDate={formatDate}
                        getStarRating={getStarRating}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium mb-1">
                      レビューが見つかりません
                    </h3>
                    <p className="text-muted-foreground">
                      このロケーションにはまだレビューがありません。
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="unreplied">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2
                      size={24}
                      className="animate-spin text-muted-foreground"
                    />
                  </div>
                ) : filteredReviews.filter((review) => !review.reviewReply)
                    .length > 0 ? (
                  <div className="space-y-4">
                    {filteredReviews
                      .filter((review) => !review.reviewReply)
                      .map((review) => (
                        <ReviewCard
                          key={review.name}
                          review={review}
                          onReply={() => {
                            setSelectedReview(review);
                            setReplyText("");
                          }}
                          formatDate={formatDate}
                          getStarRating={getStarRating}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium mb-1">
                      未返信のレビューはありません
                    </h3>
                    <p className="text-muted-foreground">
                      すべてのレビューに返信済みです。
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="replied">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2
                      size={24}
                      className="animate-spin text-muted-foreground"
                    />
                  </div>
                ) : filteredReviews.filter((review) => review.reviewReply)
                    .length > 0 ? (
                  <div className="space-y-4">
                    {filteredReviews
                      .filter((review) => review.reviewReply)
                      .map((review) => (
                        <ReviewCard
                          key={review.name}
                          review={review}
                          onReply={() => {
                            setSelectedReview(review);
                            setReplyText(review.reviewReply?.comment || "");
                          }}
                          formatDate={formatDate}
                          getStarRating={getStarRating}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                    <h3 className="text-lg font-medium mb-1">
                      返信済みのレビューはありません
                    </h3>
                    <p className="text-muted-foreground">
                      まだどのレビューにも返信していません。
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* 返信ダイアログ */}
      <Dialog
        open={!!selectedReview}
        onOpenChange={(open) => !open && setSelectedReview(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>レビューに返信</DialogTitle>
            <DialogDescription>
              {selectedReview?.reviewer?.displayName}さんのレビューに返信します
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedReview && (
              <div className="mb-4 p-4 bg-muted/50 rounded-md">
                <div className="flex items-center mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < getStarRating(selectedReview.starRating)
                          ? "text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400"
                          : "text-muted dark:text-muted"
                      )}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDate(selectedReview.createTime)}
                  </span>
                </div>
                <p className="text-sm">
                  {selectedReview.comment || "(本文なし)"}
                </p>
              </div>
            )}
            <Textarea
              placeholder="返信を入力してください"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              キャンセル
            </Button>
            <Button onClick={replyToReview} disabled={!replyText || isReplying}>
              {isReplying ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" /> 送信中...
                </>
              ) : (
                "返信を送信"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// レビューカードコンポーネント
function ReviewCard({
  review,
  onReply,
  formatDate,
  getStarRating,
}: {
  review: Review;
  onReply: () => void;
  formatDate: (date: string) => string;
  getStarRating: (rating: string) => number;
}) {
  return (
    <Card className="bg-card/50 backdrop-blur-md border rounded-xl shadow-sm">
      <CardContent className="p-4 md:p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium">
                {review.reviewer?.displayName || "匿名ユーザー"}
              </h3>
              {!review.reviewReply && (
                <Badge variant="destructive" className="text-xs">
                  未返信
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(review.createTime)}
            </p>
          </div>
        </div>
        <div className="flex items-center mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-4 w-4",
                i < getStarRating(review.starRating)
                  ? "text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400"
                  : "text-muted dark:text-muted"
              )}
            />
          ))}
        </div>
        <p className="text-sm mb-3">{review.comment || "(本文なし)"}</p>

        {review.reviewReply && (
          <div className="bg-muted/50 p-3 rounded-md mb-3">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs font-medium">あなたの返信</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(review.reviewReply.updateTime)}
              </p>
            </div>
            <p className="text-sm">{review.reviewReply.comment}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/80 hover:bg-muted"
            onClick={onReply}
          >
            <span className="flex items-center">
              {review.reviewReply ? "返信を編集" : "返信する"}{" "}
              <ChevronRight className="h-4 w-4 ml-1" />
            </span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
