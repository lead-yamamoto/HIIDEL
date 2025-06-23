"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2 } from "lucide-react";

interface QRCodeDisplayProps {
  url: string;
  title: string;
  size?: number;
}

export function QRCodeDisplay({ url, title, size = 256 }: QRCodeDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [qrCodeStyling, setQrCodeStyling] = useState<any>(null);

  // マウント後にテーマ情報が利用可能になるまで待つ
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && containerRef.current && url) {
      const loadQRCodeStyling = async () => {
        // 動的インポート（ブラウザ環境でのみ実行）
        const QRCodeStyling = (await import("qr-code-styling")).default;

        const qrCode = new QRCodeStyling({
          width: size,
          height: size,
          type: "canvas",
          data: url,
          margin: 10,
          qrOptions: {
            typeNumber: 0,
            mode: "Byte",
            errorCorrectionLevel: "M",
          },
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.4,
            margin: 0,
          },
          dotsOptions: {
            color: "#000000",
            type: "dots", // 点型（丸型）ドット
          },
          backgroundOptions: {
            color: "#FFFFFF",
          },
          cornersSquareOptions: {
            color: "#000000",
            type: "extra-rounded", // 角の四角をより丸く
          },
          cornersDotOptions: {
            color: "#000000",
            type: "dot", // 角のドットも丸型
          },
        });

        // 前のQRコードをクリア
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          qrCode.append(containerRef.current);
        }

        setQrCodeStyling(qrCode);
      };

      loadQRCodeStyling();
    }
  }, [url, size, mounted]);

  const downloadQRCode = async () => {
    if (isDownloading || !qrCodeStyling) return;

    setIsDownloading(true);
    try {
      await qrCodeStyling.download({
        name: `${title.replace(/[^a-zA-Z0-9]/g, "_")}_QRCode`,
        extension: "png",
      });
    } catch (error) {
      console.error("ダウンロードに失敗しました:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const shareQRCode = async () => {
    if (isSharing || !qrCodeStyling) return;

    setIsSharing(true);

    try {
      if (navigator.share) {
        // QRコード画像をBlobとして取得
        const blob = await qrCodeStyling.getRawData("png");

        if (blob) {
          const file = new File([blob], `${title}_QRCode.png`, {
            type: "image/png",
          });

          // Web Share APIでファイル共有をサポートしているかチェック
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${title} - QRコード`,
              text: `${title}のQRコードです`,
              files: [file],
            });
          } else {
            // ファイル共有がサポートされていない場合、URLのみ共有
            await navigator.share({
              title: `${title} - QRコード`,
              text: `${title}のQRコードです`,
              url: url,
            });
          }
        } else {
          throw new Error("QRコード画像の生成に失敗しました");
        }
      } else {
        // Web Share APIがサポートされていない場合のフォールバック
        await navigator.clipboard.writeText(url);
        alert("URLをクリップボードにコピーしました");
      }
    } catch (error: any) {
      console.error("シェアに失敗しました:", error);

      // エラーが「ユーザーによる中止」でない場合のみフォールバック実行
      if (error.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(url);
          alert("URLをクリップボードにコピーしました");
        } catch (clipboardError) {
          console.error(
            "クリップボードへのコピーも失敗しました:",
            clipboardError
          );
          alert("シェアに失敗しました。URLを手動でコピーしてください: " + url);
        }
      }
    } finally {
      setIsSharing(false);
    }
  };

  // テーマが読み込まれるまで何も表示しない
  if (!mounted) {
    return (
      <div className="flex flex-col items-center space-y-4 p-6">
        <div className="animate-pulse">
          <div className="h-64 w-64 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          QRコードをスキャンしてアクセス
        </p>
      </div>

      {/* QRコードコンテナ - ダークモード対応 */}
      <div className="bg-white dark:bg-white p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-300">
        <div ref={containerRef} className="flex justify-center" />
      </div>

      <div className="text-xs text-center text-muted-foreground max-w-md break-all px-2 py-1 bg-muted/30 rounded">
        {url}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={downloadQRCode}
          variant="outline"
          size="sm"
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <Download size={16} className="mr-2" />
          )}
          ダウンロード
        </Button>
        <Button
          onClick={shareQRCode}
          variant="outline"
          size="sm"
          disabled={isSharing}
        >
          {isSharing ? (
            <Loader2 size={16} className="mr-2 animate-spin" />
          ) : (
            <Share2 size={16} className="mr-2" />
          )}
          シェア
        </Button>
      </div>
    </div>
  );
}
