"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Mail, Plus, Save } from "lucide-react";
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

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
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
    </div>
  );
}
