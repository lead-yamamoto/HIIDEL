"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Mail,
  Plus,
  Save,
  Bot,
  Clock,
  Settings,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoReplyRunning, setAutoReplyRunning] = useState(false);

  // AI設定の状態
  const [aiSettings, setAiSettings] = useState({
    customPromptEnabled: false,
    positiveReviewPrompt: "",
    neutralReviewPrompt: "",
    negativeReviewPrompt: "",
    noCommentReviewPrompt: "",
    autoReplyEnabled: false,
    autoReplyDelayMinutes: 60,
    autoReplyBusinessHoursOnly: true,
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
    autoReplyMinRating: 1,
    autoReplyMaxRating: 5,
  });

  // AI設定を読み込み
  const loadAISettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai-settings");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAiSettings(data.settings);
        }
      }
    } catch (error) {
      console.error("AI設定の読み込みに失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  // AI設定を保存
  const saveAISettings = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/ai-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(aiSettings),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert("AI設定が保存されました");
        } else {
          alert("保存に失敗しました: " + data.error);
        }
      } else {
        alert("保存に失敗しました");
      }
    } catch (error) {
      console.error("AI設定の保存に失敗しました:", error);
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // 自動返信を実行
  const runAutoReply = async () => {
    try {
      setAutoReplyRunning(true);
      const response = await fetch("/api/auto-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ force: true }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(`${data.processed}件のレビューに自動返信しました`);
        } else {
          alert("自動返信に失敗しました: " + data.message);
        }
      } else {
        alert("自動返信に失敗しました");
      }
    } catch (error) {
      console.error("自動返信の実行に失敗しました:", error);
      alert("自動返信に失敗しました");
    } finally {
      setAutoReplyRunning(false);
    }
  };

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
    loadAISettings();
  }, []);

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
                <TabsTrigger value="ai-settings">AI返信設定</TabsTrigger>
                <TabsTrigger value="auto-reply">自動返信</TabsTrigger>
                <TabsTrigger value="notifications">通知設定</TabsTrigger>
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

              <TabsContent value="ai-settings">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium flex items-center">
                        <Bot size={20} className="mr-2 text-blue-500" />
                        AI返信プロンプトのカスタマイズ
                      </h3>
                      <Switch
                        checked={aiSettings.customPromptEnabled}
                        onCheckedChange={(checked) =>
                          setAiSettings({
                            ...aiSettings,
                            customPromptEnabled: checked,
                          })
                        }
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      AIが返信を生成する際に使用するプロンプトをカスタマイズできます。
                      有効にすると、以下で設定したプロンプトが使用されます。
                    </p>
                  </div>

                  {aiSettings.customPromptEnabled && (
                    <div className="space-y-6 mb-6">
                      <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                        <h4 className="font-medium mb-3 text-green-600">
                          ポジティブなレビュー用プロンプト
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          評価が4〜5の場合に使用されます
                        </p>
                        <Textarea
                          value={aiSettings.positiveReviewPrompt}
                          onChange={(e) =>
                            setAiSettings({
                              ...aiSettings,
                              positiveReviewPrompt: e.target.value,
                            })
                          }
                          placeholder="例: この度は{店舗名}をご利用いただき、ありがとうございます..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                        <h4 className="font-medium mb-3 text-yellow-600">
                          中立的なレビュー用プロンプト
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          評価が3の場合に使用されます
                        </p>
                        <Textarea
                          value={aiSettings.neutralReviewPrompt}
                          onChange={(e) =>
                            setAiSettings({
                              ...aiSettings,
                              neutralReviewPrompt: e.target.value,
                            })
                          }
                          placeholder="例: この度は{店舗名}をご利用いただき、ありがとうございます..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                        <h4 className="font-medium mb-3 text-red-600">
                          ネガティブなレビュー用プロンプト
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          評価が1〜2の場合に使用されます
                        </p>
                        <Textarea
                          value={aiSettings.negativeReviewPrompt}
                          onChange={(e) =>
                            setAiSettings({
                              ...aiSettings,
                              negativeReviewPrompt: e.target.value,
                            })
                          }
                          placeholder="例: この度は{店舗名}をご利用いただき、ありがとうございました..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                        <h4 className="font-medium mb-3 text-blue-600">
                          コメントなしレビュー用プロンプト
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          評価のみでコメントがない場合に使用されます
                        </p>
                        <Textarea
                          value={aiSettings.noCommentReviewPrompt}
                          onChange={(e) =>
                            setAiSettings({
                              ...aiSettings,
                              noCommentReviewPrompt: e.target.value,
                            })
                          }
                          placeholder="例: この度は{店舗名}をご利用いただき、ありがとうございます..."
                          className="min-h-[100px]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="bg-muted/30 border rounded-xl p-4 text-sm mb-6">
                    <h4 className="font-medium mb-2 flex items-center">
                      <AlertCircle size={16} className="mr-2 text-amber-500" />
                      使用可能な変数
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>
                          <code>{"{店舗名}"}</code> - 店舗名
                        </li>
                        <li>
                          <code>{"{お客様名}"}</code> - レビュー投稿者名
                        </li>
                        <li>
                          <code>{"{評価}"}</code> - 星評価（1-5）
                        </li>
                      </ul>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>
                          <code>{"{レビュー内容}"}</code> - レビュー本文
                        </li>
                        <li>
                          <code>{"{日付}"}</code> - 返信日
                        </li>
                        <li>
                          <code>{"{担当者名}"}</code> - 返信担当者名
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={saveAISettings}
                      disabled={saving}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    >
                      <Save size={16} className="mr-2" />
                      {saving ? "保存中..." : "AI設定を保存"}
                    </Button>
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
                      <h3 className="font-medium flex items-center">
                        <Settings size={20} className="mr-2 text-green-500" />
                        自動返信機能
                      </h3>
                      <Switch
                        checked={aiSettings.autoReplyEnabled}
                        onCheckedChange={(checked) =>
                          setAiSettings({
                            ...aiSettings,
                            autoReplyEnabled: checked,
                          })
                        }
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      新しいレビューを定期的にチェックし、設定に従って自動的にAI返信を生成・投稿します。
                    </p>
                  </div>

                  {aiSettings.autoReplyEnabled && (
                    <div className="space-y-6 mb-6">
                      <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                        <h4 className="font-medium mb-4 flex items-center">
                          <Clock size={18} className="mr-2 text-blue-500" />
                          タイミング設定
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label
                              htmlFor="delay-minutes"
                              className="mb-2 block"
                            >
                              返信遅延時間（分）
                            </Label>
                            <Input
                              id="delay-minutes"
                              type="number"
                              min="0"
                              max="1440"
                              value={aiSettings.autoReplyDelayMinutes}
                              onChange={(e) =>
                                setAiSettings({
                                  ...aiSettings,
                                  autoReplyDelayMinutes:
                                    parseInt(e.target.value) || 60,
                                })
                              }
                              placeholder="60"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              レビュー投稿から返信までの遅延時間
                            </p>
                          </div>
                          <div>
                            <Label className="mb-2 block">営業時間制限</Label>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={aiSettings.autoReplyBusinessHoursOnly}
                                onCheckedChange={(checked) =>
                                  setAiSettings({
                                    ...aiSettings,
                                    autoReplyBusinessHoursOnly: checked,
                                  })
                                }
                              />
                              <span className="text-sm">
                                営業時間内のみ自動返信
                              </span>
                            </div>
                          </div>
                        </div>

                        {aiSettings.autoReplyBusinessHoursOnly && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label
                                htmlFor="business-start"
                                className="mb-2 block"
                              >
                                営業開始時間
                              </Label>
                              <Input
                                id="business-start"
                                type="time"
                                value={aiSettings.businessHoursStart}
                                onChange={(e) =>
                                  setAiSettings({
                                    ...aiSettings,
                                    businessHoursStart: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label
                                htmlFor="business-end"
                                className="mb-2 block"
                              >
                                営業終了時間
                              </Label>
                              <Input
                                id="business-end"
                                type="time"
                                value={aiSettings.businessHoursEnd}
                                onChange={(e) =>
                                  setAiSettings({
                                    ...aiSettings,
                                    businessHoursEnd: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                        <h4 className="font-medium mb-4">評価フィルタ</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="min-rating" className="mb-2 block">
                              最小評価
                            </Label>
                            <select
                              id="min-rating"
                              value={aiSettings.autoReplyMinRating}
                              onChange={(e) =>
                                setAiSettings({
                                  ...aiSettings,
                                  autoReplyMinRating: parseInt(e.target.value),
                                })
                              }
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="1">1つ星以上</option>
                              <option value="2">2つ星以上</option>
                              <option value="3">3つ星以上</option>
                              <option value="4">4つ星以上</option>
                              <option value="5">5つ星のみ</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="max-rating" className="mb-2 block">
                              最大評価
                            </Label>
                            <select
                              id="max-rating"
                              value={aiSettings.autoReplyMaxRating}
                              onChange={(e) =>
                                setAiSettings({
                                  ...aiSettings,
                                  autoReplyMaxRating: parseInt(e.target.value),
                                })
                              }
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="1">1つ星まで</option>
                              <option value="2">2つ星まで</option>
                              <option value="3">3つ星まで</option>
                              <option value="4">4つ星まで</option>
                              <option value="5">5つ星まで</option>
                            </select>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          この範囲内の評価のレビューにのみ自動返信します
                        </p>
                      </div>

                      <div className="bg-card/50 backdrop-blur-md border rounded-xl p-4 md:p-5 shadow-sm">
                        <h4 className="font-medium mb-4">手動実行</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          自動返信を即座に実行して、未返信のレビューに返信します。
                        </p>
                        <Button
                          onClick={runAutoReply}
                          disabled={autoReplyRunning}
                          variant="outline"
                          className="w-full md:w-auto"
                        >
                          <PlayCircle size={16} className="mr-2" />
                          {autoReplyRunning
                            ? "実行中..."
                            : "今すぐ自動返信を実行"}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={saveAISettings}
                      disabled={saving}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                    >
                      <Save size={16} className="mr-2" />
                      {saving ? "保存中..." : "自動返信設定を保存"}
                    </Button>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
