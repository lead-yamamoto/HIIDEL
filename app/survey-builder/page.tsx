"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Grip,
  Plus,
  Save,
  Trash2,
  Type,
  ExternalLink,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2 } from "lucide-react";

interface Question {
  id: number;
  type: "rating" | "text" | "choice";
  question: string;
  required: boolean;
  options: string[];
  scale?: number;
}

interface Store {
  id: string;
  displayName: string;
  name?: string;
  googleReviewUrl?: string;
}

function SurveyBuilderContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("design");
  const [surveyTitle, setSurveyTitle] = useState("新しいアンケート");
  const [surveyDescription, setSurveyDescription] =
    useState("お客様のご意見をお聞かせください。");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [surveyUrl, setSurveyUrl] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSurveyId, setEditingSurveyId] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 1,
      type: "rating",
      question: "サービスの満足度を教えてください",
      required: true,
      options: [],
      scale: 5,
    },
    {
      id: 2,
      type: "text",
      question: "改善点があれば教えてください",
      required: false,
      options: [],
    },
    {
      id: 3,
      type: "choice",
      question: "どのようにして当店を知りましたか？",
      required: true,
      options: ["インターネット検索", "SNS", "友人・知人の紹介", "その他"],
    },
  ]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 認証確認と編集モードの初期化
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    // 店舗リストを読み込む
    fetchStores();

    // 編集モードかチェック
    const editId = searchParams?.get("edit");
    if (editId) {
      setIsEditMode(true);
      setEditingSurveyId(editId);
      loadSurveyForEdit(editId);
    }
  }, [status, router, searchParams]);

  // 店舗リストを取得
  const fetchStores = async () => {
    try {
      console.log("🏪 Fetching stores...");
      const response = await fetch("/api/stores", {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      console.log("🏪 Store API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("🏪 Store API response data:", data);

        const storeList = data.stores || [];
        console.log("🏪 Setting stores:", storeList);
        setStores(storeList);
      } else {
        console.error(
          "🏪 Store API failed:",
          response.status,
          response.statusText
        );
        const errorText = await response.text();
        console.error("🏪 Error response:", errorText);
        setStores([]);
      }
    } catch (error) {
      console.error("🏪 店舗取得エラー:", error);
      setStores([]);
    }
  };

  // 編集用のアンケートデータを読み込み
  const loadSurveyForEdit = async (surveyId: string) => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}?edit=true`);
      if (response.ok) {
        const data = await response.json();
        const survey = data.survey;

        setSurveyTitle(survey.title);
        setSurveyDescription(survey.description);
        setQuestions(survey.questions);
        setSelectedStoreId(survey.storeId || "");
        setSurveyUrl(`${window.location.origin}/s/${surveyId}`);
      } else {
        setSaveMessage("編集するアンケートが見つかりませんでした");
      }
    } catch (error) {
      console.error("アンケート読み込みエラー:", error);
      setSaveMessage("アンケートの読み込みに失敗しました");
    }
  };

  const saveSurvey = async () => {
    if (!session?.user?.email) {
      alert("ログインが必要です");
      return;
    }

    // 店舗選択のバリデーション
    if (!selectedStoreId) {
      setSaveMessage("店舗を選択してください");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      const url = isEditMode ? "/api/surveys" : "/api/surveys";
      const method = isEditMode ? "PUT" : "POST";
      const body = isEditMode
        ? {
            id: editingSurveyId,
            title: surveyTitle,
            description: surveyDescription,
            questions: questions,
            storeId: selectedStoreId,
          }
        : {
            title: surveyTitle,
            description: surveyDescription,
            questions: questions,
            storeId: selectedStoreId,
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        if (!isEditMode) {
          setSurveyUrl(data.survey.shareUrl);
        }
        setSaveMessage(
          isEditMode
            ? "アンケートが正常に更新されました！"
            : "アンケートが正常に保存されました！"
        );

        // 2秒後にメッセージをクリア
        setTimeout(() => setSaveMessage(""), 2000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`保存に失敗しました: ${errorData.error}`);
      }
    } catch (error) {
      console.error("保存エラー:", error);
      setSaveMessage("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const copyUrl = () => {
    if (surveyUrl) {
      navigator.clipboard.writeText(surveyUrl);
      setSaveMessage("URLをクリップボードにコピーしました！");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  };

  const addQuestion = () => {
    const newId =
      questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;
    const newQuestion: Question = {
      id: newId,
      type: "text",
      question: "新しい質問",
      required: false,
      options: [],
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: number) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: number, data: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...data } : q)));
  };

  const moveQuestion = (id: number, direction: "up" | "down") => {
    const index = questions.findIndex((q) => q.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === questions.length - 1)
    ) {
      return;
    }

    const newQuestions = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;
    setQuestions(newQuestions);
  };

  const addOption = (questionId: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const newOptions = [
      ...question.options,
      `選択肢 ${question.options.length + 1}`,
    ];
    updateQuestion(questionId, { options: newOptions });
  };

  const updateOption = (questionId: number, index: number, value: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const newOptions = [...question.options];
    newOptions[index] = value;
    updateQuestion(questionId, { options: newOptions });
  };

  const removeOption = (questionId: number, index: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    const newOptions = [...question.options];
    newOptions.splice(index, 1);
    updateQuestion(questionId, { options: newOptions });
  };

  if (!mounted) return null;

  if (status === "loading") {
    return (
      <div className="flex min-h-screen bg-background text-foreground items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar currentPath="/survey-builder" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader
          title={isEditMode ? "アンケート編集" : "アンケート作成"}
          currentPath="/survey-builder"
          searchPlaceholder="アンケートを検索..."
          backUrl="/surveys"
        />

        {/* Main area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1"
              >
                <Input
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  className="text-xl md:text-2xl font-medium border-none bg-transparent px-0 h-auto focus-visible:ring-0"
                />
              </motion.div>
              <div className="flex gap-2">
                <Button
                  onClick={saveSurvey}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none"
                >
                  {isSaving ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {isEditMode ? "更新中..." : "保存中..."}
                    </div>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />{" "}
                      {isEditMode ? "更新" : "保存"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 保存メッセージ */}
            {saveMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <Alert
                  className={
                    surveyUrl
                      ? "border-green-500 bg-green-50"
                      : "border-red-500 bg-red-50"
                  }
                >
                  <AlertDescription>{saveMessage}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* アンケートURL表示 */}
            {surveyUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Share2 size={20} />
                      アンケートURL
                    </CardTitle>
                    <CardDescription>
                      このURLを顧客に共有してアンケートに回答してもらいましょう
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input value={surveyUrl} readOnly className="flex-1" />
                      <Button onClick={copyUrl} variant="outline" size="sm">
                        <Copy size={16} className="mr-1" /> コピー
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={surveyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink size={16} className="mr-1" /> プレビュー
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full mb-6"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="design">質問作成</TabsTrigger>
                <TabsTrigger value="settings">設定</TabsTrigger>
              </TabsList>

              <TabsContent value="design" className="space-y-6">
                {/* アンケート説明 */}
                <Card>
                  <CardHeader>
                    <CardTitle>アンケート概要</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="description">説明文</Label>
                      <Textarea
                        id="description"
                        value={surveyDescription}
                        onChange={(e) => setSurveyDescription(e.target.value)}
                        placeholder="アンケートの説明を入力してください"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 質問リスト */}
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card>
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Grip
                                size={16}
                                className="text-muted-foreground"
                              />
                              <span className="text-sm font-medium">
                                質問 {index + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => moveQuestion(question.id, "up")}
                                disabled={index === 0}
                              >
                                <ArrowUp size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  moveQuestion(question.id, "down")
                                }
                                disabled={index === questions.length - 1}
                              >
                                <ArrowDown size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeQuestion(question.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>質問タイプ</Label>
                              <Select
                                value={question.type}
                                onValueChange={(value) =>
                                  updateQuestion(question.id, {
                                    type: value as any,
                                    options:
                                      value === "choice"
                                        ? ["選択肢1", "選択肢2"]
                                        : [],
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">
                                    テキスト入力
                                  </SelectItem>
                                  <SelectItem value="rating">
                                    評価（星）
                                  </SelectItem>
                                  <SelectItem value="choice">選択肢</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={question.required}
                                onCheckedChange={(checked) =>
                                  updateQuestion(question.id, {
                                    required: checked,
                                  })
                                }
                              />
                              <Label>必須項目</Label>
                            </div>
                          </div>

                          <div>
                            <Label>質問文</Label>
                            <Input
                              value={question.question}
                              onChange={(e) =>
                                updateQuestion(question.id, {
                                  question: e.target.value,
                                })
                              }
                              placeholder="質問を入力してください"
                            />
                          </div>

                          {question.type === "choice" && (
                            <div>
                              <Label>選択肢</Label>
                              <div className="space-y-2">
                                {question.options.map((option, optionIndex) => (
                                  <div key={optionIndex} className="flex gap-2">
                                    <Input
                                      value={option}
                                      onChange={(e) =>
                                        updateOption(
                                          question.id,
                                          optionIndex,
                                          e.target.value
                                        )
                                      }
                                      placeholder={`選択肢 ${optionIndex + 1}`}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        removeOption(question.id, optionIndex)
                                      }
                                      className="text-red-500"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addOption(question.id)}
                                >
                                  <Plus size={14} className="mr-1" />{" "}
                                  選択肢を追加
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={addQuestion}
                    className="w-full border-dashed border-2"
                  >
                    <Plus size={16} className="mr-2" /> 質問を追加
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>アンケート設定</CardTitle>
                    <CardDescription>
                      アンケートの動作や表示に関する設定を行います
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="store">
                        店舗を選択 <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={selectedStoreId}
                        onValueChange={(value) => {
                          console.log("🏪 Store selected:", value);
                          setSelectedStoreId(value);
                        }}
                      >
                        <SelectTrigger id="store">
                          <SelectValue placeholder="店舗を選択してください" />
                        </SelectTrigger>
                        <SelectContent>
                          {!stores || stores.length === 0 ? (
                            <SelectItem value="" disabled>
                              店舗が登録されていません
                            </SelectItem>
                          ) : (
                            stores.map((store) => (
                              <SelectItem key={store.id} value={store.id}>
                                <div className="flex items-center gap-2">
                                  <Building2 size={16} />
                                  {store.displayName ||
                                    store.name ||
                                    `店舗 ${store.id}`}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        平均評価が4.0以上の場合、選択した店舗のGoogleレビューページへ誘導されます
                      </p>
                      {stores && stores.length > 0 && (
                        <p className="text-xs text-green-600">
                          {stores.length}件の店舗が利用可能です
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>アンケート公開状態</Label>
                        <p className="text-sm text-muted-foreground">
                          オフにすると回答を受け付けなくなります
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex min-h-screen bg-background text-foreground items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    </div>
  );
}

export default function SurveyBuilderPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SurveyBuilderContent />
    </Suspense>
  );
}
