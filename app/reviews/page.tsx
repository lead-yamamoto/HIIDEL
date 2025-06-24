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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import {
  SkeletonCard,
  SkeletonText,
  SkeletonWithShine,
} from "@/components/ui/skeleton";

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

  // selectedStoreが変更された時にレビューを再取得
  useEffect(() => {
    if (isGoogleConnected) {
      fetchReviews();
    }
  }, [selectedStore, isGoogleConnected]);

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
      console.log("📡 Stores checked:", data.storesChecked);
      console.log("📡 Is real data:", data.isRealData);
      if (data.reviews && data.reviews.length > 0) {
        console.log("📡 First review:", data.reviews[0]);
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
    const uniqueStores = Array.from(
      new Map(
        reviews.map((r) => [r.storeId, { id: r.storeId, name: r.storeName }])
      ).values()
    );
    return uniqueStores;
  }, [reviews]);

  // フィルタリングされたレビュー
  const filteredReviews = useMemo(() => {
    let filtered = reviews;

    // 店舗フィルター
    if (selectedStore !== "all") {
      filtered = filtered.filter((review) => review.storeId === selectedStore);
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
    if (!selectedReview) {
      console.error("❌ [UI] No selected review");
      return;
    }

    console.log("🔍 [UI] Selected review data:", {
      id: selectedReview.id,
      storeId: selectedReview.storeId,
      storeName: selectedReview.storeName,
      comment: selectedReview.comment,
      rating: selectedReview.rating,
      hasComment: !!selectedReview.comment,
      hasStoreName: !!selectedReview.storeName,
      commentLength: selectedReview.comment?.length || 0,
      storeNameLength: selectedReview.storeName?.length || 0,
    });

    setIsGeneratingAiReply(true);

    // AI設定を取得
    let aiSettings = null;
    try {
      const settingsResponse = await fetch(
        `/api/ai-settings?storeId=${selectedReview.storeId}`
      );
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.success) {
          aiSettings = settingsData.settings;
        }
      }
    } catch (error) {
      console.warn(
        "⚠️ [UI] Failed to load AI settings, using defaults:",
        error
      );
    }

    // カスタムプロンプトを選択
    let customPrompt = null;
    let useCustomPrompt = false;

    if (aiSettings?.customPromptEnabled) {
      useCustomPrompt = true;
      const hasComment = !!selectedReview.comment?.trim();
      const rating = selectedReview.rating || 5;
      const isPositive = rating >= 4;
      const isNeutral = rating === 3;

      if (!hasComment) {
        customPrompt = aiSettings.noCommentReviewPrompt;
      } else if (isPositive) {
        customPrompt = aiSettings.positiveReviewPrompt;
      } else if (isNeutral) {
        customPrompt = aiSettings.neutralReviewPrompt;
      } else {
        customPrompt = aiSettings.negativeReviewPrompt;
      }
    }

    const requestData = {
      reviewText: selectedReview.comment || "",
      rating: selectedReview.rating || 5,
      businessName:
        selectedReview.storeName || selectedReview.storeId || "店舗",
      businessType: "店舗",
      customPrompt: customPrompt,
      useCustomPrompt: useCustomPrompt,
    };

    console.log("🤖 [UI] Generating AI reply for review:", {
      reviewId: selectedReview.id,
      rating: selectedReview.rating,
      comment: selectedReview.comment?.substring(0, 50) + "...",
      storeName: selectedReview.storeName,
    });

    console.log("📤 [UI] Sending request data:", requestData);

    try {
      const response = await fetch("/api/ai/review-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ [UI] AI reply generated successfully:", {
          success: data.success,
          replyLength: data.reply?.length,
          provider: data.metadata?.provider,
          model: data.metadata?.model,
        });
        setReplyText(data.reply);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ [UI] AI reply generation failed:", {
          status: response.status,
          error: errorData.error,
          details: errorData.details,
        });

        // エラー時はテスト返信を生成
        const testReply = `${selectedReview.reviewer.displayName}様、この度は貴重なご意見をありがとうございます。お客様のフィードバックを真摯に受け止め、より良いサービスの提供に努めてまいります。またのご利用をお待ちしております。`;
        setReplyText(testReply);

        // ユーザーに通知
        alert(
          `AI返信の生成に失敗しました。テスト返信を使用します。\nエラー: ${
            errorData.error || "不明なエラー"
          }`
        );
      }
    } catch (error) {
      console.error("💥 [UI] AI reply generation error:", error);
      // エラー時はテスト返信を生成
      const testReply = `${selectedReview.reviewer.displayName}様、この度は貴重なご意見をありがとうございます。お客様のフィードバックを真摯に受け止め、より良いサービスの提供に努めてまいります。またのご利用をお待ちしております。`;
      setReplyText(testReply);

      // ユーザーに通知
      alert(
        `AI返信の生成中にエラーが発生しました。テスト返信を使用します。\nエラー: ${
          error instanceof Error ? error.message : "不明なエラー"
        }`
      );
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
                  : `店舗別クチコミ一覧 (${
                      reviews.find((r) => r.storeId === selectedStore)
                        ?.storeName || selectedStore
                    })`}
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
                        {Array.from(new Set(reviews.map((r) => r.storeId))).map(
                          (storeId) => {
                            const storeName =
                              reviews.find((r) => r.storeId === storeId)
                                ?.storeName || storeId;
                            return (
                              <SelectItem key={storeId} value={storeId}>
                                {storeName}
                              </SelectItem>
                            );
                          }
                        )}
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden shadow-lg">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <SkeletonWithShine className="h-5 w-5 rounded" />
                      <SkeletonText
                        lines={1}
                        lineHeight="md"
                        className="w-48"
                      />
                    </div>
                    <SkeletonText
                      lines={1}
                      lineHeight="sm"
                      className="w-64 mt-2"
                    />
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {/* 3つの店舗スケルトン */}
                      {[1, 2, 3].map((index) => (
                        <div key={index} className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <SkeletonWithShine className="h-10 w-10 rounded-lg" />
                              <div>
                                <SkeletonText
                                  lines={1}
                                  lineHeight="md"
                                  className="w-32 mb-2"
                                />
                                <div className="flex items-center gap-3">
                                  <SkeletonText
                                    lines={1}
                                    lineHeight="sm"
                                    className="w-20"
                                  />
                                  <SkeletonText
                                    lines={1}
                                    lineHeight="sm"
                                    className="w-16"
                                  />
                                </div>
                              </div>
                            </div>
                            <SkeletonWithShine className="h-6 w-20 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* レビュー一覧（店舗ごとにアコーディオン） */}
            {isGoogleConnected && !isLoading && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="overflow-hidden shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      全店舗のクチコミ一覧
                    </CardTitle>
                    <CardDescription>
                      店舗ごとにクチコミを確認・返信できます
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Accordion type="multiple" className="w-full">
                      {Object.entries(groupedReviews).map(
                        ([storeName, storeReviews], storeIndex) => {
                          const stats = getStoreStats(storeReviews);

                          return (
                            <AccordionItem
                              key={storeName}
                              value={storeName}
                              className="border-b last:border-b-0"
                            >
                              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors">
                                <div className="flex items-center justify-between w-full mr-4">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                      <Store className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="text-left">
                                      <h3 className="font-semibold text-base">
                                        {storeName}
                                      </h3>
                                      <div className="flex items-center gap-3 mt-1">
                                        <span className="text-sm text-muted-foreground">
                                          {stats.totalReviews}件のレビュー
                                        </span>
                                        {stats.totalReviews > 0 && (
                                          <>
                                            <span className="text-sm text-muted-foreground">
                                              •
                                            </span>
                                            <div className="flex items-center gap-1">
                                              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                              <span className="text-sm text-muted-foreground">
                                                {stats.avgRating.toFixed(1)}
                                              </span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {stats.unrepliedCount > 0 && (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs"
                                      >
                                        未返信 {stats.unrepliedCount}件
                                      </Badge>
                                    )}
                                    {stats.hasSystemMessages && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs border-amber-500 text-amber-700"
                                      >
                                        システム通知
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-6 pb-4">
                                <div className="space-y-3">
                                  {storeReviews.map((review, reviewIndex) => (
                                    <motion.div
                                      key={review.id || reviewIndex}
                                      className={cn(
                                        "p-4 rounded-lg border transition-all duration-200",
                                        review.isSystemMessage
                                          ? "bg-amber-50/50 border-amber-200"
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
                                                  {Array.from({
                                                    length: 5,
                                                  }).map((_, i) => (
                                                    <Star
                                                      key={i}
                                                      className={cn(
                                                        "h-3 w-3",
                                                        i < (review.rating || 0)
                                                          ? "text-amber-500 fill-amber-500"
                                                          : "text-muted"
                                                      )}
                                                    />
                                                  ))}
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
                                              className="text-xs border-amber-500 text-amber-700"
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
                                            "text-amber-800"
                                        )}
                                      >
                                        {review.comment || "(本文なし)"}
                                      </p>

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
                              </AccordionContent>
                            </AccordionItem>
                          );
                        }
                      )}
                    </Accordion>
                  </CardContent>
                </Card>

                {filteredReviews.length === 0 && (
                  <Card className="mt-6">
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
              </motion.div>
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
