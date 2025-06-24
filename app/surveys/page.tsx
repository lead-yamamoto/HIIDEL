"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Globe,
  ArrowRight,
  Users,
  Plus,
  Copy,
  Eye,
  BarChart3,
  Settings,
  Trash2,
  Edit,
  Loader2,
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
import { LoadingState } from "@/components/ui/loading";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Survey {
  id: string;
  title: string;
  description: string;
  shareUrl: string;
  createdAt: string;
  isActive: boolean;
  responses?: any[];
  responseCount?: number;
}

export default function SurveysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [surveyToDelete, setSurveyToDelete] = useState<Survey | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSurveyId, setDeletingSurveyId] = useState<string | null>(null);

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

    fetchSurveys();
  }, [status, router]);

  const fetchSurveys = async () => {
    try {
      const response = await fetch("/api/surveys");
      if (response.ok) {
        const data = await response.json();
        setSurveys(data.surveys || []);
      } else {
        console.error("アンケート取得に失敗:", response.statusText);
      }
    } catch (error) {
      console.error("アンケート取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // ここにコピー成功時の通知などを追加できます
  };

  const confirmDeleteSurvey = (survey: Survey) => {
    setSurveyToDelete(survey);
    setIsDeleteDialogOpen(true);
  };

  const deleteSurvey = async () => {
    if (!surveyToDelete) return;

    try {
      setDeletingSurveyId(surveyToDelete.id);
      console.log(`🗑️ Deleting survey: ${surveyToDelete.title}`);

      const response = await fetch(`/api/surveys?id=${surveyToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("✅ Survey deleted successfully");
        setSurveys(surveys.filter((s) => s.id !== surveyToDelete.id));
        setIsDeleteDialogOpen(false);
        setSurveyToDelete(null);
      } else {
        console.error("❌ Failed to delete survey");
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("💥 Error deleting survey:", error);
      alert("削除に失敗しました");
    } finally {
      setDeletingSurveyId(null);
    }
  };

  const filteredSurveys = searchTerm
    ? surveys.filter(
        (survey) =>
          survey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          survey.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : surveys;

  if (!mounted) return null;

  if (status === "loading") {
    return (
      <div className="flex min-h-screen bg-background text-foreground items-center justify-center">
        <LoadingState message="認証情報を確認中..." />
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
          title="アンケート管理"
          currentPath="/surveys"
          searchPlaceholder="アンケートを検索..."
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
                アンケート管理
              </motion.h1>
              <Button
                asChild
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none"
              >
                <a href="/survey-builder">
                  <Plus size={16} className="mr-2" />
                  新しいアンケートを作成
                </a>
              </Button>
            </div>

            {/* ローディング状態 */}
            {isLoading && <LoadingState message="アンケートを読み込み中..." />}

            {/* 空の状態 */}
            {!isLoading && surveys.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="text-center py-16">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-blue-500" />
                      まだアンケートがありません
                    </CardTitle>
                    <CardDescription>
                      最初のアンケートを作成して、顧客からのフィードバックを収集しましょう
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      asChild
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none"
                    >
                      <a href="/survey-builder">
                        <Plus size={16} className="mr-2" />
                        アンケートを作成する
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* アンケートリスト */}
            {!isLoading && filteredSurveys.length > 0 && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredSurveys.map((survey, index) => (
                  <motion.div
                    key={survey.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="h-full flex flex-col">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">
                              {survey.title}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {survey.description}
                            </CardDescription>
                          </div>
                          <div
                            className={`px-2 py-1 rounded-full text-xs ${
                              survey.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {survey.isActive ? "アクティブ" : "非アクティブ"}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <div className="flex-1">
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Users size={14} />
                              <span>{survey.responseCount || 0} 回答</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe size={14} />
                              <span>
                                作成日:{" "}
                                {new Date(survey.createdAt).toLocaleDateString(
                                  "ja-JP"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <div className="flex gap-2 text-sm">
                            <input
                              type="text"
                              value={survey.shareUrl}
                              readOnly
                              className="flex-1 px-2 py-1 text-xs bg-muted rounded border"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(survey.shareUrl)}
                            >
                              <Copy size={12} />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="flex items-center justify-center"
                            >
                              <a
                                href={survey.shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye size={14} className="mr-1" />
                                プレビュー
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="flex items-center justify-center"
                            >
                              <a href={`/survey-builder?edit=${survey.id}`}>
                                <Edit size={14} className="mr-1" />
                                編集
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="flex items-center justify-center"
                            >
                              <a href={`/survey-results/${survey.id}`}>
                                <BarChart3 size={14} className="mr-1" />
                                結果
                              </a>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => confirmDeleteSurvey(survey)}
                              disabled={deletingSurveyId === survey.id}
                              className="text-red-500 hover:text-red-600 flex items-center justify-center"
                            >
                              {deletingSurveyId === survey.id ? (
                                <Loader2
                                  size={14}
                                  className="mr-1 animate-spin"
                                />
                              ) : (
                                <Trash2 size={14} className="mr-1" />
                              )}
                              削除
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 検索結果が空の場合 */}
            {!isLoading &&
              surveys.length > 0 &&
              filteredSurveys.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-16"
                >
                  <p className="text-muted-foreground">
                    「{searchTerm}」に一致するアンケートが見つかりませんでした
                  </p>
                </motion.div>
              )}
          </div>
        </div>

        {/* アンケート削除確認ダイアログ */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>アンケートを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                「{surveyToDelete?.title}」を削除します。
                <br />
                この操作は取り消すことができません。
                <br />
                関連する回答データも全て削除されます。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteSurvey}
                className="bg-red-600 hover:bg-red-700"
                disabled={!!deletingSurveyId}
              >
                {deletingSurveyId === surveyToDelete?.id ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    削除中...
                  </>
                ) : (
                  "削除"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
