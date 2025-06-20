import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

interface LoadingStateProps extends LoadingSpinnerProps {
  message?: string;
  center?: boolean;
}

interface InlineLoadingProps extends LoadingSpinnerProps {
  text?: string;
}

// サイズ設定
const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

// 基本的なスピナー
export function LoadingSpinner({
  size = "md",
  className,
}: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn("animate-spin text-primary", sizeClasses[size], className)}
    />
  );
}

// ページ全体のローディング状態
export function LoadingState({
  size = "lg",
  message = "読み込み中...",
  center = true,
  className,
}: LoadingStateProps) {
  const containerClasses = center
    ? "flex flex-col items-center justify-center py-12"
    : "flex flex-col items-center py-8";

  return (
    <div className={cn(containerClasses, className)}>
      <LoadingSpinner size={size} className="mb-3" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// インラインローディング（ボタン内など）
export function InlineLoading({
  size = "sm",
  text = "処理中...",
  className,
}: InlineLoadingProps) {
  return (
    <span className={cn("flex items-center", className)}>
      <LoadingSpinner size={size} className="mr-2" />
      {text}
    </span>
  );
}

// カード内のローディング
export function CardLoading({
  size = "md",
  message = "データを取得中...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8",
        className
      )}
    >
      <LoadingSpinner size={size} className="mb-2" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// フルスクリーンローディング
export function FullScreenLoading({
  size = "xl",
  message = "読み込み中...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center",
        className
      )}
    >
      <div className="flex flex-col items-center">
        <LoadingSpinner size={size} className="mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
