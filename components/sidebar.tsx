"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BarChart3,
  Home,
  LogOut,
  MessageSquare,
  QrCode,
  Settings,
  Store,
  Users,
  Globe,
  HelpCircle,
  Shield,
  User,
  CreditCard,
  Bell,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

interface SidebarProps {
  currentPath: string;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active?: boolean;
}

function NavItem({ icon, label, href, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-2 mx-3 rounded-xl text-sm font-medium transition-all duration-200 relative group",
        active
          ? "bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-900/30 dark:text-blue-300"
          : "text-gray-700 hover:text-gray-900 hover:bg-white/60 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700/50"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0",
          active ? "text-blue-700 dark:text-blue-300" : "text-gray-500"
        )}
      >
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

export function Sidebar({ currentPath }: SidebarProps) {
  const { data: session } = useSession();
  const [profileImage, setProfileImage] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          setProfileImage(data.profile.profileImage || "");
          setUserName(data.profile.name || session?.user?.name || "");
        }
      } catch (error) {
        console.error("プロフィール取得エラー:", error);
      }
    };

    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/auth/signin" });
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full fixed w-64 bg-gradient-to-b from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800 border-r border-gray-200/50 dark:border-gray-700/50">
      <div className="h-16 flex items-center px-6 border-b border-gray-200/30 dark:border-gray-700/30">
        <Logo />
      </div>

      <nav className="flex-1 py-6 overflow-y-auto">
        <div className="space-y-2">
          <NavItem
            icon={<Home size={18} />}
            label="ホーム"
            href="/"
            active={currentPath === "/"}
          />
          <NavItem
            icon={<Store size={18} />}
            label="店舗一覧"
            href="/stores"
            active={currentPath === "/stores"}
          />
          <NavItem
            icon={<MessageSquare size={18} />}
            label="クチコミ一覧"
            href="/reviews"
            active={currentPath === "/reviews"}
          />
          <NavItem
            icon={<Users size={18} />}
            label="アンケート"
            href="/surveys"
            active={currentPath === "/surveys"}
          />
          <NavItem
            icon={<Settings size={18} />}
            label="返信の設定"
            href="/settings"
            active={currentPath === "/settings"}
          />
          <NavItem
            icon={<HelpCircle size={18} />}
            label="ヘルプ・サポート"
            href="/help"
            active={currentPath === "/help"}
          />
        </div>

        <div className="mt-8 mb-4 px-6">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            ツール
          </div>
        </div>
        <div className="space-y-2">
          <NavItem
            icon={<QrCode size={18} />}
            label="QRコード管理"
            href="/qr-codes"
            active={currentPath === "/qr-codes"}
          />
          <NavItem
            icon={<BarChart3 size={18} />}
            label="分析ダッシュボード"
            href="/analytics"
            active={currentPath === "/analytics"}
          />
        </div>

        <div className="mt-8 mb-4 px-6">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Google連携
          </div>
        </div>
        <div className="space-y-2">
          <NavItem
            icon={<Globe size={18} />}
            label="GBP連携設定"
            href="/google-business/connect"
            active={currentPath === "/google-business/connect"}
          />
        </div>

        {/* 管理者メニュー */}
        {session?.user?.role === "admin" && (
          <>
            <div className="mt-8 mb-4 px-6">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                管理者機能
              </div>
            </div>
            <div className="space-y-2">
              <NavItem
                icon={<Shield size={18} />}
                label="運用管理"
                href="/admin"
                active={
                  currentPath === "/admin" || currentPath.startsWith("/admin/")
                }
              />
            </div>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200/30 dark:border-gray-700/30">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center gap-3 p-3 hover:bg-white/60 dark:hover:bg-gray-700/50 rounded-xl"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={profileImage} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm font-medium">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {userName || session?.user?.name || "ユーザー"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {session?.user?.email || "m@example.com"}
                </div>
              </div>
              <MoreHorizontal size={16} className="text-gray-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 p-0"
            align="end"
            side="right"
            sideOffset={8}
          >
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profileImage} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-medium">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {userName || session?.user?.name || "ユーザー"}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {session?.user?.email || "m@example.com"}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="p-2">
              <Link href="/profile">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-sm"
                >
                  <User size={16} />
                  アカウント
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm"
                disabled
              >
                <CreditCard size={16} />
                請求情報
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm"
                disabled
              >
                <Bell size={16} />
                通知設定
              </Button>
            </div>

            <Separator />

            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                ログアウト
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
