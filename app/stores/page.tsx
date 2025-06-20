"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Star,
  Store,
  Globe,
  ArrowRight,
  Trash2,
  Edit,
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
import AddStoreDialog from "./add-store-dialog";
import { LoadingState } from "@/components/ui/loading";

interface Store {
  id: string;
  googleLocationId: string;
  displayName: string;
  address: string;
  phone?: string;
  website?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  title?: string;
  isTestStore?: boolean;
  googleReviewUrl?: string;
}

export default function StoresPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

    checkGoogleConnection();
  }, [status, router]);

  const checkGoogleConnection = async () => {
    try {
      const response = await fetch("/api/google/auth-status");
      const data = await response.json();
      setIsGoogleConnected(data.isAuthenticated);

      if (data.isAuthenticated) {
        fetchStores();
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Google認証状態の確認に失敗:", error);
      setIsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      console.log("📋 Fetching user stores...");
      const response = await fetch("/api/stores");
      if (response.ok) {
        const data = await response.json();
        console.log("🏪 Stores received:", data);
        setStores(data.stores || []);
      } else {
        console.error("Failed to fetch stores:", response.status);
      }
    } catch (error) {
      console.error("店舗情報の取得に失敗:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteStore = async (storeId: string) => {
    if (!confirm("この店舗を削除してもよろしいですか？")) {
      return;
    }

    try {
      const response = await fetch(`/api/stores?id=${storeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setStores(stores.filter((store) => store.id !== storeId));
      } else {
        const errorData = await response.json();
        alert(`削除に失敗しました: ${errorData.error}`);
      }
    } catch (error) {
      console.error("店舗の削除に失敗:", error);
      alert("店舗の削除に失敗しました");
    }
  };

  const filteredStores = searchTerm
    ? stores.filter(
        (store) =>
          store.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          store.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          store.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : stores;

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar currentPath="/stores" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader
          title="店舗一覧"
          currentPath="/stores"
          searchPlaceholder="店舗を検索..."
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
                店舗一覧
              </motion.h1>
              {isGoogleConnected && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <AddStoreDialog
                    onStoreAdded={fetchStores}
                    existingStores={stores}
                  />
                </motion.div>
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
                      店舗情報を表示するには、まずGoogleビジネスプロフィールと連携する必要があります。
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      asChild
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none"
                    >
                      <a href="/google-business/connect">
                        Googleビジネスプロフィールと連携する
                        <ArrowRight size={16} className="ml-2" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ローディング状態 */}
            {isLoading && <LoadingState message="店舗情報を読み込み中..." />}

            {/* 店舗リスト */}
            {isGoogleConnected && !isLoading && stores.length > 0 && (
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {filteredStores.map((store, index) => (
                  <motion.div
                    key={store.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">
                              {store.displayName}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {store.category && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400 mr-2">
                                  {store.category}
                                </span>
                              )}
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-600 dark:bg-green-400/10 dark:text-green-400">
                                連携済み
                              </span>
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-400/10 dark:text-gray-400">
                              <Star className="h-3.5 w-3.5 mr-1 fill-current" />
                              <span className="font-medium">
                                {store.rating ? store.rating.toFixed(1) : "-"}
                              </span>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteStore(store.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Store className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{store.address}</span>
                          </div>

                          {store.phone && (
                            <div className="flex items-center">
                              <span className="h-4 w-4 mr-2 flex-shrink-0">
                                📞
                              </span>
                              <span>{store.phone}</span>
                            </div>
                          )}

                          {store.website && (
                            <div className="flex items-center">
                              <ExternalLink className="h-4 w-4 mr-2 flex-shrink-0" />
                              <a
                                href={store.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {store.website}
                              </a>
                            </div>
                          )}

                          {store.reviewCount !== undefined && (
                            <div className="flex items-center">
                              <span className="h-4 w-4 mr-2 flex-shrink-0">
                                💬
                              </span>
                              <span>{store.reviewCount} 件のレビュー</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/reviews?store=${store.id}`)
                            }
                          >
                            レビューを見る
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/qr-codes?store=${store.id}`)
                            }
                          >
                            QRコード
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(`/analytics?store=${store.id}`)
                            }
                          >
                            分析
                          </Button>
                        </div>

                        {/* デバッグ情報 */}
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">
                            デバッグ情報 (開発用)
                          </summary>
                          <div className="mt-1 text-xs bg-gray-100 p-2 rounded">
                            <div>Store ID: {store.id}</div>
                            <div>
                              Google Location ID:{" "}
                              {store.googleLocationId || "未設定"}
                            </div>
                            <div>
                              Display Name: {store.displayName || "なし"}
                            </div>
                            <div>Title: {store.title || "なし"}</div>
                            <div>
                              Is Test Store: {store.isTestStore ? "Yes" : "No"}
                            </div>
                            <div className="mt-1 pt-1 border-t">
                              Google Review URL:{" "}
                              {store.googleReviewUrl ? (
                                <span className="text-green-600">
                                  自動生成済み ✓
                                </span>
                              ) : (
                                <span className="text-gray-400">未生成</span>
                              )}
                            </div>
                          </div>
                        </details>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Empty state */}
            {isGoogleConnected &&
              !isLoading &&
              stores.length === 0 &&
              !searchTerm && (
                <motion.div
                  className="flex flex-col items-center justify-center py-16 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-muted p-6 rounded-full mb-4">
                    <Store className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">店舗がありません</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Googleビジネスプロフィールから店舗を追加して、HIIDELでの管理を開始しましょう。
                  </p>
                  <AddStoreDialog
                    onStoreAdded={fetchStores}
                    existingStores={stores}
                  />
                </motion.div>
              )}

            {/* Search empty state */}
            {isGoogleConnected &&
              !isLoading &&
              stores.length > 0 &&
              filteredStores.length === 0 &&
              searchTerm && (
                <motion.div
                  className="flex flex-col items-center justify-center py-16 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-muted p-6 rounded-full mb-4">
                    <Store className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">
                    検索結果がありません
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    「{searchTerm}」に一致する店舗が見つかりませんでした。
                  </p>
                </motion.div>
              )}
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
