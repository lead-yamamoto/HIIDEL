"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  MessageSquare,
  ChevronRight,
  Globe,
  ArrowRight,
  AlertCircle,
  Store,
  Calendar,
  TrendingUp,
  Search,
  Send,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Review {
  id: string;
  storeId: string;
  storeName: string;
  googleLocationId?: string;
  rating: number;
  comment: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string | null;
  };
  createdAt: string;
  updateTime?: string;
  replied: boolean;
  replyText?: string | null;
  replyTime?: string | null;
  isRealData?: boolean;
  isSystemMessage?: boolean;
  messageType?: string;
}

interface GroupedReviews {
  [storeName: string]: Review[];
}

export default function ReviewsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("date");
  const [filterRating, setFilterRating] = useState("all");

  // 返信機能用の状態変数
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [isGeneratingAiReply, setIsGeneratingAiReply] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);

    // URLから店舗IDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const storeId = urlParams.get("store");
    if (storeId) {
      setSelectedStore(storeId);
    }
  }, []);

  // 認証状態確認
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    checkGoogleConnection();
  }, [status, router]);

  const checkGoogleConnection = async () => {
    try {
      const response = await fetch("/api/google/auth-status");
      const data = await response.json();
      setIsGoogleConnected(data.isAuthenticated);

      if (data.isAuthenticated) {
        fetchReviews();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Google認証状態の確認に失敗:", error);
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("🔍 Fetching reviews...");
      const url =
        selectedStore === "all"
          ? "/api/reviews"
          : `/api/reviews?storeId=${selectedStore}`;
      console.log("📡 Request URL:", url);

      const response = await fetch(url);
      console.log("📡 Response status:", response.status);
      console.log(
        "📡 Response headers:",
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("📡 Error response:", errorText);
        throw new Error(`Failed to fetch reviews: ${response.status}`);
      }

      const data = await response.json();
      console.log("📡 Response data:", data);
      console.log("📡 Reviews array:", data.reviews);
      console.log("📡 Reviews count:", data.count);
      console.log("📡 Real reviews count:", data.realReviewsCount);
      console.log("📡 System messages count:", data.systemMessagesCount);
      console.log("📡 Stores checked:", data.storesChecked);
      console.log("📡 Is real data:", data.isRealData);
      if (data.reviews && data.reviews.length > 0) {
        console.log("📡 First review:", data.reviews[0]);
        data.reviews.forEach((review: Review, index: number) => {
          console.log(`📡 Review ${index + 1}:`, {
            id: review.id,
            storeName: review.storeName,
            rating: review.rating,
            isRealData: review.isRealData,
            isSystemMessage: review.isSystemMessage,
            messageType: review.messageType,
            commentPreview: review.comment?.substring(0, 50) + "...",
          });
        });
      } else {
        console.log("❌ No reviews found in response");
      }
      setReviews(data.reviews || []);
      setTotalCount(data.count || 0);
    } catch (error) {
      console.error("❌ Fetch reviews error:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  // 店舗のリストを取得
  const stores = useMemo(() => {
    const uniqueStores = Array.from(new Set(reviews.map((r) => r.storeName)));
    return ["all", ...uniqueStores];
  }, [reviews]);

  // フィルタリングされたレビュー
  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    // 店舗フィルター
    if (selectedStore !== "all") {
      filtered = filtered.filter(
        (review) => review.storeName === selectedStore
      );
    }

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(
        (review) =>
          review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.reviewer.displayName
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // 評価フィルター
    if (filterRating !== "all") {
      const rating = parseInt(filterRating);
      filtered = filtered.filter((review) => review.rating === rating);
    }

    // ソート
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "rating-high":
          return b.rating - a.rating;
        case "rating-low":
          return a.rating - b.rating;
        case "store":
          return a.storeName.localeCompare(b.storeName);
        case "replied":
          return (a.replied ? 0 : 1) - (b.replied ? 0 : 1);
        default:
          return 0;
      }
    });

    return filtered;
  }, [reviews, searchTerm, sortBy, filterRating, selectedStore]);

  // 店舗ごとにグループ化
  const groupedReviews = useMemo(() => {
    const grouped: GroupedReviews = {};
    filteredReviews.forEach((review) => {
      if (!grouped[review.storeName]) {
        grouped[review.storeName] = [];
      }
      grouped[review.storeName].push(review);
    });
    return grouped;
  }, [filteredReviews]);

  // 店舗ごとの統計情報を計算
  const getStoreStats = (storeReviews: Review[]) => {
    const realReviews = storeReviews.filter((r) => !r.isSystemMessage);
    const totalReviews = realReviews.length;
    const avgRating =
      totalReviews > 0
        ? realReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;
    const unrepliedCount = realReviews.filter((r) => !r.replied).length;

    return {
      totalReviews,
      avgRating,
      unrepliedCount,
      hasSystemMessages: storeReviews.some((r) => r.isSystemMessage),
    };
  };

  // 返信ダイアログを開く
  const openReplyDialog = (review: Review) => {
    setSelectedReview(review);
    setReplyText(review.replyText || "");
    setIsReplyDialogOpen(true);
  };

  // 返信ダイアログを閉じる
  const closeReplyDialog = () => {
    setIsReplyDialogOpen(false);
    setSelectedReview(null);
    setReplyText("");
    setIsGeneratingAiReply(false);
  };

  // AI返信を生成
  const generateAiReply = async () => {
    if (!selectedReview) return;

    setIsGeneratingAiReply(true);
    try {
      const response = await fetch("/api/ai/review-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewText: selectedReview.comment,
          rating: selectedReview.rating,
          storeName: selectedReview.storeName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setReplyText(data.reply);
      } else {
        console.error("AI返信生成に失敗:", response.status);
        // エラー時はテスト返信を生成
        const testReply = `${selectedReview.reviewer.displayName}様、この度は貴重なご意見をありがとうございます。お客様のフィードバックを真摯に受け止め、より良いサービスの提供に努めてまいります。またのご利用をお待ちしております。`;
        setReplyText(testReply);
      }
    } catch (error) {
      console.error("AI返信生成エラー:", error);
      // エラー時はテスト返信を生成
      const testReply = `${selectedReview.reviewer.displayName}様、この度は貴重なご意見をありがとうございます。お客様のフィードバックを真摯に受け止め、より良いサービスの提供に努めてまいります。またのご利用をお待ちしております。`;
      setReplyText(testReply);
    } finally {
      setIsGeneratingAiReply(false);
    }
  };

  // 返信を送信
  const submitReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    setIsReplying(true);
    try {
      const response = await fetch("/api/google/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          reply: replyText.trim(),
        }),
      });

      if (response.ok) {
        // 返信成功時はレビューリストを更新
        console.log("✅ Reply sent successfully");
        await fetchReviews();
        closeReplyDialog();
      } else {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("❌ Reply failed:", errorData);

        let errorMessage = "返信の送信に失敗しました。";
        if (errorData.details) {
          errorMessage += `\n詳細: ${errorData.details}`;
        }
        if (response.status === 401) {
          errorMessage +=
            "\nGoogle認証の有効期限が切れている可能性があります。再度ログインしてください。";
        } else if (response.status === 403) {
          errorMessage += "\nこのレビューに返信する権限がありません。";
        } else if (response.status === 404) {
          errorMessage += "\nレビューが見つかりませんでした。";
        }

        alert(errorMessage);
      }
    } catch (error) {
      console.error("返信送信エラー:", error);
      alert("返信の送信中にエラーが発生しました。");
    } finally {
      setIsReplying(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar currentPath="/reviews" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader
          title="クチコミ一覧"
          currentPath="/reviews"
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
                {selectedStore === "all"
                  ? "全店舗のクチコミ一覧"
                  : `店舗別クチコミ一覧 (${selectedStore})`}
              </motion.h1>
              {isGoogleConnected && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="text-sm">
                    未返信のみ
                  </Button>
                  <Button variant="outline" size="sm" className="text-sm">
                    評価順 <ChevronDown size={14} className="ml-1" />
                  </Button>
                </div>
              )}
            </div>

            {/* Google連携が必要な場合 */}
            {!isGoogleConnected && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-blue-500" />
                      Googleビジネスプロフィールとの連携が必要です
                    </CardTitle>
                    <CardDescription>
                      レビュー情報を表示するには、まずGoogleビジネスプロフィールと連携する必要があります。
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        連携後、お客様のレビューを一覧で確認できます
                      </div>
                      <Button
                        onClick={() => router.push("/google-business/connect")}
                        className="w-fit"
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        Google連携を開始
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* エラー表示 */}
            {error && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6 border-destructive">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      レビューの取得に失敗しました
                    </CardTitle>
                    <CardDescription>{error}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-2">考えられる原因：</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Google Business Profileの権限設定</li>
                          <li>APIアクセス制限</li>
                          <li>ネットワーク接続の問題</li>
                        </ul>
                      </div>
                      <Button
                        onClick={fetchReviews}
                        variant="outline"
                        className="w-fit"
                      >
                        再試行
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* フィルターとソート */}
            {isGoogleConnected && (
              <Card className="mb-6 shadow-md">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="relative md:col-span-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="レビューを検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <Select
                      value={selectedStore}
                      onValueChange={setSelectedStore}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="店舗を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべての店舗</SelectItem>
                        {stores.slice(1).map((store) => (
                          <SelectItem key={store} value={store}>
                            {store}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue placeholder="並び替え" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">日付順（新しい順）</SelectItem>
                        <SelectItem value="rating-high">
                          評価順（高い順）
                        </SelectItem>
                        <SelectItem value="rating-low">
                          評価順（低い順）
                        </SelectItem>
                        <SelectItem value="store">店舗名順</SelectItem>
                        <SelectItem value="replied">返信状態順</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={filterRating}
                      onValueChange={setFilterRating}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="評価でフィルター" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">すべての評価</SelectItem>
                        <SelectItem value="5">★★★★★ (5)</SelectItem>
                        <SelectItem value="4">★★★★☆ (4)</SelectItem>
                        <SelectItem value="3">★★★☆☆ (3)</SelectItem>
                        <SelectItem value="2">★★☆☆☆ (2)</SelectItem>
                        <SelectItem value="1">★☆☆☆☆ (1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ローディング状態 */}
            {isGoogleConnected && isLoading && (
              <LoadingState message="実際のレビューを取得中..." />
            )}

            {/* レビュー一覧（店舗ごとにグループ化） */}
            {isGoogleConnected && !isLoading && !error && (
              <div className="space-y-6">
                <AnimatePresence mode="wait">
                  {Object.entries(groupedReviews).map(
                    ([storeName, storeReviews], storeIndex) => {
                      const stats = getStoreStats(storeReviews);

                      return (
                        <motion.div
                          key={storeName}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{
                            duration: 0.3,
                            delay: storeIndex * 0.1,
                          }}
                        >
                          <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <Store className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <CardTitle className="text-xl">
                                      {storeName}
                                    </CardTitle>
                                    <div className="flex items-center gap-4 mt-1">
                                      <span className="text-sm text-muted-foreground">
                                        レビュー数: {stats.totalReviews}
                                      </span>
                                      {stats.totalReviews > 0 && (
                                        <>
                                          <span className="text-sm text-muted-foreground">
                                            •
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                            <span className="text-sm text-muted-foreground">
                                              平均: {stats.avgRating.toFixed(1)}
                                            </span>
                                          </div>
                                        </>
                                      )}
                                      {stats.unrepliedCount > 0 && (
                                        <>
                                          <span className="text-sm text-muted-foreground">
                                            •
                                          </span>
                                          <span className="text-sm text-red-600 dark:text-red-400">
                                            未返信: {stats.unrepliedCount}件
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {stats.hasSystemMessages && (
                                  <Badge variant="outline" className="text-xs">
                                    システム通知あり
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                {storeReviews.map((review, reviewIndex) => (
                                  <motion.div
                                    key={review.id || reviewIndex}
                                    className={cn(
                                      "p-4 rounded-lg border transition-all duration-200",
                                      review.isSystemMessage
                                        ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
                                        : "bg-card hover:shadow-md hover:border-primary/20"
                                    )}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                      duration: 0.2,
                                      delay: reviewIndex * 0.05,
                                    }}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex items-center gap-2">
                                        {review.reviewer.profilePhotoUrl ? (
                                          <img
                                            src={
                                              review.reviewer.profilePhotoUrl
                                            }
                                            alt={review.reviewer.displayName}
                                            className="w-8 h-8 rounded-full"
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-xs font-medium text-primary">
                                              {review.reviewer.displayName
                                                .charAt(0)
                                                .toUpperCase()}
                                            </span>
                                          </div>
                                        )}
                                        <div>
                                          <p className="font-medium text-sm">
                                            {review.reviewer.displayName}
                                          </p>
                                          <div className="flex items-center gap-2">
                                            {!review.isSystemMessage && (
                                              <div className="flex items-center">
                                                {Array.from({ length: 5 }).map(
                                                  (_, i) => (
                                                    <Star
                                                      key={i}
                                                      className={cn(
                                                        "h-3 w-3",
                                                        i < (review.rating || 0)
                                                          ? "text-amber-500 fill-amber-500"
                                                          : "text-muted"
                                                      )}
                                                    />
                                                  )
                                                )}
                                              </div>
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                              <Calendar className="h-3 w-3 inline mr-1" />
                                              {new Date(
                                                review.createdAt
                                              ).toLocaleDateString()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {review.isSystemMessage && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs border-amber-500 text-amber-700 dark:text-amber-300"
                                          >
                                            システム
                                          </Badge>
                                        )}
                                        {!review.isSystemMessage && (
                                          <Badge
                                            variant={
                                              review.replied
                                                ? "default"
                                                : "destructive"
                                            }
                                            className={cn(
                                              "text-xs",
                                              review.replied
                                                ? "bg-green-500 hover:bg-green-600 text-white"
                                                : ""
                                            )}
                                          >
                                            {review.replied
                                              ? "返信済み"
                                              : "未返信"}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    <p
                                      className={cn(
                                        "text-sm mb-2",
                                        review.isSystemMessage &&
                                          "text-amber-800 dark:text-amber-200"
                                      )}
                                    >
                                      {review.comment || "(本文なし)"}
                                    </p>

                                    {/* システムメッセージの詳細 */}
                                    {review.isSystemMessage && (
                                      <div className="mt-3">
                                        {review.messageType ===
                                          "api_access_restricted" && (
                                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-1">
                                              🔒 APIアクセス制限
                                            </h4>
                                            <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                                              <p>
                                                Google Business Profile
                                                APIの制限により、レビューデータに直接アクセスできません。
                                              </p>
                                              <p className="font-medium mt-2">
                                                代替手段：
                                              </p>
                                              <ul className="list-disc list-inside space-y-1 ml-2">
                                                <li>
                                                  Google My
                                                  Businessの管理画面でレビューを確認
                                                </li>
                                                <li>
                                                  アンケート機能でお客様の声を収集
                                                </li>
                                                <li>
                                                  QRコードでGoogleレビューへの投稿を促進
                                                </li>
                                              </ul>
                                            </div>
                                          </div>
                                        )}

                                        {(review.messageType ===
                                          "api_limitation" ||
                                          !review.messageType) &&
                                          review.comment.includes(
                                            "プライバシー保護"
                                          ) && (
                                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                                                💡 レビューアクセスについて
                                              </h4>
                                              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                                                <p>
                                                  • Google Business Profile
                                                  APIは、プライバシー保護のためレビューの詳細内容へのアクセスを制限しています
                                                </p>
                                                <p>
                                                  •
                                                  レビューの統計情報や概要は取得できる場合があります
                                                </p>
                                                <p>
                                                  • 実際のレビューはGoogle
                                                  Business
                                                  Profileの管理画面で確認できます
                                                </p>
                                              </div>
                                            </div>
                                          )}
                                      </div>
                                    )}

                                    {review.isSystemMessage &&
                                      review.messageType ===
                                        "no_reviews_found" && (
                                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                                            📋 確認事項
                                          </h4>
                                          <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                                            <p>
                                              • Google Business
                                              Profileでレビューが公開設定になっているか確認
                                            </p>
                                            <p>
                                              •
                                              店舗にレビューが実際に投稿されているか確認
                                            </p>
                                            <p>
                                              • Google Business
                                              Profileの管理画面でレビュー設定を確認
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                    {review.isSystemMessage &&
                                      review.messageType ===
                                        "no_account_access" && (
                                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                                            🔒 アカウントアクセスエラー
                                          </h4>
                                          <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                                            <p>
                                              • Google Business
                                              Profileのアカウント情報を取得できませんでした
                                            </p>
                                            <p>
                                              •
                                              アカウントの権限設定を確認してください
                                            </p>
                                            <p>
                                              • 再度Google認証を行ってください
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                    {review.isSystemMessage &&
                                      review.messageType ===
                                        "account_error" && (
                                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                          <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                                            ⚠️ 認証エラー
                                          </h4>
                                          <div className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                                            <p>
                                              •
                                              認証トークンの更新が必要な可能性があります
                                            </p>
                                            <p>
                                              • Google Business
                                              Profileに再度ログインしてください
                                            </p>
                                            <p>
                                              •
                                              問題が続く場合はサポートにお問い合わせください
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                    {review.isSystemMessage &&
                                      review.messageType === "fetch_error" && (
                                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                                            ❌ 取得エラー
                                          </h4>
                                          <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                                            <p>
                                              •
                                              レビューデータの取得中にエラーが発生しました
                                            </p>
                                            <p>
                                              • 一時的な問題の可能性があります
                                            </p>
                                            <p>
                                              •
                                              しばらく時間をおいて再度お試しください
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                    {review.isSystemMessage &&
                                      review.messageType === "bad_request" && (
                                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                                            ❌ リクエストエラー (400)
                                          </h4>
                                          <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                                            <p>
                                              APIリクエストの形式に問題があります。
                                            </p>
                                            <p className="font-medium mt-2">
                                              考えられる原因：
                                            </p>
                                            <ul className="list-disc list-inside space-y-1 ml-2">
                                              <li>店舗IDの形式が正しくない</li>
                                              <li>
                                                Google Business
                                                Profileの設定に問題がある
                                              </li>
                                              <li>
                                                APIエンドポイントが変更された
                                              </li>
                                            </ul>
                                            <details className="mt-2">
                                              <summary className="cursor-pointer text-xs underline">
                                                詳細エラー情報
                                              </summary>
                                              <div className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded max-h-32 overflow-y-auto">
                                                <pre className="whitespace-pre-wrap text-xs">
                                                  {review.comment}
                                                </pre>
                                              </div>
                                            </details>
                                          </div>
                                        </div>
                                      )}

                                    {review.isSystemMessage &&
                                      review.messageType === "auth_expired" && (
                                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                          <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                                            🔐 認証期限切れ
                                          </h4>
                                          <div className="text-xs text-orange-700 dark:text-orange-300">
                                            <p>
                                              Google認証の有効期限が切れています。
                                            </p>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="mt-2 text-xs h-6"
                                              onClick={() =>
                                                (window.location.href =
                                                  "/google-business/connect")
                                              }
                                            >
                                              再認証する
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                    {review.isSystemMessage &&
                                      review.messageType ===
                                        "endpoint_not_found" && (
                                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                          <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                                            ❌ エンドポイント未発見 (404)
                                          </h4>
                                          <div className="text-xs text-red-700 dark:text-red-300">
                                            <p>
                                              店舗のレビューエンドポイントが見つかりません。Google
                                              Business
                                              Profileの設定を確認してください。
                                            </p>
                                          </div>
                                        </div>
                                      )}

                                    {review.isSystemMessage &&
                                      review.messageType === "api_error" && (
                                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                                            ⚠️ APIエラー
                                          </h4>
                                          <div className="text-xs text-gray-700 dark:text-gray-300">
                                            <p>
                                              Google
                                              APIの一時的な問題によりレビューを取得できませんでした。しばらく時間をおいて再試行してください。
                                            </p>
                                            <details className="mt-2">
                                              <summary className="cursor-pointer text-xs underline">
                                                詳細エラー情報
                                              </summary>
                                              <div className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded max-h-32 overflow-y-auto">
                                                <pre className="whitespace-pre-wrap text-xs">
                                                  {review.comment}
                                                </pre>
                                              </div>
                                            </details>
                                          </div>
                                        </div>
                                      )}

                                    {review.replied &&
                                      review.replyText &&
                                      !review.isSystemMessage && (
                                        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                          <p className="text-sm font-medium mb-1">
                                            店舗からの返信:
                                          </p>
                                          <p className="text-sm">
                                            {review.replyText}
                                          </p>
                                          {review.replyTime && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              {new Date(
                                                review.replyTime
                                              ).toLocaleDateString()}
                                            </p>
                                          )}
                                        </div>
                                      )}

                                    {!review.isSystemMessage && (
                                      <div className="flex justify-end mt-3">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-primary hover:text-primary/80 hover:bg-muted"
                                          onClick={() =>
                                            openReplyDialog(review)
                                          }
                                        >
                                          <span className="flex items-center">
                                            {review.replied
                                              ? "返信を編集"
                                              : "返信する"}{" "}
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                          </span>
                                        </Button>
                                      </div>
                                    )}
                                  </motion.div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    }
                  )}
                </AnimatePresence>

                {filteredReviews.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
                      <h3 className="text-lg font-medium mb-1">
                        {searchTerm ||
                        filterRating !== "all" ||
                        selectedStore !== "all"
                          ? "レビューが見つかりません"
                          : "レビューデータがありません"}
                      </h3>
                      <p className="text-muted-foreground">
                        {searchTerm ||
                        filterRating !== "all" ||
                        selectedStore !== "all"
                          ? "検索条件を変更してください。"
                          : "Google Business Profile APIからレビューデータを取得できませんでした。"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t py-3 px-4 md:py-4 md:px-6 text-center text-sm text-muted-foreground">
          © 2025 Leadcreation Co., Ltd.
        </footer>
      </div>

      {/* 返信ダイアログ */}
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedReview?.replied ? "返信を編集" : "レビューに返信"}
            </DialogTitle>
            <DialogDescription>
              お客様のレビューに対する返信を作成してください。
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              {/* レビュー表示 */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < selectedReview.rating
                            ? "text-amber-500 fill-amber-500"
                            : "text-muted"
                        )}
                      />
                    ))}
                  </div>
                  <span className="font-medium">
                    {selectedReview.reviewer.displayName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedReview.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm">{selectedReview.comment}</p>
              </div>

              {/* AI返信生成ボタン */}
              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateAiReply}
                  disabled={isGeneratingAiReply}
                  className="flex items-center gap-2"
                >
                  <Bot className="h-4 w-4" />
                  {isGeneratingAiReply ? "AI返信生成中..." : "AI返信を生成"}
                </Button>
              </div>

              {/* 返信テキストエリア */}
              <div className="space-y-2">
                <label className="text-sm font-medium">返信内容</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="お客様への返信を入力してください..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* アクションボタン */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeReplyDialog}
                  disabled={isReplying}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  onClick={submitReply}
                  disabled={isReplying || !replyText.trim()}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isReplying ? "送信中..." : "返信を送信"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
