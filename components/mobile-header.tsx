"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/sidebar";
import {
  Menu,
  Home,
  Store,
  MessageSquare,
  BarChart3,
  QrCode,
  ClipboardList,
  Settings,
  LogOut,
  User,
  ArrowLeft,
  Bell,
  Search,
  HelpCircle,
  Globe,
} from "lucide-react";

interface MobileHeaderProps {
  title: string;
  currentPath: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  showBackButton?: boolean;
  backUrl?: string;
}

interface SearchItem {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  icon: React.ReactNode;
  keywords: string[];
}

export function MobileHeader({
  title,
  currentPath,
  searchPlaceholder = "検索...",
  onSearchChange,
  searchValue = "",
  showBackButton = true,
  backUrl = "/",
}: MobileHeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // 検索可能なアイテムの定義
  const searchItems: SearchItem[] = [
    {
      id: "home",
      title: "ホーム",
      description: "ダッシュボードとメイン画面",
      url: "/",
      category: "メインメニュー",
      icon: <Home size={16} />,
      keywords: ["ホーム", "ダッシュボード", "メイン", "home", "dashboard"],
    },
    {
      id: "stores",
      title: "店舗一覧",
      description: "店舗の管理と追加",
      url: "/stores",
      category: "メインメニュー",
      icon: <Store size={16} />,
      keywords: ["店舗", "ストア", "店", "管理", "追加", "store", "shop"],
    },
    {
      id: "reviews",
      title: "クチコミ一覧",
      description: "レビューの確認と管理",
      url: "/reviews",
      category: "メインメニュー",
      icon: <MessageSquare size={16} />,
      keywords: [
        "クチコミ",
        "レビュー",
        "口コミ",
        "評価",
        "review",
        "feedback",
      ],
    },
    {
      id: "surveys",
      title: "アンケート",
      description: "アンケートの作成と管理",
      url: "/surveys",
      category: "メインメニュー",
      icon: <User size={16} />,
      keywords: [
        "アンケート",
        "調査",
        "フィードバック",
        "survey",
        "questionnaire",
      ],
    },
    {
      id: "qr-codes",
      title: "QRコード管理",
      description: "QRコードの作成と管理",
      url: "/qr-codes",
      category: "ツール",
      icon: <QrCode size={16} />,
      keywords: ["QR", "QRコード", "コード", "生成", "作成", "qr code"],
    },
    {
      id: "analytics",
      title: "分析ダッシュボード",
      description: "データ分析と統計情報",
      url: "/analytics",
      category: "ツール",
      icon: <BarChart3 size={16} />,
      keywords: [
        "分析",
        "統計",
        "データ",
        "グラフ",
        "analytics",
        "chart",
        "data",
      ],
    },
    {
      id: "settings",
      title: "返信の設定",
      description: "自動返信とテンプレート設定",
      url: "/settings",
      category: "設定",
      icon: <Settings size={16} />,
      keywords: ["設定", "返信", "テンプレート", "自動", "settings", "reply"],
    },
    {
      id: "profile",
      title: "プロフィール設定",
      description: "アカウント情報の管理",
      url: "/profile",
      category: "設定",
      icon: <User size={16} />,
      keywords: ["プロフィール", "アカウント", "設定", "profile", "account"],
    },
    {
      id: "help",
      title: "ヘルプ・サポート",
      description: "使い方ガイドとサポート",
      url: "/help",
      category: "サポート",
      icon: <HelpCircle size={16} />,
      keywords: [
        "ヘルプ",
        "サポート",
        "使い方",
        "ガイド",
        "help",
        "support",
        "guide",
      ],
    },
    {
      id: "google-connect",
      title: "Google連携設定",
      description: "Google Business Profileとの連携",
      url: "/google-business/connect",
      category: "Google連携",
      icon: <Globe size={16} />,
      keywords: [
        "Google",
        "連携",
        "接続",
        "API",
        "google",
        "connect",
        "integration",
      ],
    },
  ];

  // 検索ロジック
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const filtered = searchItems.filter(
        (item) =>
          item.keywords.some((keyword) =>
            keyword.toLowerCase().includes(searchQuery.toLowerCase())
          ) ||
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchQuery]);

  // クリック外しで検索結果を非表示
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleSearchItemClick = (url: string) => {
    setShowResults(false);
    setSearchQuery("");
    router.push(url);
  };

  const groupedResults = searchResults.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  return (
    <header className="h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-10 flex items-center px-4 justify-between">
      <div className="flex items-center md:w-64">
        {/* Mobile menu trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden mr-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r">
            <Sidebar currentPath={currentPath} />
          </SheetContent>
        </Sheet>

        {/* Back button */}
        {showBackButton && (
          <Button variant="ghost" size="icon" className="mr-2" asChild>
            <Link href={backUrl}>
              <ArrowLeft size={18} />
            </Link>
          </Button>
        )}

        <h1 className="text-lg font-medium hidden md:block">{title}</h1>
      </div>

      <div className="flex-1 max-w-md mx-4 relative" ref={searchRef}>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
            size={16}
          />
          <Input
            className="pl-10 h-10 bg-muted/50 rounded-full focus-visible:ring-2 focus-visible:ring-primary"
            placeholder={onSearchChange ? searchPlaceholder : "クイック検索..."}
            value={onSearchChange ? searchValue : searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* 検索結果ドロップダウン */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-96 overflow-y-auto z-50 mt-1">
            {Object.entries(groupedResults).map(([category, items]) => (
              <div key={category}>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/50 border-b">
                  {category}
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSearchItemClick(item.url)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                  >
                    <div className="text-muted-foreground">{item.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 検索結果なし */}
        {showResults &&
          searchQuery.length >= 2 &&
          searchResults.length === 0 && (
            <div className="absolute top-12 left-0 right-0 bg-background border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground">
              「{searchQuery}」に一致する結果が見つかりませんでした
            </div>
          )}
      </div>

      <div className="flex items-center gap-3">
        <Link href="/help">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-foreground"
            title="ヘルプ・サポート"
          >
            <HelpCircle size={18} />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:text-foreground"
        >
          <Bell size={18} />
        </Button>
      </div>
    </header>
  );
}
