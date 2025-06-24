import { cn } from "@/lib/utils";
import React from "react";

// 基本のスケルトンコンポーネント
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// シャインエフェクト付きスケルトン
function SkeletonWithShine({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-muted", className)}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// テキストスケルトン
interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  lineHeight?: "sm" | "md" | "lg";
  lastLineWidth?: string;
}

function SkeletonText({
  lines = 1,
  lineHeight = "md",
  lastLineWidth = "100%",
  className,
  ...props
}: SkeletonTextProps) {
  const heights = {
    sm: "h-3",
    md: "h-4",
    lg: "h-5",
  };

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonWithShine
          key={index}
          className={cn(
            heights[lineHeight],
            "rounded",
            index === lines - 1 && lines > 1 ? `w-[${lastLineWidth}]` : "w-full"
          )}
          style={
            index === lines - 1 && lines > 1
              ? { width: lastLineWidth }
              : undefined
          }
        />
      ))}
    </div>
  );
}

// アバタースケルトン
interface SkeletonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "square";
}

function SkeletonAvatar({
  size = "md",
  shape = "circle",
  className,
  ...props
}: SkeletonAvatarProps) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <SkeletonWithShine
      className={cn(
        sizes[size],
        shape === "circle" ? "rounded-full" : "rounded-md",
        className
      )}
      {...props}
    />
  );
}

// カードスケルトン
interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  showHeader?: boolean;
  showFooter?: boolean;
  headerHeight?: string;
  contentHeight?: string;
  footerHeight?: string;
}

function SkeletonCard({
  showHeader = true,
  showFooter = false,
  headerHeight = "h-16",
  contentHeight = "h-32",
  footerHeight = "h-12",
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      className={cn("rounded-lg border bg-card p-6 space-y-4", className)}
      {...props}
    >
      {showHeader && (
        <div className="space-y-2">
          <SkeletonWithShine className="h-6 w-1/3 rounded" />
          <SkeletonWithShine className="h-4 w-2/3 rounded" />
        </div>
      )}
      <SkeletonWithShine className={cn(contentHeight, "w-full rounded")} />
      {showFooter && (
        <SkeletonWithShine className={cn(footerHeight, "w-full rounded")} />
      )}
    </div>
  );
}

// ボタンスケルトン
interface SkeletonButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "ghost";
}

function SkeletonButton({
  size = "md",
  variant = "default",
  className,
  ...props
}: SkeletonButtonProps) {
  const sizes = {
    sm: "h-8 w-20",
    md: "h-10 w-24",
    lg: "h-12 w-32",
  };

  const variants = {
    default: "bg-muted",
    outline: "bg-transparent border-2 border-muted",
    ghost: "bg-muted/50",
  };

  return (
    <SkeletonWithShine
      className={cn(sizes[size], variants[variant], "rounded-md", className)}
      {...props}
    />
  );
}

// テーブル行スケルトン
interface SkeletonTableRowProps
  extends React.HTMLAttributes<HTMLTableRowElement> {
  columns?: number;
  showActions?: boolean;
}

function SkeletonTableRow({
  columns = 4,
  showActions = false,
  className,
  ...props
}: SkeletonTableRowProps) {
  return (
    <tr className={cn("border-b", className)} {...props}>
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="p-4">
          <SkeletonWithShine className="h-4 w-full rounded" />
        </td>
      ))}
      {showActions && (
        <td className="p-4">
          <div className="flex gap-2 justify-end">
            <SkeletonWithShine className="h-8 w-8 rounded" />
            <SkeletonWithShine className="h-8 w-8 rounded" />
          </div>
        </td>
      )}
    </tr>
  );
}

// 統計カードスケルトン
interface SkeletonStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  showIcon?: boolean;
  showTrend?: boolean;
}

function SkeletonStatCard({
  showIcon = true,
  showTrend = false,
  className,
  ...props
}: SkeletonStatCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)} {...props}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonText lines={1} lineHeight="sm" className="w-1/2" />
        {showIcon && <SkeletonWithShine className="h-8 w-8 rounded" />}
      </div>
      <SkeletonWithShine className="h-8 w-24 rounded mb-2" />
      {showTrend && (
        <div className="flex items-center gap-2">
          <SkeletonWithShine className="h-4 w-4 rounded" />
          <SkeletonText lines={1} lineHeight="sm" className="w-16" />
        </div>
      )}
    </div>
  );
}

// リストアイテムスケルトン
interface SkeletonListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  showAvatar?: boolean;
  showDescription?: boolean;
  showActions?: boolean;
}

function SkeletonListItem({
  showAvatar = true,
  showDescription = true,
  showActions = false,
  className,
  ...props
}: SkeletonListItemProps) {
  return (
    <div
      className={cn("flex items-start gap-4 p-4 rounded-lg", className)}
      {...props}
    >
      {showAvatar && <SkeletonAvatar size="md" />}
      <div className="flex-1 space-y-2">
        <SkeletonText lines={1} lineHeight="md" className="w-1/3" />
        {showDescription && (
          <SkeletonText lines={2} lineHeight="sm" lastLineWidth="80%" />
        )}
      </div>
      {showActions && (
        <div className="flex gap-2">
          <SkeletonButton size="sm" />
        </div>
      )}
    </div>
  );
}

// グラフスケルトン
interface SkeletonChartProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: string;
  showLegend?: boolean;
}

function SkeletonChart({
  height = "h-64",
  showLegend = true,
  className,
  ...props
}: SkeletonChartProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {showLegend && (
        <div className="flex gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <SkeletonWithShine className="h-3 w-3 rounded-full" />
              <SkeletonText lines={1} lineHeight="sm" className="w-16" />
            </div>
          ))}
        </div>
      )}
      <SkeletonWithShine className={cn(height, "w-full rounded")} />
    </div>
  );
}

export {
  Skeleton,
  SkeletonWithShine,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonButton,
  SkeletonTableRow,
  SkeletonStatCard,
  SkeletonListItem,
  SkeletonChart,
};
