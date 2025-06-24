"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Mail,
  Plus,
  Save,
  Brain,
  CheckCircle,
  XCircle,
  Info,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [envStatus, setEnvStatus] = useState<any>(null);
  const [isLoadingEnv, setIsLoadingEnv] = useState(false);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    fetchEnvStatus();
  }, []);

  const fetchEnvStatus = async () => {
    setIsLoadingEnv(true);
    try {
      const response = await fetch("/api/debug/env");
      if (response.ok) {
        const data = await response.json();
        setEnvStatus(data.envStatus);
      }
    } catch (error) {
      console.error("環境変数の取得に失敗:", error);
    } finally {
      setIsLoadingEnv(false);
    }
  };

  const testAIReply = async () => {
    setIsTestingAI(true);
    setTestResult(null);

    try {
      // テスト用のレビューデータ
      const testReviews = [
        {
          reviewText:
            "スタッフの対応が素晴らしく、料理も美味しかったです。また来たいと思います。",
          rating: 5,
          businessName: "デモカフェ",
          businessType: "カフェ・レストラン",
        },
        {
          reviewText:
            "料理の味は普通でしたが、待ち時間が長すぎました。改善してほしいです。",
          rating: 2,
          businessName: "デモカフェ",
          businessType: "カフェ・レストラン",
        },
      ];

      console.log("🧪 AI返信テスト開始:", testReviews);

      const results = [];

      for (const testReview of testReviews) {
        console.log("📤 送信データ:", testReview);
        console.log("📤 JSONデータ:", JSON.stringify(testReview));

        const response = await fetch("/api/ai/review-reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(testReview),
        });

        console.log("📥 レスポンス状態:", response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          console.log("✅ 成功レスポンス:", data);
          results.push({
            ...testReview,
            reply: data.reply,
            metadata: data.metadata,
            warning: data.warning,
            debug: data.debug,
          });
        } else {
          const errorData = await response.json();
          console.error("❌ エラーレスポンス:", errorData);
          console.error("エラー詳細:", errorData);
          results.push({
            ...testReview,
            error: errorData.error,
            errorDetails: errorData.details,
          });
        }
      }

      setTestResult(results);
      setShowTestDialog(true);
    } catch (error) {
      console.error("AI返信テストエラー:", error);
      setTestResult([
        {
          error: "テスト中にエラーが発生しました",
          details: error instanceof Error ? error.message : String(error),
        },
      ]);
      setShowTestDialog(true);
    } finally {
      setIsTestingAI(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block md:w-64 md:fixed md:inset-y-0 md:z-50">
        <Sidebar currentPath="/settings" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:pl-64">
        {/* Header */}
        <MobileHeader
          title="返信の設定"
          currentPath="/settings"
          searchPlaceholder="設定を検索..."
          backUrl="/"
        />

        {/* Main area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <motion.h1
              className="text-xl md:text-2xl font-bold mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              返信の設定
            </motion.h1>

            <Tabs defaultValue="templates" className="w-full">
              <TabsList className="mb-6 overflow-x-auto flex w-full md:w-auto">
                <TabsTrigger value="templates">返信テンプレート</TabsTrigger>
                <TabsTrigger value="ai-settings">AI設定</TabsTrigger>
                <TabsTrigger value="notifications">通知設定</TabsTrigger>
                <TabsTrigger value="auto-reply">自動返信</TabsTrigger>
              </TabsList>

              <TabsContent value="templates">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                    <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">
                          ポジティブなレビューへの返信
                        </h3>
                        <Button variant="outline" size="sm">
                          編集
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        評価が4〜5の場合に使用されるテンプレートです。
                      </p>
                      <div className="bg-muted/50 p-3 rounded-md text-sm">
                        {"{お客様名}"}様、レビューをありがとうございます。
                        {"{店舗名}"}
                        をご利用いただき、ご満足いただけたようで嬉しく思います。またのご利用をお待ちしております。
                      </div>
                    </div>

                    <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">
                          中立的なレビューへの返信
                        </h3>
                        <Button variant="outline" size="sm">
                          編集
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        評価が3の場合に使用されるテンプレートです。
                      </p>
                      <div className="bg-muted/50 p-3 rounded-md text-sm">
                        {"{お客様名}"}様、レビューをありがとうございます。
                        {"{店舗名}"}
                        のサービス向上のため、貴重なご意見として参考にさせていただきます。何かご不明点がございましたら、お気軽にお問い合わせください。
                      </div>
                    </div>

                    <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">
                          ネガティブなレビューへの返信
                        </h3>
                        <Button variant="outline" size="sm">
                          編集
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        評価が1〜2の場合に使用されるテンプレートです。
                      </p>
                      <div className="bg-muted/50 p-3 rounded-md text-sm">
                        {"{お客様名}"}
                        様、ご不便をおかけし申し訳ございません。ご指摘いただいた点について早急に改善いたします。詳細についてお話を伺いたいので、よろしければ
                        {"{メールアドレス}"}までご連絡いただけますと幸いです。
                      </div>
                    </div>

                    <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium">
                          新しいテンプレートを作成
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className="opacity-0 pointer-events-none"
                        >
                          編集
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        特定のケースに対応する新しいテンプレートを作成します。
                      </p>
                      <button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2">
                        <Plus size={16} className="mr-2" /> テンプレートを追加
                      </button>
                    </div>
                  </div>

                  <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm mb-6">
                    <h3 className="font-medium mb-3">カスタムテンプレート</h3>
                    <div className="mb-4">
                      <Label htmlFor="template-name" className="mb-2 block">
                        テンプレート名
                      </Label>
                      <Input
                        id="template-name"
                        placeholder="例: 特別なお礼の返信"
                      />
                    </div>
                    <div className="mb-4">
                      <Label htmlFor="template-content" className="mb-2 block">
                        テンプレート内容
                      </Label>
                      <Textarea
                        id="template-content"
                        placeholder="テンプレートの内容を入力してください。変数は {変数名} の形式で指定できます。"
                        className="min-h-[150px]"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2">
                        <Save size={16} className="mr-2" /> 保存
                      </button>
                    </div>
                  </div>

                  <div className="bg-muted/30 border rounded-xl p-4 text-sm">
                    <h4 className="font-medium mb-2 flex items-center">
                      <AlertCircle size={16} className="mr-2 text-amber-500" />{" "}
                      使用可能な変数
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>{"{お客様名}"} - レビューを投稿したお客様の名前</li>
                      <li>{"{店舗名}"} - レビュー対象の店舗名</li>
                      <li>{"{日付}"} - 返信日</li>
                      <li>{"{メールアドレス}"} - 問い合わせ用メールアドレス</li>
                      <li>{"{担当者名}"} - 返信担当者の名前</li>
                    </ul>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="ai-settings">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        AI返信生成の設定
                      </CardTitle>
                      <CardDescription>
                        AI返信機能の設定と状態を確認できます
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* APIキーの状態 */}
                        <div>
                          <h4 className="font-medium mb-3">APIキーの状態</h4>
                          {isLoadingEnv ? (
                            <div className="text-sm text-muted-foreground">
                              読み込み中...
                            </div>
                          ) : envStatus ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="font-medium">OpenAI API</div>
                                  {envStatus.OPENAI_API_KEY?.isSet ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                      <CheckCircle size={16} />
                                      <span className="text-sm">設定済み</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-red-600">
                                      <XCircle size={16} />
                                      <span className="text-sm">未設定</span>
                                    </div>
                                  )}
                                </div>
                                {envStatus.OPENAI_API_KEY?.isSet && (
                                  <div className="text-xs text-muted-foreground">
                                    {envStatus.OPENAI_API_KEY.length}文字
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="font-medium">
                                    Google Gemini API
                                  </div>
                                  {envStatus.GEMINI_API_KEY?.isSet ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                      <CheckCircle size={16} />
                                      <span className="text-sm">設定済み</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-red-600">
                                      <XCircle size={16} />
                                      <span className="text-sm">未設定</span>
                                    </div>
                                  )}
                                </div>
                                {envStatus.GEMINI_API_KEY?.isSet && (
                                  <div className="text-xs text-muted-foreground">
                                    {envStatus.GEMINI_API_KEY.length}文字
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>環境変数の取得に失敗</AlertTitle>
                              <AlertDescription>
                                環境変数の状態を確認できませんでした。
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>

                        {/* AI設定の説明 */}
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>AI返信機能について</AlertTitle>
                          <AlertDescription className="space-y-2">
                            <p>
                              AI返信機能を使用するには、OpenAI APIまたはGoogle
                              Gemini APIのキーが必要です。
                            </p>
                            <p className="text-sm">
                              本番環境では、Vercel等のデプロイ環境で以下の環境変数を設定してください：
                            </p>
                            <ul className="list-disc list-inside text-sm mt-2">
                              <li>OPENAI_API_KEY: OpenAI APIキー</li>
                              <li>GEMINI_API_KEY: Google Gemini APIキー</li>
                            </ul>
                          </AlertDescription>
                        </Alert>

                        {/* APIキーが設定されていない場合の警告 */}
                        {envStatus &&
                          !envStatus.OPENAI_API_KEY?.isSet &&
                          !envStatus.GEMINI_API_KEY?.isSet && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>
                                APIキーが設定されていません
                              </AlertTitle>
                              <AlertDescription>
                                AI返信機能を使用するには、少なくとも1つのAPIキーを設定してください。
                                現在は定型文での返信のみ利用可能です。
                              </AlertDescription>
                            </Alert>
                          )}

                        {/* AI返信のプレビュー */}
                        <div>
                          <h4 className="font-medium mb-3">AI返信プレビュー</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            AI返信機能のテストを行えます
                          </p>
                          <Button
                            onClick={testAIReply}
                            variant="outline"
                            disabled={isTestingAI}
                          >
                            {isTestingAI ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                テスト中...
                              </>
                            ) : (
                              <>
                                <Brain className="h-4 w-4 mr-2" />
                                AI返信をテスト
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="notifications">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm mb-6">
                    <h3 className="font-medium mb-4">メール通知</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="new-review" className="mb-1 block">
                            新しいレビュー
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            新しいレビューが投稿されたときに通知を受け取る
                          </p>
                        </div>
                        <Switch id="new-review" defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label
                            htmlFor="negative-review"
                            className="mb-1 block"
                          >
                            ネガティブなレビュー
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            評価が3未満のレビューが投稿されたときに通知を受け取る
                          </p>
                        </div>
                        <Switch id="negative-review" defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label
                            htmlFor="weekly-summary"
                            className="mb-1 block"
                          >
                            週間サマリー
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            毎週月曜日に先週のレビュー統計情報を受け取る
                          </p>
                        </div>
                        <Switch id="weekly-summary" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm mb-6">
                    <h3 className="font-medium mb-4">通知先設定</h3>
                    <div className="mb-4">
                      <Label htmlFor="email" className="mb-2 block">
                        メールアドレス
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="email"
                          placeholder="example@company.com"
                          defaultValue="lead@example.com"
                        />
                        <Button variant="outline" size="icon">
                          <Mail size={16} />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label
                          htmlFor="additional-recipients"
                          className="mb-1 block"
                        >
                          追加の受信者
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          複数のスタッフに通知を送信する
                        </p>
                      </div>
                      <Switch id="additional-recipients" />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2">
                      <Save size={16} className="mr-2" /> 設定を保存
                    </button>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="auto-reply">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">自動返信の有効化</h3>
                      <Switch id="enable-auto-reply" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      自動返信を有効にすると、新しいレビューに対して設定したテンプレートを使用して自動的に返信します。
                    </p>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label
                            htmlFor="auto-reply-positive"
                            className="mb-1 block"
                          >
                            ポジティブなレビューへの自動返信
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            評価が4〜5のレビューに自動返信する
                          </p>
                        </div>
                        <Switch id="auto-reply-positive" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label
                            htmlFor="auto-reply-neutral"
                            className="mb-1 block"
                          >
                            中立的なレビューへの自動返信
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            評価が3のレビューに自動返信する
                          </p>
                        </div>
                        <Switch id="auto-reply-neutral" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label
                            htmlFor="auto-reply-negative"
                            className="mb-1 block"
                          >
                            ネガティブなレビューへの自動返信
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            評価が1〜2のレビューに自動返信する
                          </p>
                        </div>
                        <Switch id="auto-reply-negative" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm mb-6">
                    <h3 className="font-medium mb-4">自動返信の遅延</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      自動返信が送信されるまでの遅延時間を設定します。これにより、返信が自動化されているという印象を減らすことができます。
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="delay-positive" className="mb-2 block">
                          ポジティブなレビュー
                        </Label>
                        <select
                          id="delay-positive"
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          defaultValue="24"
                        >
                          <option value="0">即時</option>
                          <option value="1">1時間後</option>
                          <option value="3">3時間後</option>
                          <option value="6">6時間後</option>
                          <option value="12">12時間後</option>
                          <option value="24">24時間後</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="delay-neutral" className="mb-2 block">
                          中立的なレビュー
                        </Label>
                        <select
                          id="delay-neutral"
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          defaultValue="3"
                        >
                          <option value="0">即時</option>
                          <option value="1">1時間後</option>
                          <option value="3">3時間後</option>
                          <option value="6">6時間後</option>
                          <option value="12">12時間後</option>
                          <option value="24">24時間後</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="delay-negative" className="mb-2 block">
                          ネガティブなレビュー
                        </Label>
                        <select
                          id="delay-negative"
                          className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          defaultValue="1"
                        >
                          <option value="0">即時</option>
                          <option value="1">1時間後</option>
                          <option value="3">3時間後</option>
                          <option value="6">6時間後</option>
                          <option value="12">12時間後</option>
                          <option value="24">24時間後</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2">
                      <Save size={16} className="mr-2" /> 設定を保存
                    </button>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* AI返信テスト結果ダイアログ */}
      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI返信テスト結果</DialogTitle>
            <DialogDescription>
              テスト用のレビューに対するAI返信の生成結果です
            </DialogDescription>
          </DialogHeader>

          {testResult && (
            <div className="space-y-6">
              {testResult.map((result: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  {result.error ? (
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>エラー</AlertTitle>
                        <AlertDescription>{result.error}</AlertDescription>
                      </Alert>

                      {/* エラーの詳細情報 */}
                      {result.errorDetails && (
                        <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md text-sm border border-red-200 dark:border-red-800">
                          <h5 className="font-medium mb-2">エラー詳細:</h5>
                          <pre className="text-xs text-muted-foreground overflow-x-auto">
                            {JSON.stringify(result.errorDetails, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* 送信したデータ */}
                      <div className="bg-muted/50 p-3 rounded-md text-sm">
                        <h5 className="font-medium mb-2">送信したデータ:</h5>
                        <div className="space-y-1 text-xs">
                          <div>reviewText: "{result.reviewText}"</div>
                          <div>rating: {result.rating}</div>
                          <div>businessName: "{result.businessName}"</div>
                          <div>businessType: "{result.businessType}"</div>
                        </div>
                      </div>

                      {result.details && (
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md text-sm border border-yellow-200 dark:border-yellow-800">
                          <h5 className="font-medium mb-2">追加詳細:</h5>
                          <div className="text-xs text-muted-foreground">
                            {result.details}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* テスト用レビュー */}
                      <div className="mb-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          レビュー {index + 1}
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < result.rating
                                    ? "text-amber-500 fill-amber-500"
                                    : "text-muted"
                                }`}
                              />
                            ))}
                          </div>
                        </h4>
                        <div className="bg-muted/50 p-3 rounded-md text-sm">
                          "{result.reviewText}"
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          店舗: {result.businessName} | 業種:{" "}
                          {result.businessType}
                        </div>
                      </div>

                      {/* AI生成返信 */}
                      <div className="mb-4">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          AI生成返信
                          {result.metadata?.provider && (
                            <Badge variant="outline" className="text-xs">
                              {result.metadata.provider}
                            </Badge>
                          )}
                        </h4>
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md text-sm border border-blue-200 dark:border-blue-800">
                          {result.reply}
                        </div>
                      </div>

                      {/* メタデータ */}
                      {result.metadata && (
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>
                            プロバイダー: {result.metadata.provider}
                            {result.metadata.model &&
                              ` (${result.metadata.model})`}
                          </div>
                          <div>
                            返信タイプ:{" "}
                            {result.metadata.responseType ||
                            result.metadata.isPositive
                              ? "感謝"
                              : "改善への取り組み"}
                          </div>
                          {result.metadata.retries !== undefined && (
                            <div>リトライ回数: {result.metadata.retries}</div>
                          )}
                        </div>
                      )}

                      {/* 警告メッセージ */}
                      {result.warning && (
                        <Alert className="mt-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>注意</AlertTitle>
                          <AlertDescription>{result.warning}</AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
