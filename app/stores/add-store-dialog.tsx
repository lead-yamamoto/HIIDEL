"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  MapPin,
  Phone,
  Globe,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Info,
  ExternalLink,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface GoogleLocation {
  name: string;
  displayName: string;
  title?: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
    country?: string;
  };
  primaryPhone?: string;
  websiteUri?: string;
  primaryCategory?: {
    displayName?: string;
  };
  regularHours?: {
    periods?: Array<{
      openDay?: string;
      openTime?: string;
      closeDay?: string;
      closeTime?: string;
    }>;
  };
}

interface ApiResponse {
  locations: GoogleLocation[];
  count: number;
  isMockData: boolean;
  isApiAccessible: boolean;
  userEmail: string;
  message: string;
  errorDetails?: {
    status?: number;
    error?: string;
  };
  setupInstructions?: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
  };
}

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
}

interface AddStoreDialogProps {
  onStoreAdded: () => void;
  existingStores: Store[];
}

export default function AddStoreDialog({
  onStoreAdded,
  existingStores,
}: AddStoreDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [googleLocations, setGoogleLocations] = useState<GoogleLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  // 既に追加済みかどうかをチェックする関数
  const isStoreAlreadyAdded = (googleLocationId: string) => {
    return existingStores.some(
      (store) => store.googleLocationId === googleLocationId
    );
  };

  // フィルタリングされたGoogle位置情報（検索条件のみでフィルタリング、追加済み店舗も表示）
  const filteredGoogleLocations = googleLocations.filter((location) => {
    const matchesSearch =
      searchTerm === "" ||
      (location.title || location.displayName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      formatAddress(location.storefrontAddress)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // 統計情報を計算
  const totalLocations = googleLocations.length;
  const addedStores = googleLocations.filter((location) =>
    isStoreAlreadyAdded(location.name)
  ).length;
  const availableStores = totalLocations - addedStores;

  useEffect(() => {
    if (isOpen) {
      fetchGoogleLocations();
    }
  }, [isOpen]);

  const fetchGoogleLocations = async () => {
    setIsLoading(true);
    setError("");

    try {
      console.log("🔍 Fetching available Google locations...");
      const response = await fetch("/api/google/locations");

      if (!response.ok) {
        throw new Error("Google認証が必要です");
      }

      const data: ApiResponse = await response.json();
      console.log("📋 Google locations received:", data);

      // デバッグ：各店舗のフィールドを確認
      if (data.locations && data.locations.length > 0) {
        console.log("🔍 First location fields:", {
          name: data.locations[0].name,
          title: data.locations[0].title,
          displayName: data.locations[0].displayName,
          allKeys: Object.keys(data.locations[0]),
        });
      }

      setGoogleLocations(data.locations || []);
      setApiResponse(data);

      if (data.errorDetails?.status === 403) {
        setShowSetupInstructions(true);
      }
    } catch (error) {
      console.error("❌ Failed to fetch Google locations:", error);
      setError("Google店舗情報の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const addStore = async (location: GoogleLocation) => {
    setIsAdding(true);
    setError("");
    setSuccessMessage("");

    try {
      console.log("➕ Adding store:", location.displayName);

      const address =
        location.storefrontAddress?.addressLines?.join(", ") || "住所未設定";

      const response = await fetch("/api/stores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          googleLocationId: location.name,
          displayName: location.title || location.displayName || "店舗名未設定",
          address: address,
          phone: location.primaryPhone,
          website: location.websiteUri,
          category: location.primaryCategory?.displayName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "店舗の追加に失敗しました");
      }

      const result = await response.json();
      console.log("✅ Store added successfully:", result);

      setSuccessMessage(
        `${
          location.title || location.displayName || "店舗"
        } を正常に追加しました！`
      );

      // 即座に親コンポーネントを更新
      console.log("🔄 Calling onStoreAdded to refresh store list...");
      onStoreAdded();

      // 2秒後にダイアログを閉じる
      setTimeout(() => {
        setIsOpen(false);
        setSuccessMessage("");
      }, 2000);
    } catch (error) {
      console.error("💥 Error adding store:", error);
      setError(
        error instanceof Error ? error.message : "店舗の追加に失敗しました"
      );
    } finally {
      setIsAdding(false);
    }
  };

  const formatAddress = (address?: GoogleLocation["storefrontAddress"]) => {
    if (!address) return "住所未設定";

    const parts = [];
    if (address.addressLines) parts.push(...address.addressLines);
    if (address.locality) parts.push(address.locality);
    if (address.administrativeArea) parts.push(address.administrativeArea);
    if (address.postalCode) parts.push(address.postalCode);

    return parts.join(", ") || "住所未設定";
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none">
          <Plus size={16} className="mr-2" /> 店舗を追加
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Google Business Profileから店舗を追加</DialogTitle>
          <DialogDescription>
            連携されたGoogleビジネスプロフィールから店舗を選択して、HIIDELに追加できます。
            {!isLoading && googleLocations.length > 0 && (
              <div className="mt-2 text-sm text-muted-foreground">
                総店舗数: {googleLocations.length}件 / 追加可能:{" "}
                {filteredGoogleLocations.length}件 / 追加済み:{" "}
                {googleLocations.length - filteredGoogleLocations.length}件
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="店舗名または住所で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 統計情報 */}
        {!isLoading && totalLocations > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-sm">店舗統計</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {totalLocations}
                </div>
                <div className="text-xs text-muted-foreground">総店舗数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {availableStores}
                </div>
                <div className="text-xs text-muted-foreground">追加可能</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {addedStores}
                </div>
                <div className="text-xs text-muted-foreground">追加済み</div>
              </div>
            </div>
            {addedStores > 0 && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                💡 追加済み店舗は「追加済み」として表示されます
              </div>
            )}
          </div>
        )}

        {/* API Status */}
        {apiResponse && !isLoading && (
          <div className="space-y-3">
            {/* API Access Status */}
            <Alert
              className={
                apiResponse.isMockData
                  ? "border-blue-200 bg-blue-50"
                  : "border-green-200 bg-green-50"
              }
            >
              <Info
                className={`h-4 w-4 ${
                  apiResponse.isMockData ? "text-blue-600" : "text-green-600"
                }`}
              />
              <AlertDescription
                className={
                  apiResponse.isMockData ? "text-blue-700" : "text-green-700"
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <strong>
                      {apiResponse.isMockData
                        ? "🧪 テストモード"
                        : "✅ 本番APIモード"}
                    </strong>
                    <div className="mt-1 text-sm">{apiResponse.message}</div>
                    {apiResponse.userEmail && (
                      <div className="mt-1 text-xs opacity-75">
                        連携アカウント: {apiResponse.userEmail}
                      </div>
                    )}
                  </div>
                  {apiResponse.isMockData &&
                    apiResponse.errorDetails?.status === 403 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setShowSetupInstructions(!showSetupInstructions)
                        }
                        className="ml-3"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        設定ガイド
                      </Button>
                    )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Setup Instructions */}
            {showSetupInstructions && apiResponse.setupInstructions && (
              <Collapsible
                open={showSetupInstructions}
                onOpenChange={setShowSetupInstructions}
              >
                <CollapsibleContent>
                  <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-orange-900 flex items-center gap-2">
                        <HelpCircle className="h-5 w-5" />
                        Google Business Profile API 設定手順
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-orange-800 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="bg-orange-200 text-orange-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            1
                          </span>
                          <div>
                            <a
                              href="https://console.cloud.google.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center"
                            >
                              Google Cloud Consoleにアクセス{" "}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="bg-orange-200 text-orange-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            2
                          </span>
                          <div>プロジェクトを選択または作成</div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="bg-orange-200 text-orange-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            3
                          </span>
                          <div>
                            APIs &amp; Services &gt; Library から「Google My
                            Business API」を有効化
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="bg-orange-200 text-orange-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            4
                          </span>
                          <div>
                            OAuth 2.0の設定で以下のスコープを追加:{" "}
                            <code className="bg-orange-100 px-1 rounded">
                              https://www.googleapis.com/auth/business.manage
                            </code>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="bg-orange-200 text-orange-900 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            5
                          </span>
                          <div>
                            <a
                              href="https://business.google.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center"
                            >
                              Google Business Profileで店舗を登録・確認{" "}
                              <ExternalLink className="ml-1 h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>

                      {apiResponse.errorDetails && (
                        <div className="mt-4 p-3 bg-orange-100 rounded border">
                          <div className="text-sm font-medium text-orange-900">
                            エラー詳細:
                          </div>
                          <div className="text-sm text-orange-800 mt-1">
                            {apiResponse.errorDetails.status &&
                              `ステータス: ${apiResponse.errorDetails.status}`}
                            {apiResponse.errorDetails.error && (
                              <div className="mt-1">
                                <code className="text-xs bg-white p-1 rounded">
                                  {apiResponse.errorDetails.error}
                                </code>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  {successMessage}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-muted-foreground">
                Google店舗情報を読み込み中...
              </p>
            </div>
          </div>
        )}

        {/* Locations List */}
        {!isLoading && (
          <div className="flex-1 overflow-auto space-y-3">
            {filteredGoogleLocations.length > 0 ? (
              filteredGoogleLocations.map((location, index) => (
                <motion.div
                  key={location.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {location.title ||
                              location.displayName ||
                              "店舗名未設定"}
                            {apiResponse?.isMockData && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-600">
                                テスト
                              </span>
                            )}
                            {isStoreAlreadyAdded(location.name) && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                ✓ 追加済み
                              </span>
                            )}
                          </CardTitle>
                          {location.primaryCategory?.displayName && (
                            <CardDescription className="mt-1">
                              {location.primaryCategory.displayName}
                            </CardDescription>
                          )}
                        </div>
                        {isStoreAlreadyAdded(location.name) ? (
                          <Button
                            disabled
                            size="sm"
                            variant="outline"
                            className="ml-4 text-green-700 border-green-200 bg-green-50"
                          >
                            <CheckCircle size={14} className="mr-1" /> 追加済み
                          </Button>
                        ) : (
                          <Button
                            onClick={() => addStore(location)}
                            disabled={isAdding}
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-none ml-4"
                          >
                            {isAdding ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>
                                <Plus size={14} className="mr-1" /> 追加
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>
                            {formatAddress(location.storefrontAddress)}
                          </span>
                        </div>

                        {location.primaryPhone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>
                              {typeof location.primaryPhone === "string"
                                ? location.primaryPhone
                                : "電話番号あり"}
                            </span>
                          </div>
                        )}

                        {location.websiteUri && (
                          <div className="flex items-center">
                            <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
                            <a
                              href={location.websiteUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {location.websiteUri}
                            </a>
                          </div>
                        )}

                        {/* 営業時間は一時的に非表示 */}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-muted-foreground">
                  {searchTerm ? (
                    <div>
                      <p>検索結果がありません</p>
                      <p className="text-xs mt-2">
                        検索条件を変更してお試しください
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p>店舗情報がありません</p>
                      <p className="text-xs mt-2">
                        Google Business Profileで店舗を登録してください
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
