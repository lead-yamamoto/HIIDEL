"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  HelpCircle,
  Book,
  MessageCircle,
  Mail,
  Phone,
  ExternalLink,
  Search,
  ChevronRight,
  Users,
  QrCode,
  BarChart3,
  Settings,
  Store,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function HelpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
  }, [status, router]);

  const quickStartGuides = [
    {
      title: "店舗の追加と管理",
      description: "Google Business Profileと連携して店舗を追加する方法",
      icon: <Store className="h-5 w-5" />,
      link: "#stores-guide",
    },
    {
      title: "QRコードの作成",
      description: "レビュー収集用のQRコードを作成する方法",
      icon: <QrCode className="h-5 w-5" />,
      link: "#qr-guide",
    },
    {
      title: "アンケートの作成",
      description: "カスタムアンケートを作成し、フィードバックを収集する方法",
      icon: <Users className="h-5 w-5" />,
      link: "#survey-guide",
    },
    {
      title: "レビュー分析の活用",
      description: "ダッシュボードでレビューデータを分析する方法",
      icon: <BarChart3 className="h-5 w-5" />,
      link: "#analytics-guide",
    },
    {
      title: "自動返信の設定",
      description: "レビューへの自動返信機能を設定する方法",
      icon: <Settings className="h-5 w-5" />,
      link: "#auto-reply-guide",
    },
  ];

  const faqItems = [
    {
      question: "Google Business Profileとの連携に失敗します",
      answer:
        "まず、Google Business Profileのアカウントでログインしていることを確認してください。次に、ブラウザのポップアップブロックが無効になっていることを確認し、再度連携を試してください。",
    },
    {
      question: "QRコードが読み取れません",
      answer:
        "QRコードの画質が低い場合があります。QRコード管理画面からPNG形式でダウンロードし、印刷時は300dpi以上の解像度で印刷することをお勧めします。",
    },
    {
      question: "自動返信が機能しません",
      answer:
        "設定画面で自動返信が有効になっていることを確認してください。また、Google Business Profile APIの権限が正しく設定されている必要があります。",
    },
    {
      question: "レビューデータが表示されません",
      answer:
        "Google Business Profileとの連携が完了していない、またはAPIのアクセス権限に問題がある可能性があります。連携設定を再確認してください。",
    },
    {
      question: "アンケートの回答が保存されません",
      answer:
        "ブラウザのJavaScriptが有効になっていることを確認してください。また、ネットワーク接続が安定していることも確認してください。",
    },
  ];

  const contactOptions = [
    {
      title: "メールサポート",
      description: "平日9:00-18:00にメールでお問い合わせください",
      icon: <Mail className="h-5 w-5" />,
      contact: "support@hiidel.com",
      action: "メールを送信",
    },
    {
      title: "電話サポート",
      description: "緊急の問題については電話でお問い合わせください",
      icon: <Phone className="h-5 w-5" />,
      contact: "03-1234-5678",
      action: "電話をかける",
    },
    {
      title: "チャットサポート",
      description: "リアルタイムでサポートチームとチャットできます",
      icon: <MessageCircle className="h-5 w-5" />,
      contact: "ライブチャット",
      action: "チャットを開始",
    },
  ];

  const filteredFAQ = searchTerm
    ? faqItems.filter(
        (item) =>
          item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : faqItems;

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
        <Sidebar currentPath="/help" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader
          title="ヘルプ・サポート"
          currentPath="/help"
          searchPlaceholder="ヘルプを検索..."
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
                ヘルプ・サポート
              </motion.h1>
            </div>

            <Tabs defaultValue="guides" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="guides">使い方ガイド</TabsTrigger>
                <TabsTrigger value="faq">よくある質問</TabsTrigger>
                <TabsTrigger value="contact">お問い合わせ</TabsTrigger>
              </TabsList>

              <TabsContent value="guides">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Book className="h-5 w-5" />
                        クイックスタートガイド
                      </CardTitle>
                      <CardDescription>
                        HIIDELの主要機能を使い始めるためのガイドです
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {quickStartGuides.map((guide, index) => (
                          <motion.div
                            key={guide.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          >
                            <Card className="cursor-pointer hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="text-blue-500 mt-1">
                                    {guide.icon}
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-medium mb-1">
                                      {guide.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {guide.description}
                                    </p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                    >
                                      ガイドを見る
                                      <ChevronRight className="ml-1 h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>動画チュートリアル</CardTitle>
                      <CardDescription>
                        実際の操作画面を見ながら学べる動画ガイドです
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                              <ExternalLink className="h-6 w-6 text-white" />
                            </div>
                            <p className="text-sm font-medium">
                              基本操作ガイド
                            </p>
                            <p className="text-xs text-muted-foreground">5分</p>
                          </div>
                        </div>
                        <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                              <ExternalLink className="h-6 w-6 text-white" />
                            </div>
                            <p className="text-sm font-medium">
                              Google連携設定
                            </p>
                            <p className="text-xs text-muted-foreground">8分</p>
                          </div>
                        </div>
                        <div className="bg-muted rounded-lg aspect-video flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
                              <ExternalLink className="h-6 w-6 text-white" />
                            </div>
                            <p className="text-sm font-medium">
                              分析機能の活用
                            </p>
                            <p className="text-xs text-muted-foreground">6分</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="faq">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="FAQを検索..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="space-y-4">
                    {filteredFAQ.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card>
                          <CardContent className="p-6">
                            <h3 className="font-medium mb-3 flex items-start gap-2">
                              <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                              {item.question}
                            </h3>
                            <p className="text-muted-foreground ml-7">
                              {item.answer}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                  {filteredFAQ.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        「{searchTerm}」に関するFAQが見つかりませんでした
                      </p>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="contact">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>お問い合わせ方法</CardTitle>
                      <CardDescription>
                        困ったときは、以下の方法でサポートチームにお問い合わせください
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6 md:grid-cols-3">
                        {contactOptions.map((option, index) => (
                          <motion.div
                            key={option.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          >
                            <Card className="text-center">
                              <CardContent className="p-6">
                                <div className="text-blue-500 mb-4 flex justify-center">
                                  {option.icon}
                                </div>
                                <h3 className="font-medium mb-2">
                                  {option.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                  {option.description}
                                </p>
                                <p className="font-medium text-sm mb-4">
                                  {option.contact}
                                </p>
                                <Button variant="outline" size="sm">
                                  {option.action}
                                </Button>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>システムステータス</CardTitle>
                      <CardDescription>
                        各サービスの稼働状況を確認できます
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Webアプリケーション</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-600">正常</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Google Business Profile API</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-600">正常</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>メール通知システム</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm text-yellow-600">
                              メンテナンス中
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
