"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Download,
  LineChart,
  PieChart,
  Loader2,
  TrendingUp,
  TrendingDown,
  Star,
  MessageSquare,
  QrCode,
  ClipboardList,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { LoadingState } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  Area,
  AreaChart,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

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

interface Store {
  id: string;
  displayName: string;
  isTestStore: boolean;
}

interface Review {
  id: string;
  storeId: string;
  rating: number;
  text: string;
  authorName: string;
  isTestData: boolean;
  createdAt: string;
  replied: boolean;
}

interface QRCode {
  id: string;
  storeId: string;
  name: string;
  type: string;
  scans: number;
  createdAt: string;
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  responses: any;
  averageRating: number;
  createdAt: string;
}

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
  const [surveyResponses, setSurveyResponses] = useState<SurveyResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedStore, setSelectedStore] = useState<string>("all");

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted, selectedPeriod]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log("📊 Fetching analytics data...");

      const [analyticsResponse, storesResponse, reviewsResponse, qrResponse] =
        await Promise.all([
          fetch("/api/analytics"),
          fetch("/api/stores"),
          fetch("/api/reviews"),
          fetch("/api/qr-codes"),
        ]);

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      }

      if (storesResponse.ok) {
        const storesData = await storesResponse.json();
        setStores(storesData.stores || []);
      }

      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData.reviews || []);
      }

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        setQRCodes(qrData.qrCodes || []);
      }

      // アンケート回答データを取得
      try {
        const surveyResponsesResponse = await fetch("/api/surveys");
        if (surveyResponsesResponse.ok) {
          const surveyData = await surveyResponsesResponse.json();
          // アンケート回答データを平坦化
          const allResponses: SurveyResponse[] = [];
          if (surveyData.surveys) {
            for (const survey of surveyData.surveys) {
              if (survey.responses) {
                allResponses.push(...survey.responses);
              }
            }
          }
          setSurveyResponses(allResponses);
        }
      } catch (error) {
        console.warn("Survey responses not available:", error);
        setSurveyResponses([]);
      }

      console.log("✅ Analytics data fetched successfully");
    } catch (error) {
      console.error("❌ Error fetching analytics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 時系列データの生成
  const generateTimeSeriesData = () => {
    const days = parseInt(selectedPeriod);
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // 店舗フィルタリング
    const filteredReviews =
      selectedStore === "all"
        ? reviews
        : reviews.filter((r) => r.storeId === selectedStore);

    const filteredQRCodes =
      selectedStore === "all"
        ? qrCodes
        : qrCodes.filter((q) => q.storeId === selectedStore);

    const filteredSurveyResponses =
      selectedStore === "all"
        ? surveyResponses
        : surveyResponses.filter((s) => s.surveyId?.includes(selectedStore));

    const timeSeriesData = [];

    for (let i = 0; i < days; i++) {
      const currentDate = subDays(endDate, days - 1 - i);
      const dateStr = format(currentDate, "yyyy-MM-dd");

      // その日のレビュー
      const dayReviews = filteredReviews.filter(
        (review) => format(parseISO(review.createdAt), "yyyy-MM-dd") === dateStr
      );

      // その日のQRスキャン（実際のデータに基づく）
      const dayQRCodes = filteredQRCodes.filter(
        (qr) => format(parseISO(qr.createdAt), "yyyy-MM-dd") === dateStr
      );
      const dayScans = dayQRCodes.reduce((sum, qr) => sum + qr.scans, 0);

      // その日のアンケート回答
      const daySurveyResponses = filteredSurveyResponses.filter(
        (response) =>
          format(parseISO(response.createdAt), "yyyy-MM-dd") === dateStr
      );

      const avgRating =
        dayReviews.length > 0
          ? dayReviews.reduce((sum, r) => sum + r.rating, 0) / dayReviews.length
          : 0;

      timeSeriesData.push({
        date: format(currentDate, "M/d", { locale: ja }),
        fullDate: dateStr,
        reviews: dayReviews.length,
        avgRating: Math.round(avgRating * 10) / 10,
        qrScans: dayScans,
        surveyResponses: daySurveyResponses.length,
      });
    }

    return timeSeriesData;
  };

  // 評価分布データ
  const getRatingDistribution = () => {
    const filteredReviews =
      selectedStore === "all"
        ? reviews
        : reviews.filter((r) => r.storeId === selectedStore);

    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating: `${rating}★`,
      count: filteredReviews.filter((r) => r.rating === rating).length,
      percentage:
        filteredReviews.length > 0
          ? Math.round(
              (filteredReviews.filter((r) => r.rating === rating).length /
                filteredReviews.length) *
                100
            )
          : 0,
    }));

    return distribution;
  };

  // 店舗別統計
  const getStoreStats = () => {
    return stores.map((store) => {
      const storeReviews = reviews.filter((r) => r.storeId === store.id);
      const storeQRCodes = qrCodes.filter((q) => q.storeId === store.id);
      const storeSurveyResponses = surveyResponses.filter((s) =>
        s.surveyId?.includes(store.id)
      );

      const totalScans = storeQRCodes.reduce((sum, qr) => sum + qr.scans, 0);
      const averageRating =
        storeReviews.length > 0
          ? storeReviews.reduce((sum, r) => sum + r.rating, 0) /
            storeReviews.length
          : 0;

      return {
        store,
        reviewCount: storeReviews.length,
        averageRating: Math.round(averageRating * 10) / 10,
        qrScans: totalScans,
        surveyResponses: storeSurveyResponses.length,
        responseRate:
          storeReviews.length > 0
            ? Math.round(
                (storeReviews.filter((r) => r.replied).length /
                  storeReviews.length) *
                  100
              )
            : 0,
      };
    });
  };

  const exportData = () => {
    console.log("📤 Exporting analytics data...");
    const csvData = [
      ["日付", "レビュー数", "平均評価", "QRスキャン数", "アンケート回答数"],
      ...generateTimeSeriesData().map((row) => [
        row.fullDate,
        row.reviews,
        row.avgRating,
        row.qrScans,
        row.surveyResponses,
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <div className="hidden md:block w-64">
          <Sidebar currentPath="/analytics" />
        </div>
        <div className="flex-1 flex flex-col">
          <MobileHeader
            title="分析ダッシュボード"
            currentPath="/analytics"
            searchPlaceholder="データを検索..."
            backUrl="/"
          />
          <div className="flex-1 flex items-center justify-center">
            <LoadingState message="分析データを読み込み中..." />
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <div className="hidden md:block w-64">
          <Sidebar currentPath="/analytics" />
        </div>
        <div className="flex-1 flex flex-col">
          <MobileHeader
            title="分析ダッシュボード"
            currentPath="/analytics"
            searchPlaceholder="データを検索..."
            backUrl="/"
          />
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-600">データを読み込めませんでした。</p>
          </div>
        </div>
      </div>
    );
  }

  const timeSeriesData = generateTimeSeriesData();
  const ratingDistribution = getRatingDistribution();
  const storeStats = getStoreStats();

  // 店舗フィルタリングされた統計
  const getFilteredAnalytics = () => {
    const filteredReviews =
      selectedStore === "all"
        ? reviews
        : reviews.filter((r) => r.storeId === selectedStore);

    const filteredQRCodes =
      selectedStore === "all"
        ? qrCodes
        : qrCodes.filter((q) => q.storeId === selectedStore);

    const filteredSurveyResponses =
      selectedStore === "all"
        ? surveyResponses
        : surveyResponses.filter((s) => s.surveyId?.includes(selectedStore));

    const totalReviews = filteredReviews.length;
    const averageRating =
      totalReviews > 0
        ? filteredReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

    const unansweredReviews = filteredReviews.filter((r) => !r.replied).length;
    const responseRate =
      totalReviews > 0
        ? Math.round(((totalReviews - unansweredReviews) / totalReviews) * 100)
        : 0;

    const totalQRScans = filteredQRCodes.reduce((sum, qr) => sum + qr.scans, 0);
    const totalSurveyResponses = filteredSurveyResponses.length;

    const today = format(new Date(), "yyyy-MM-dd");
    const todayReviews = filteredReviews.filter(
      (r) => format(parseISO(r.createdAt), "yyyy-MM-dd") === today
    ).length;

    const todayScans = Math.floor(totalQRScans / 30); // 簡易計算

    return {
      ...analytics,
      totalReviews,
      averageRating,
      unansweredReviews,
      responseRate,
      totalQRScans,
      totalSurveyResponses,
      todayReviews,
      todayScans,
    };
  };

  const filteredAnalytics = getFilteredAnalytics();

  // Chart configurations
  const timeSeriesChartConfig = {
    reviews: {
      label: "レビュー数",
      color: "hsl(var(--chart-1))",
    },
    surveyResponses: {
      label: "アンケート回答",
      color: "hsl(var(--chart-2))",
    },
    qrScans: {
      label: "QRスキャン",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig;

  const ratingChartConfig = {
    count: {
      label: "件数",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  const avgRatingChartConfig = {
    avgRating: {
      label: "平均評価",
      color: "hsl(var(--chart-5))",
    },
  } satisfies ChartConfig;

  const CHART_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar currentPath="/analytics" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader
          title="分析ダッシュボード"
          currentPath="/analytics"
          searchPlaceholder="データを検索..."
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
                分析ダッシュボード
                {analytics.hasRealData ? "" : " (テストデータ)"}
              </motion.h1>
              <div className="flex items-center gap-2">
                <Select value={selectedStore} onValueChange={setSelectedStore}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="店舗を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべての店舗</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="期間を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">過去7日間</SelectItem>
                    <SelectItem value="30">過去30日間</SelectItem>
                    <SelectItem value="90">過去90日間</SelectItem>
                    <SelectItem value="365">過去1年間</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportData}>
                  <Download size={16} className="mr-2" /> エクスポート
                </Button>
              </div>
            </div>

            <Tabs defaultValue="overview" className="w-full mb-6">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">概要</TabsTrigger>
                <TabsTrigger value="reviews">レビュー分析</TabsTrigger>
                <TabsTrigger value="surveys">アンケート分析</TabsTrigger>
                <TabsTrigger value="qr-codes">QRコード分析</TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          総レビュー数
                        </CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {filteredAnalytics.totalReviews}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          今日{" "}
                          <span className="text-blue-500">
                            +{filteredAnalytics.todayReviews}
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          平均評価
                        </CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                          {filteredAnalytics.averageRating.toFixed(1)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          返信率{" "}
                          <span
                            className={
                              filteredAnalytics.responseRate >= 80
                                ? "text-green-500"
                                : "text-orange-500"
                            }
                          >
                            {filteredAnalytics.responseRate}%
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          アンケート回答数
                        </CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {filteredAnalytics.totalSurveyResponses}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          未返信{" "}
                          <span className="text-red-500">
                            {filteredAnalytics.unansweredReviews}
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          QRスキャン数
                        </CardTitle>
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          {filteredAnalytics.totalQRScans}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          今日{" "}
                          <span className="text-purple-500">
                            +{filteredAnalytics.todayScans}
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* 推移チャート */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>データ推移</CardTitle>
                        <CardDescription>
                          過去{selectedPeriod}日間の推移
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={timeSeriesChartConfig}
                          className="h-[300px]"
                        >
                          <RechartsLineChart
                            accessibilityLayer
                            data={timeSeriesData}
                            margin={{
                              left: 12,
                              right: 12,
                            }}
                          >
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              tickFormatter={(value) =>
                                Math.round(value).toString()
                              }
                            />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent />}
                            />
                            <Line
                              dataKey="reviews"
                              type="monotone"
                              stroke="var(--color-reviews)"
                              strokeWidth={2}
                              dot={{
                                fill: "var(--color-reviews)",
                              }}
                              activeDot={{
                                r: 6,
                              }}
                            />
                            <Line
                              dataKey="surveyResponses"
                              type="monotone"
                              stroke="var(--color-surveyResponses)"
                              strokeWidth={2}
                              dot={{
                                fill: "var(--color-surveyResponses)",
                              }}
                              activeDot={{
                                r: 6,
                              }}
                            />
                            <Line
                              dataKey="qrScans"
                              type="monotone"
                              stroke="var(--color-qrScans)"
                              strokeWidth={2}
                              dot={{
                                fill: "var(--color-qrScans)",
                              }}
                              activeDot={{
                                r: 6,
                              }}
                            />
                          </RechartsLineChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* 評価分布 */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>評価分布</CardTitle>
                        <CardDescription>レビューの星評価分布</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer
                          config={ratingChartConfig}
                          className="h-[300px]"
                        >
                          <RechartsBarChart
                            accessibilityLayer
                            data={ratingDistribution}
                            margin={{
                              left: 12,
                              right: 12,
                            }}
                          >
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="rating"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                            />
                            <YAxis
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              tickFormatter={(value) =>
                                Math.round(value).toString()
                              }
                            />
                            <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent />}
                            />
                            <Bar
                              dataKey="count"
                              fill="var(--color-count)"
                              radius={8}
                            />
                          </RechartsBarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* 店舗別統計 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>店舗別統計</CardTitle>
                      <CardDescription>
                        各店舗のパフォーマンス比較
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-3">店舗名</th>
                              <th className="text-center p-3">レビュー数</th>
                              <th className="text-center p-3">平均評価</th>
                              <th className="text-center p-3">QRスキャン</th>
                              <th className="text-center p-3">アンケート</th>
                              <th className="text-center p-3">返信率</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storeStats.map((stat, index) => (
                              <tr
                                key={stat.store.id}
                                className="border-b hover:bg-muted/50"
                              >
                                <td className="p-3 font-medium">
                                  {stat.store.displayName}
                                </td>
                                <td className="p-3 text-center">
                                  {stat.reviewCount}
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                    {stat.averageRating}
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  {stat.qrScans}
                                </td>
                                <td className="p-3 text-center">
                                  {stat.surveyResponses}
                                </td>
                                <td className="p-3 text-center">
                                  <span
                                    className={`font-medium ${
                                      stat.responseRate >= 80
                                        ? "text-green-600"
                                        : "text-orange-600"
                                    }`}
                                  >
                                    {stat.responseRate}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="reviews">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 平均評価推移 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>平均評価の推移</CardTitle>
                      <CardDescription>日別の平均評価変化</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={avgRatingChartConfig}
                        className="h-[300px]"
                      >
                        <AreaChart
                          accessibilityLayer
                          data={timeSeriesData}
                          margin={{
                            left: 12,
                            right: 12,
                          }}
                        >
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                          />
                          <YAxis
                            domain={[0, 5]}
                            ticks={[0, 1, 2, 3, 4, 5]}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                          />
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                          />
                          <Area
                            dataKey="avgRating"
                            type="natural"
                            fill="var(--color-avgRating)"
                            fillOpacity={0.4}
                            stroke="var(--color-avgRating)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* 評価分布（円グラフ） */}
                  <Card>
                    <CardHeader>
                      <CardTitle>評価分布（割合）</CardTitle>
                      <CardDescription>各評価の割合</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer
                        config={{
                          "1": {
                            label: "1★",
                            color: "hsl(var(--chart-1))",
                          },
                          "2": {
                            label: "2★",
                            color: "hsl(var(--chart-2))",
                          },
                          "3": {
                            label: "3★",
                            color: "hsl(var(--chart-3))",
                          },
                          "4": {
                            label: "4★",
                            color: "hsl(var(--chart-4))",
                          },
                          "5": {
                            label: "5★",
                            color: "hsl(var(--chart-5))",
                          },
                        }}
                        className="h-[300px]"
                      >
                        <RechartsPieChart>
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                          />
                          <Pie
                            data={ratingDistribution}
                            dataKey="count"
                            nameKey="rating"
                            innerRadius={60}
                            strokeWidth={5}
                            label={({ rating, percentage }) =>
                              percentage > 0 ? `${rating} (${percentage}%)` : ""
                            }
                          >
                            {ratingDistribution.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={`hsl(var(--chart-${index + 1}))`}
                              />
                            ))}
                          </Pie>
                        </RechartsPieChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="surveys">
                <Card>
                  <CardHeader>
                    <CardTitle>アンケート回答数の推移</CardTitle>
                    <CardDescription>日別のアンケート回答数</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        surveyResponses: {
                          label: "アンケート回答数",
                          color: "hsl(var(--chart-2))",
                        },
                      }}
                      className="h-[400px]"
                    >
                      <RechartsBarChart
                        accessibilityLayer
                        data={timeSeriesData}
                        margin={{
                          left: 12,
                          right: 12,
                        }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) =>
                            Math.round(value).toString()
                          }
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Bar
                          dataKey="surveyResponses"
                          fill="var(--color-surveyResponses)"
                          radius={8}
                        />
                      </RechartsBarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="qr-codes">
                <Card>
                  <CardHeader>
                    <CardTitle>QRコードスキャン数の推移</CardTitle>
                    <CardDescription>日別のQRコードスキャン数</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        qrScans: {
                          label: "QRスキャン数",
                          color: "hsl(var(--chart-3))",
                        },
                      }}
                      className="h-[400px]"
                    >
                      <AreaChart
                        accessibilityLayer
                        data={timeSeriesData}
                        margin={{
                          left: 12,
                          right: 12,
                        }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) =>
                            Math.round(value).toString()
                          }
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent />}
                        />
                        <Area
                          dataKey="qrScans"
                          type="natural"
                          fill="var(--color-qrScans)"
                          fillOpacity={0.4}
                          stroke="var(--color-qrScans)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t py-3 px-4 md:py-4 md:px-6 text-center text-sm text-muted-foreground">
          © 2025 Leadcreation Co., Ltd.
        </footer>
      </div>
    </div>
  );
}
