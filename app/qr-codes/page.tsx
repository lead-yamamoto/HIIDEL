"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Plus, QrCode, Share2, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { QRCodeDisplay } from "@/components/qr-code-display";
import { LoadingState, InlineLoading } from "@/components/ui/loading";

interface QRCode {
  id: string;
  storeId: string;
  name: string;
  type: "review" | "survey" | "contact";
  url: string;
  scans: number;
  createdAt: string;
}

interface Store {
  id: string;
  displayName: string;
  isTestStore: boolean;
}

interface Survey {
  id: string;
  title: string;
  shareUrl: string;
  isActive: boolean;
}

export default function QRCodesPage() {
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [qrName, setQRName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRCode, setSelectedQRCode] = useState<QRCode | null>(null);
  const [isQRPreviewOpen, setIsQRPreviewOpen] = useState(false);
  const [deletingQRCodeId, setDeletingQRCodeId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [qrCodeToDelete, setQRCodeToDelete] = useState<QRCode | null>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [mounted]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      console.log("📋 Fetching QR codes, stores, and surveys...");

      const [qrResponse, storesResponse, surveysResponse] = await Promise.all([
        fetch("/api/qr-codes"),
        fetch("/api/stores"),
        fetch("/api/surveys"),
      ]);

      if (qrResponse.ok) {
        const qrData = await qrResponse.json();
        setQRCodes(qrData.qrCodes || []);
      }

      if (storesResponse.ok) {
        const storesData = await storesResponse.json();
        console.log("📊 Stores data:", storesData);
        // storesDataが配列の場合とオブジェクトの場合に対応
        const storesArray = Array.isArray(storesData)
          ? storesData
          : storesData.stores || [];
        setStores(storesArray);
      }

      if (surveysResponse.ok) {
        const surveysData = await surveysResponse.json();
        console.log("📋 Surveys data:", surveysData);
        // surveysDataが配列の場合とオブジェクトの場合に対応
        const surveysArray = Array.isArray(surveysData)
          ? surveysData
          : surveysData.surveys || [];
        setSurveys(surveysArray);
      }

      console.log("✅ Data fetched successfully");
    } catch (error) {
      console.error("❌ Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createQRCode = async () => {
    if (!selectedType || !qrName) {
      return;
    }

    // タイプに応じて必要な選択項目をチェック
    if (selectedType === "survey" && !selectedSurvey) {
      return;
    }
    if (
      (selectedType === "review" || selectedType === "contact") &&
      !selectedStore
    ) {
      return;
    }

    try {
      setIsCreating(true);
      console.log("📝 Creating QR code...");

      let url = "";
      let storeId = "";

      if (selectedType === "survey") {
        const survey = surveys.find((s) => s.id === selectedSurvey);
        if (survey) {
          url = survey.shareUrl;
          storeId = "survey"; // アンケート専用のストアID
        }
      } else {
        url = `${window.location.origin}/${selectedType}/${selectedStore}`;
        storeId = selectedStore;
      }

      const response = await fetch("/api/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: storeId,
          name: qrName,
          type: selectedType,
          url: url,
          surveyId: selectedType === "survey" ? selectedSurvey : undefined,
        }),
      });

      if (response.ok) {
        console.log("✅ QR code created successfully");
        setIsCreateDialogOpen(false);
        setSelectedStore("");
        setSelectedSurvey("");
        setSelectedType("");
        setQRName("");
        await fetchData(); // データを再取得
      } else {
        const errorData = await response.json();
        console.error("❌ Failed to create QR code:", errorData);
        setError(
          `QRコードの作成に失敗しました: ${errorData.error || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("💥 Error creating QR code:", error);
      setError(
        `エラーが発生しました: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsCreating(false);
    }
  };

  const generateQRCode = () => {
    if (!selectedStore || !selectedType) {
      setError("店舗とタイプを選択してください");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const url = `${window.location.origin}/${selectedType}/${selectedStore}`;
      setGeneratedUrl(url);
      setShowQRCode(true);
    } catch (error) {
      setError("QRコードの生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredQRCodes = searchTerm
    ? qrCodes.filter(
        (qrCode) =>
          qrCode.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          qrCode.type.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : qrCodes;

  const downloadQRCode = (id: string) => {
    const qrCode = qrCodes.find((qr) => qr.id === id);
    if (qrCode) {
      setSelectedQRCode(qrCode);
      setIsQRPreviewOpen(true);
    }
  };

  const shareQRCode = (id: string) => {
    const qrCode = qrCodes.find((qr) => qr.id === id);
    if (qrCode) {
      setSelectedQRCode(qrCode);
      setIsQRPreviewOpen(true);
    }
  };

  const previewQRCode = (qrCode: QRCode) => {
    setSelectedQRCode(qrCode);
    setIsQRPreviewOpen(true);
  };

  const confirmDeleteQRCode = (qrCode: QRCode) => {
    setQRCodeToDelete(qrCode);
    setIsDeleteDialogOpen(true);
  };

  const deleteQRCode = async () => {
    if (!qrCodeToDelete) return;

    try {
      setDeletingQRCodeId(qrCodeToDelete.id);
      console.log(`🗑️ Deleting QR code: ${qrCodeToDelete.name}`);

      const response = await fetch(`/api/qr-codes?id=${qrCodeToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        console.log("✅ QR code deleted successfully");
        await fetchData(); // データを再取得
        setIsDeleteDialogOpen(false);
        setQRCodeToDelete(null);
      } else {
        console.error("❌ Failed to delete QR code");
      }
    } catch (error) {
      console.error("💥 Error deleting QR code:", error);
    } finally {
      setDeletingQRCodeId(null);
    }
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    return store ? store.displayName : "不明な店舗";
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "review":
        return "Googleレビュー";
      case "survey":
        return "アンケート";
      case "contact":
        return "お問い合わせ";
      default:
        return type;
    }
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <div className="hidden md:block w-64">
          <Sidebar currentPath="/qr-codes" />
        </div>
        <div className="flex-1 flex flex-col">
          <MobileHeader
            title="QRコード管理"
            currentPath="/qr-codes"
            searchPlaceholder="QRコードを検索..."
            backUrl="/"
          />
          <div className="flex-1 flex items-center justify-center">
            <LoadingState message="QRコードデータを読み込み中..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar currentPath="/qr-codes" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <MobileHeader
          title="QRコード管理"
          currentPath="/qr-codes"
          searchPlaceholder="QRコードを検索..."
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
                QRコード管理
              </motion.h1>
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none"
                    disabled={stores.length === 0 && surveys.length === 0}
                  >
                    <Plus size={16} className="mr-2" /> QRコードを作成
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>新しいQRコードを作成</DialogTitle>
                    <DialogDescription>
                      種類を選択して、新しいQRコードを作成します。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="type" className="text-right">
                        種類
                      </Label>
                      <Select
                        value={selectedType}
                        onValueChange={(value) => {
                          setSelectedType(value);
                          setSelectedStore("");
                          setSelectedSurvey("");
                        }}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="種類を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="review">Googleレビュー</SelectItem>
                          <SelectItem value="survey">アンケート</SelectItem>
                          <SelectItem value="contact">お問い合わせ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 店舗選択（review/contactタイプの場合のみ表示） */}
                    {(selectedType === "review" ||
                      selectedType === "contact") && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="store" className="text-right">
                          店舗
                        </Label>
                        <Select
                          value={selectedStore}
                          onValueChange={setSelectedStore}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="店舗を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {stores.map((store) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.displayName}
                                {store.isTestStore && " (テスト)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* アンケート選択（surveyタイプの場合のみ表示） */}
                    {selectedType === "survey" && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="survey" className="text-right">
                          アンケート
                        </Label>
                        <Select
                          value={selectedSurvey}
                          onValueChange={setSelectedSurvey}
                        >
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="アンケートを選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {surveys
                              .filter((survey) => survey.isActive)
                              .map((survey) => (
                                <SelectItem key={survey.id} value={survey.id}>
                                  {survey.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        名前
                      </Label>
                      <Input
                        id="name"
                        placeholder="QRコードの名前"
                        className="col-span-3"
                        value={qrName}
                        onChange={(e) => setQRName(e.target.value)}
                      />
                    </div>
                  </div>
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                      <div className="text-red-700 text-sm">{error}</div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button
                      type="submit"
                      onClick={() => {
                        setError("");
                        createQRCode();
                      }}
                      disabled={
                        !selectedType ||
                        !qrName ||
                        isCreating ||
                        (selectedType === "survey" && !selectedSurvey) ||
                        ((selectedType === "review" ||
                          selectedType === "contact") &&
                          !selectedStore)
                      }
                    >
                      {isCreating ? <InlineLoading text="作成中..." /> : "作成"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {qrCodes.length === 0 ? (
              <Card className="p-8 text-center">
                <CardContent>
                  <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">
                    QRコードがありません
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {stores.length === 0 && surveys.length === 0
                      ? "まず店舗を追加するか、アンケートを作成してから、QRコードを作成してください。"
                      : "最初のQRコードを作成して、顧客とのエンゲージメントを開始しましょう。"}
                  </p>
                  {(stores.length > 0 || surveys.length > 0) && (
                    <Button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      QRコードを作成
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                <Tabs defaultValue="all" className="w-full mb-6">
                  <TabsList>
                    <TabsTrigger value="all">
                      すべて ({qrCodes.length})
                    </TabsTrigger>
                    <TabsTrigger value="review">
                      Googleレビュー (
                      {qrCodes.filter((q) => q.type === "review").length})
                    </TabsTrigger>
                    <TabsTrigger value="survey">
                      アンケート (
                      {qrCodes.filter((q) => q.type === "survey").length})
                    </TabsTrigger>
                    <TabsTrigger value="contact">
                      お問い合わせ (
                      {qrCodes.filter((q) => q.type === "contact").length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <QRCodeGrid
                      qrCodes={filteredQRCodes}
                      onDownload={downloadQRCode}
                      onShare={shareQRCode}
                      onPreview={previewQRCode}
                      onDelete={confirmDeleteQRCode}
                      getStoreName={getStoreName}
                      getTypeLabel={getTypeLabel}
                      deletingQRCodeId={deletingQRCodeId}
                    />
                  </TabsContent>

                  <TabsContent value="review">
                    <QRCodeGrid
                      qrCodes={filteredQRCodes.filter(
                        (q) => q.type === "review"
                      )}
                      onDownload={downloadQRCode}
                      onShare={shareQRCode}
                      onPreview={previewQRCode}
                      onDelete={confirmDeleteQRCode}
                      getStoreName={getStoreName}
                      getTypeLabel={getTypeLabel}
                      deletingQRCodeId={deletingQRCodeId}
                    />
                  </TabsContent>

                  <TabsContent value="survey">
                    <QRCodeGrid
                      qrCodes={filteredQRCodes.filter(
                        (q) => q.type === "survey"
                      )}
                      onDownload={downloadQRCode}
                      onShare={shareQRCode}
                      onPreview={previewQRCode}
                      onDelete={confirmDeleteQRCode}
                      getStoreName={getStoreName}
                      getTypeLabel={getTypeLabel}
                      deletingQRCodeId={deletingQRCodeId}
                    />
                  </TabsContent>

                  <TabsContent value="contact">
                    <QRCodeGrid
                      qrCodes={filteredQRCodes.filter(
                        (q) => q.type === "contact"
                      )}
                      onDownload={downloadQRCode}
                      onShare={shareQRCode}
                      onPreview={previewQRCode}
                      onDelete={confirmDeleteQRCode}
                      getStoreName={getStoreName}
                      getTypeLabel={getTypeLabel}
                      deletingQRCodeId={deletingQRCodeId}
                    />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>

        {/* QRコードプレビューダイアログ */}
        <Dialog open={isQRPreviewOpen} onOpenChange={setIsQRPreviewOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>QRコード</DialogTitle>
              <DialogDescription>{selectedQRCode?.name}</DialogDescription>
            </DialogHeader>
            {selectedQRCode && (
              <QRCodeDisplay
                url={selectedQRCode.url}
                title={selectedQRCode.name}
                size={200}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* QRコード削除確認ダイアログ */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>QRコードを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                「{qrCodeToDelete?.name}」を削除します。
                <br />
                この操作は取り消すことができません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteQRCode}
                className="bg-red-600 hover:bg-red-700"
                disabled={!!deletingQRCodeId}
              >
                {deletingQRCodeId === qrCodeToDelete?.id ? (
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

interface QRCodeGridProps {
  qrCodes: QRCode[];
  onDownload: (id: string) => void;
  onShare: (id: string) => void;
  onPreview: (qrCode: QRCode) => void;
  onDelete: (qrCode: QRCode) => void;
  getStoreName: (storeId: string) => string;
  getTypeLabel: (type: string) => string;
  deletingQRCodeId: string | null;
}

function QRCodeGrid({
  qrCodes,
  onDownload,
  onShare,
  onPreview,
  onDelete,
  getStoreName,
  getTypeLabel,
  deletingQRCodeId,
}: QRCodeGridProps) {
  if (qrCodes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">
            該当するQRコードがありません
          </h3>
          <p className="text-gray-600">
            フィルターを変更するか、新しいQRコードを作成してください。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {qrCodes.map((qrCode, index) => (
        <motion.div
          key={qrCode.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
        >
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-medium text-lg mb-1 line-clamp-2">
                    {qrCode.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1">
                    {getStoreName(qrCode.storeId)}
                  </p>
                  <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {getTypeLabel(qrCode.type)}
                  </span>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <div
                    className="w-16 h-16 bg-gray-100 border-2 border-gray-300 rounded flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => onPreview(qrCode)}
                  >
                    <QrCode className="h-8 w-8 text-gray-500" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>スキャン数: {qrCode.scans}</span>
                <span>
                  作成日:{" "}
                  {new Date(qrCode.createdAt).toLocaleDateString("ja-JP")}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPreview(qrCode)}
                  className="flex-1"
                >
                  <QrCode size={14} className="mr-1" />
                  表示
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownload(qrCode.id)}
                  className="flex-1"
                >
                  <Download size={14} className="mr-1" />
                  DL
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShare(qrCode.id)}
                  className="flex-1"
                >
                  <Share2 size={14} className="mr-1" />
                  共有
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(qrCode)}
                  disabled={deletingQRCodeId === qrCode.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {deletingQRCodeId === qrCode.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
