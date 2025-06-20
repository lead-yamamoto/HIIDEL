"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Clock,
  Download,
  Eye,
  Filter,
  MessageSquare,
  Share2,
  TrendingUp,
  Users,
  ExternalLink,
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface SurveyData {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  isActive: boolean;
}

interface Statistics {
  [questionId: string]: {
    question: string;
    type: string;
    totalResponses: number;
    responses: any[];
    optionCounts?: Record<string, number>;
    average?: number;
    distribution?: Record<number, number>;
  };
}

interface ImprovementFeedback {
  id: string;
  improvementText: string;
  averageRating: number;
  submittedAt: string;
}

interface RespondentAnalysis {
  totalResponses: number;
  responsesByDate: Record<string, number>;
  responsesByHour: Record<number, number>;
  averageResponseTime: number;
}

export default function SurveyResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({});
  const [respondentAnalysis, setRespondentAnalysis] =
    useState<RespondentAnalysis>({
      totalResponses: 0,
      responsesByDate: {},
      responsesByHour: {},
      averageResponseTime: 0,
    });
  const [improvementFeedbacks, setImprovementFeedbacks] = useState<
    ImprovementFeedback[]
  >([]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 認証状態確認
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    fetchResults();
  }, [status, router, resolvedParams.id]);

  const fetchResults = async () => {
    try {
      const response = await fetch(
        `/api/surveys/${resolvedParams.id}/responses`
      );
      if (response.ok) {
        const data = await response.json();
        setSurvey(data.survey);
        setResponses(data.responses);
        setStatistics(data.statistics || {});
        setRespondentAnalysis(
          data.respondentAnalysis || {
            totalResponses: 0,
            responsesByDate: {},
            responsesByHour: {},
            averageResponseTime: 0,
          }
        );
        setImprovementFeedbacks(data.improvementFeedbacks || []);
      } else {
        console.error("結果取得に失敗:", response.statusText);
      }
    } catch (error) {
      console.error("結果取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadResults = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `survey_results_${resolvedParams.id}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSV = () => {
    if (!survey || responses.length === 0) return "";

    const headers = ["回答ID", "送信日時", "IPアドレス"];
    Object.keys(statistics).forEach((questionId) => {
      headers.push(statistics[questionId].question);
    });

    const csvRows = [headers.join(",")];

    responses.forEach((response) => {
      const row = [
        response.id,
        new Date(response.submittedAt).toLocaleString("ja-JP"),
        response.ipAddress,
      ];

      Object.keys(statistics).forEach((questionId) => {
        const answer = response.answers[questionId] || "";
        row.push(`"${answer}"`);
      });

      csvRows.push(row.join(","));
    });

    return csvRows.join("\n");
  };

  const getHourLabel = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  if (!mounted) return null;

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">結果を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar currentPath="/surveys" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader
          title="アンケート結果"
          currentPath="/surveys"
          searchPlaceholder="結果を検索..."
          backUrl="/surveys"
        />

        {/* Main area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* ヘッダー部分 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                  <a href="/surveys" className="flex items-center gap-2">
                    <ArrowLeft size={16} />
                    戻る
                  </a>
                </Button>
                <div>
                  <motion.h1
                    className="text-xl md:text-2xl font-bold"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {survey?.title || "アンケート結果"}
                  </motion.h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    {survey?.description}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadResults}>
                  <Download size={16} className="mr-2" />
                  CSVダウンロード
                </Button>
                <Button asChild>
                  <a
                    href={`${window.location.origin}/s/${resolvedParams.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye size={16} className="mr-2" />
                    アンケートを見る
                  </a>
                </Button>
              </div>
            </div>

            {/* 概要統計 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users size={16} />
                    総回答数
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {respondentAnalysis.totalResponses}
                  </div>
                  <p className="text-xs text-muted-foreground">件の回答</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar size={16} />
                    回答期間
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {Object.keys(respondentAnalysis.responsesByDate).length >
                    0 ? (
                      <>
                        <div className="font-semibold">
                          {Math.min(
                            ...Object.keys(
                              respondentAnalysis.responsesByDate
                            ).map((date) => new Date(date).getTime())
                          ) ===
                          Math.max(
                            ...Object.keys(
                              respondentAnalysis.responsesByDate
                            ).map((date) => new Date(date).getTime())
                          )
                            ? new Date(
                                Math.min(
                                  ...Object.keys(
                                    respondentAnalysis.responsesByDate
                                  ).map((date) => new Date(date).getTime())
                                )
                              ).toLocaleDateString("ja-JP")
                            : `${new Date(
                                Math.min(
                                  ...Object.keys(
                                    respondentAnalysis.responsesByDate
                                  ).map((date) => new Date(date).getTime())
                                )
                              ).toLocaleDateString("ja-JP")} 〜 ${new Date(
                                Math.max(
                                  ...Object.keys(
                                    respondentAnalysis.responsesByDate
                                  ).map((date) => new Date(date).getTime())
                                )
                              ).toLocaleDateString("ja-JP")}`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {
                            Object.keys(respondentAnalysis.responsesByDate)
                              .length
                          }
                          日間
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">回答なし</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp size={16} />
                    最多回答日
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {Object.keys(respondentAnalysis.responsesByDate).length >
                    0 ? (
                      <>
                        <div className="font-semibold">
                          {new Date(
                            Object.entries(
                              respondentAnalysis.responsesByDate
                            ).reduce(
                              (max, [date, count]) =>
                                count > respondentAnalysis.responsesByDate[max]
                                  ? date
                                  : max,
                              Object.keys(respondentAnalysis.responsesByDate)[0]
                            )
                          ).toLocaleDateString("ja-JP")}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {Math.max(
                            ...Object.values(respondentAnalysis.responsesByDate)
                          )}
                          件
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">データなし</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock size={16} />
                    回答時間帯
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {Object.keys(respondentAnalysis.responsesByHour).length >
                    0 ? (
                      <>
                        <div className="font-semibold">
                          {getHourLabel(
                            parseInt(
                              Object.entries(
                                respondentAnalysis.responsesByHour
                              ).reduce(
                                (max, [hour, count]) =>
                                  count >
                                  respondentAnalysis.responsesByHour[
                                    parseInt(max)
                                  ]
                                    ? hour
                                    : max,
                                Object.keys(
                                  respondentAnalysis.responsesByHour
                                )[0]
                              )
                            )
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          最多回答時間
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">データなし</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 改善点フィードバック */}
            {improvementFeedbacks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare size={20} />
                    改善点・ご意見 (星3.9以下)
                  </CardTitle>
                  <CardDescription>
                    お客様からいただいた貴重なご意見です (
                    {improvementFeedbacks.length}件)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {improvementFeedbacks.map((feedback, index) => (
                      <motion.div
                        key={feedback.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="p-4 bg-muted/50 rounded-lg border-l-4 border-orange-400"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-orange-600 border-orange-300"
                            >
                              平均 {feedback.averageRating.toFixed(1)}★
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                feedback.submittedAt
                              ).toLocaleDateString("ja-JP", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {feedback.improvementText}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 質問別結果 */}
            <div className="space-y-6">
              {Object.entries(statistics).map(([questionId, stat]) => (
                <motion.div
                  key={questionId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{stat.question}</CardTitle>
                      <CardDescription>
                        {stat.totalResponses}件の回答 (
                        {stat.type === "rating"
                          ? "評価"
                          : stat.type === "choice"
                          ? "選択肢"
                          : "テキスト"}
                        )
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stat.type === "rating" && stat.average && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold">
                              {stat.average.toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              / 5.0 平均評価
                            </div>
                          </div>
                          {stat.distribution && (
                            <div className="space-y-2">
                              {[5, 4, 3, 2, 1].map((rating) => (
                                <div
                                  key={rating}
                                  className="flex items-center gap-2"
                                >
                                  <div className="w-8 text-sm">{rating}★</div>
                                  <Progress
                                    value={
                                      (stat.distribution![rating] /
                                        stat.totalResponses) *
                                      100
                                    }
                                    className="flex-1"
                                  />
                                  <div className="w-16 text-sm text-right">
                                    {stat.distribution![rating]}件 (
                                    {(
                                      (stat.distribution![rating] /
                                        stat.totalResponses) *
                                      100
                                    ).toFixed(1)}
                                    %)
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {stat.type === "choice" && stat.optionCounts && (
                        <div className="space-y-3">
                          {Object.entries(stat.optionCounts).map(
                            ([option, count]) => (
                              <div
                                key={option}
                                className="flex items-center gap-2"
                              >
                                <div className="min-w-0 flex-1 text-sm">
                                  {option}
                                </div>
                                <Progress
                                  value={(count / stat.totalResponses) * 100}
                                  className="w-32"
                                />
                                <div className="w-20 text-sm text-right">
                                  {count}件 (
                                  {(
                                    (count / stat.totalResponses) *
                                    100
                                  ).toFixed(1)}
                                  %)
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {stat.type === "text" && (
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground mb-3">
                            最近の回答 (最大10件表示)
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {stat.responses
                              .slice(0, 10)
                              .map((response, index) => (
                                <div
                                  key={index}
                                  className="p-3 bg-muted rounded text-sm"
                                >
                                  {response}
                                </div>
                              ))}
                          </div>
                          {stat.responses.length > 10 && (
                            <p className="text-xs text-muted-foreground">
                              他 {stat.responses.length - 10}件の回答があります
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {responses.length === 0 && (
              <Card className="text-center py-16">
                <CardContent>
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">
                    まだ回答がありません
                  </h3>
                  <p className="text-gray-600 mb-4">
                    アンケートのURLを共有して、回答を集めましょう。
                  </p>
                  <Button asChild>
                    <a
                      href={`${window.location.origin}/s/${resolvedParams.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      アンケートを共有
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
