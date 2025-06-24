"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronRight,
  FileText,
  MessageSquare,
  Star,
  Users,
  Loader2,
  TestTube,
  Calendar,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { cn } from "@/lib/utils";
import { LoadingState, InlineLoading } from "@/components/ui/loading";
import { DashboardSkeleton } from "@/components/ui/skeleton";

interface Analytics {
  totalStores: number;
  totalReviews: number;
  averageRating: number;
  unansweredReviews: number;
  responseRate: number;
  totalQRScans: number;
  totalSurveyResponses: number;
  todayReviews: number;
  todayScans: number;
  hasRealData: boolean;
}

interface UnrepliedReview {
  id: string;
  storeName: string;
  reviewer: {
    displayName: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

interface ImprovementFeedback {
  id: string;
  surveyTitle: string;
  improvementText: string;
  averageRating: number;
  submittedAt: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isInitializingTestData, setIsInitializingTestData] = useState(false);
  const [unrepliedReviews, setUnrepliedReviews] = useState<UnrepliedReview[]>(
    []
  );
  const [improvementFeedbacks, setImprovementFeedbacks] = useState<
    ImprovementFeedback[]
  >([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 認証状態を確認
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      initializeData();
    }
  }, [status, router]);

  const initializeData = async () => {
    try {
      console.log("🚀 Initializing dashboard data...");
      await Promise.all([
        checkGoogleConnection(),
        fetchAnalytics(),
        fetchUnrepliedReviews(),
        fetchImprovementFeedbacks(),
      ]);
    } catch (error) {
      console.error("❌ Failed to initialize data:", error);
    }
  };

  const checkGoogleConnection = async () => {
    try {
      console.log("🔍 Checking Google connection status...");
      const response = await fetch("/api/google/auth-status");
      const data = await response.json();

      console.log("📡 Google connection status:", data);
      setIsGoogleConnected(data.isAuthenticated || false);
    } catch (error) {
      console.error("❌ Failed to check Google connection:", error);
      setIsGoogleConnected(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      console.log("📊 Fetching analytics data for home dashboard...");

      const response = await fetch("/api/analytics");

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Analytics data loaded for home:", data);

        // 分析APIから取得したデータをそのまま使用
        setAnalytics({
          totalStores: data.totalStores || 0,
          totalReviews: data.totalReviews || 0,
          averageRating: data.averageRating || 0,
          unansweredReviews: data.unansweredReviews || 0,
          responseRate: data.responseRate || 0,
          totalQRScans: data.totalQRScans || 0,
          totalSurveyResponses: data.totalSurveyResponses || 0,
          todayReviews: data.todayReviews || 0,
          todayScans: data.todayScans || 0,
          hasRealData: data.hasRealData || false,
        });
      } else {
        console.error("❌ Failed to fetch analytics, status:", response.status);
        const errorText = await response.text();
        console.error("❌ Error response:", errorText);

        // エラー時は基本的な店舗データを取得
        try {
          console.log("🔄 Fetching basic store data as fallback...");
          const storesResponse = await fetch("/api/stores");
          if (storesResponse.ok) {
            const storesData = await storesResponse.json();
            console.log("✅ Basic store data loaded:", storesData);
            setAnalytics({
              totalStores: storesData.stores?.length || 0,
              totalReviews: 0,
              averageRating: 0,
              unansweredReviews: 0,
              responseRate: 0,
              totalQRScans: 0,
              totalSurveyResponses: 0,
              todayReviews: 0,
              todayScans: 0,
              hasRealData: false,
            });
          } else {
            throw new Error("Store data also unavailable");
          }
        } catch (storeError) {
          console.error("❌ Also failed to fetch store data:", storeError);
          setAnalytics({
            totalStores: 0,
            totalReviews: 0,
            averageRating: 0,
            unansweredReviews: 0,
            responseRate: 0,
            totalQRScans: 0,
            totalSurveyResponses: 0,
            todayReviews: 0,
            todayScans: 0,
            hasRealData: false,
          });
        }
      }
    } catch (error) {
      console.error("💥 Failed to fetch analytics:", error);

      // ネットワークエラー等の場合も基本的な店舗データを試行
      try {
        console.log(
          "🔄 Trying to fetch basic store data after network error..."
        );
        const storesResponse = await fetch("/api/stores");
        if (storesResponse.ok) {
          const storesData = await storesResponse.json();
          console.log("✅ Basic store data loaded after error:", storesData);
          setAnalytics({
            totalStores: storesData.stores?.length || 0,
            totalReviews: 0,
            averageRating: 0,
            unansweredReviews: 0,
            responseRate: 0,
            totalQRScans: 0,
            totalSurveyResponses: 0,
            todayReviews: 0,
            todayScans: 0,
            hasRealData: false,
          });
        } else {
          throw new Error("Store data also unavailable after network error");
        }
      } catch (finalError) {
        console.error("❌ Final fallback also failed:", finalError);
        setAnalytics({
          totalStores: 0,
          totalReviews: 0,
          averageRating: 0,
          unansweredReviews: 0,
          responseRate: 0,
          totalQRScans: 0,
          totalSurveyResponses: 0,
          todayReviews: 0,
          todayScans: 0,
          hasRealData: false,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnrepliedReviews = async () => {
    try {
      setIsLoadingReviews(true);
      console.log("📝 Fetching unreplied reviews...");

      const response = await fetch("/api/reviews?unreplied=true&limit=5");
      if (response.ok) {
        const data = await response.json();
        setUnrepliedReviews(data.reviews || []);
        console.log("✅ Unreplied reviews loaded:", data.reviews?.length || 0);
      } else {
        console.error("❌ Failed to fetch unreplied reviews");
        setUnrepliedReviews([]);
      }
    } catch (error) {
      console.error("💥 Error fetching unreplied reviews:", error);
      setUnrepliedReviews([]);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const fetchImprovementFeedbacks = async () => {
    try {
      setIsLoadingFeedbacks(true);
      console.log("💡 Fetching improvement feedbacks...");

      const response = await fetch(
        "/api/surveys/improvement-feedbacks?limit=5"
      );
      if (response.ok) {
        const data = await response.json();
        setImprovementFeedbacks(data.feedbacks || []);
        console.log(
          "✅ Improvement feedbacks loaded:",
          data.feedbacks?.length || 0
        );
      } else {
        console.error("❌ Failed to fetch improvement feedbacks");
        setImprovementFeedbacks([]);
      }
    } catch (error) {
      console.error("💥 Error fetching improvement feedbacks:", error);
      setImprovementFeedbacks([]);
    } finally {
      setIsLoadingFeedbacks(false);
    }
  };

  const initializeTestData = async () => {
    try {
      setIsInitializingTestData(true);
      console.log("🧪 Initializing test data...");

      const response = await fetch("/api/test-data/init", {
        method: "POST",
      });

      if (response.ok) {
        console.log("✅ Test data initialized successfully");
        // データを再取得
        await fetchAnalytics();
      } else {
        console.error("❌ Failed to initialize test data");
      }
    } catch (error) {
      console.error("💥 Error initializing test data:", error);
    } finally {
      setIsInitializingTestData(false);
    }
  };

  if (!mounted || status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <DashboardSkeleton />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // リダイレクト中
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <div className="hidden md:block w-64">
          <Sidebar currentPath="/" />
        </div>
        <div className="flex-1 flex flex-col">
          <MobileHeader
            title="ダッシュボード"
            currentPath="/"
            searchPlaceholder="クイック検索"
            showBackButton={false}
          />
          <div className="flex-1 flex items-center justify-center">
            <DashboardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar currentPath="/" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader
          title="ダッシュボード"
          currentPath="/"
          searchPlaceholder="クイック検索"
          showBackButton={false}
        />

        {/* Main area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Message */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">
                👋{session?.user?.name || "ユーザー"}さん、こんにちは！
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {session?.user?.companyName || "会社名"}
                のレビューを確認しましょう。
              </p>
            </motion.div>

            {/* データ状況とテストデータ初期化 */}
            {analytics && analytics.totalStores === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mb-6"
              >
                <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <TestTube className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                          データがありません
                        </h3>
                        <p className="text-orange-700 dark:text-orange-300 mb-4">
                          テストデータを初期化して、システムの動作を確認できます。
                        </p>
                        <Button
                          onClick={initializeTestData}
                          disabled={isInitializingTestData}
                          className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white"
                        >
                          {isInitializingTestData ? (
                            <InlineLoading text="初期化中..." />
                          ) : (
                            <>
                              <TestTube className="mr-2 h-4 w-4" />
                              テストデータを初期化
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Google Business Profile Setup Alert */}
            {!isGoogleConnected && analytics && analytics.totalStores > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mb-6"
              >
                <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                          Google Business Profile を連携しましょう
                        </h3>
                        <p className="text-blue-700 dark:text-blue-300 mb-4">
                          Google Business Profile
                          を連携すると、実際の店舗データを管理できます。
                        </p>
                        <Link href="/google-business">
                          <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
                            連携を開始
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Statistics Cards */}
            {analytics && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
              >
                <StatCard
                  title="総店舗数"
                  value={analytics.totalStores.toString()}
                  icon={<Users className="h-5 w-5" />}
                  trend={analytics.hasRealData ? "実データ" : "テストデータ"}
                  trendUp={analytics.hasRealData}
                  color="blue"
                />
                <StatCard
                  title="平均評価"
                  value={analytics.averageRating.toFixed(1)}
                  icon={<Star className="h-5 w-5" />}
                  trend={`${analytics.totalReviews}件のレビュー`}
                  trendUp={analytics.averageRating >= 4.0}
                  color="yellow"
                />
                <StatCard
                  title="未返信レビュー"
                  value={analytics.unansweredReviews.toString()}
                  icon={<MessageSquare className="h-5 w-5" />}
                  trend={`返信率${analytics.responseRate}%`}
                  trendUp={analytics.responseRate >= 80}
                  color="red"
                />
                <StatCard
                  title="QRスキャン数"
                  value={analytics.totalQRScans.toString()}
                  icon={<FileText className="h-5 w-5" />}
                  trend={`今日${analytics.todayScans}回`}
                  trendUp={analytics.todayScans > 0}
                  color="green"
                />
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
              className="mb-8"
            >
              <h2 className="text-xl font-bold dark:text-gray-100 mb-4">
                クイックアクション
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <QuickActionCard
                  title="店舗を追加"
                  description="新しい店舗を登録して管理を開始"
                  href="/stores"
                  color="bg-blue-500"
                />
                <QuickActionCard
                  title="QRコード生成"
                  description="レビュー収集用のQRコードを作成"
                  href="/qr-codes"
                  color="bg-green-500"
                />
                <QuickActionCard
                  title="アンケート作成"
                  description="顧客満足度調査を設定"
                  href="/survey-builder"
                  color="bg-purple-500"
                />
              </div>
            </motion.div>

            {/* Recent Activity Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.8 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Unreplied Reviews */}
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-red-500" />
                      未返信レビュー
                    </h3>
                    <Link href="/reviews">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        すべて見る
                        <ExternalLink className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  {isLoadingReviews ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : unrepliedReviews.length > 0 ? (
                    <div className="space-y-3">
                      {unrepliedReviews.map((review, index) => (
                        <div
                          key={review.id}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                {review.reviewer.displayName}
                              </span>
                              <div className="flex items-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < review.rating
                                        ? "text-amber-500 fill-amber-500"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(review.createdAt).toLocaleDateString(
                                "ja-JP"
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                            {review.comment}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {review.storeName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">
                        未返信のレビューはありません
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Improvement Feedbacks */}
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      お客様から寄せられた改善点
                    </h3>
                    <Link href="/surveys">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        すべて見る
                        <ExternalLink className="ml-1 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  {isLoadingFeedbacks ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : improvementFeedbacks.length > 0 ? (
                    <div className="space-y-3">
                      {improvementFeedbacks.map((feedback, index) => (
                        <div
                          key={feedback.id}
                          className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-400"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center">
                                {Array.from({ length: 3 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < feedback.averageRating
                                        ? "text-amber-500 fill-amber-500"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                平均 {feedback.averageRating.toFixed(1)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(
                                feedback.submittedAt
                              ).toLocaleDateString("ja-JP")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                            {feedback.improvementText}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {feedback.surveyTitle}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">
                        改善点のフィードバックはありません
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendUp?: boolean;
  color: string;
}

function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp = true,
  color,
}: StatCardProps) {
  return (
    <Card className="relative overflow-hidden bg-white dark:bg-gray-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {value}
            </p>
            <div className="flex items-center">
              <span
                className={cn(
                  "text-xs font-medium",
                  trendUp
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {trend}
              </span>
            </div>
          </div>
          <div className={cn("p-3 rounded-full bg-gradient-to-r", color)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  color: string;
}

function QuickActionCard({
  title,
  description,
  href,
  color,
}: QuickActionCardProps) {
  return (
    <Card className="hover:shadow-md dark:hover:shadow-lg transition-shadow cursor-pointer bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <Link href={href}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            </div>
            <div className={cn("p-2 rounded-full", color)}>
              <ChevronRight className="text-white" size={20} />
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
