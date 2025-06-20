"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Loader2,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Location {
  name: string;
  title: string;
  displayName?: string;
  storefrontAddress?: {
    addressLines?: string[];
  };
}

export default function GoogleBusinessConnectPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // URLパラメータを確認
  useEffect(() => {
    if (!mounted) return;

    const urlParams = new URLSearchParams(window.location.search);
    const successParam = urlParams.get("success");
    const errorParam = urlParams.get("error");

    if (successParam === "true") {
      setSuccess(true);
      checkGoogleAuth();
    } else if (errorParam) {
      setError(getErrorMessage(errorParam));
      setIsLoading(false);
    } else {
      checkGoogleAuth();
    }
  }, [mounted]);

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "access_denied":
        return "Google認証がキャンセルされました。";
      case "server_configuration_error":
        return "サーバー設定に問題があります。管理者にお問い合わせください。";
      case "token_exchange_failed":
        return "認証トークンの取得に失敗しました。";
      case "user_info_failed":
        return "ユーザー情報の取得に失敗しました。";
      case "oauth_error":
        return "OAuth認証中にエラーが発生しました。";
      default:
        return "認証中に予期しないエラーが発生しました。";
    }
  };

  const checkGoogleAuth = async () => {
    try {
      console.log("🔍 Checking Google authentication status...");
      const response = await fetch("/api/google/auth-status");
      const data = await response.json();

      console.log("📡 Auth status response:", data);

      if (data.isAuthenticated) {
        setIsAuthenticated(true);
        setUserInfo(data.userInfo);
        setSuccess(true);
      } else {
        setIsAuthenticated(false);
        setUserInfo(null);
      }
    } catch (error) {
      console.error("❌ Failed to check auth status:", error);
      setError("認証状態の確認に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthAndRetry = async () => {
    try {
      // Cookieをクリア
      document.cookie =
        "google_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie =
        "google_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      setIsAuthenticated(false);
      setUserInfo(null);
      setError("");
      setSuccess(false);

      // 新しい認証を開始
      startGoogleAuth();
    } catch (error) {
      console.error("❌ Failed to clear auth:", error);
    }
  };

  const startGoogleAuth = () => {
    setIsAuthLoading(true);
    setError("");

    // Google OAuthのパラメータを設定
    const clientId =
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
      "457464044586-fqcr51tnsb2s54i3ir62975hf07e742k.apps.googleusercontent.com";
    const redirectUri = encodeURIComponent(
      "http://localhost:3000/api/google/callback"
    );
    const scope = encodeURIComponent(
      [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/business.manage",
      ].join(" ")
    );

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=${scope}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent`;

    console.log("🔗 Starting Google OAuth with URL:", authUrl);
    window.location.href = authUrl;
  };

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar currentPath="/google-business/connect" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <MobileHeader
          title="GBP連携設定"
          currentPath="/google-business/connect"
          showBackButton={true}
          backUrl="/"
        />

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <motion.h1
              className="text-xl md:text-2xl font-bold mb-6"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              Googleビジネスプロフィール連携
            </motion.h1>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>エラー</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {success && isAuthenticated && userInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Alert className="mb-6 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">連携完了</AlertTitle>
                  <AlertDescription className="text-green-700">
                    {userInfo.email}{" "}
                    でGoogleビジネスプロフィールとの連携が完了しました。
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
                  <p className="text-muted-foreground">認証状態を確認中...</p>
                </div>
              </div>
            )}

            {!isAuthenticated && !isLoading && !isAuthLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Googleビジネスプロフィールと連携</CardTitle>
                    <CardDescription>
                      Googleビジネスプロフィールと連携して、レビューの管理や店舗情報の同期を行います
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                        <Store size={24} />
                      </div>
                      <div>
                        <h3 className="font-medium">
                          ビジネスロケーションの同期
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Googleビジネスプロフィールから店舗情報を自動的に同期します
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400">
                        <ExternalLink size={24} />
                      </div>
                      <div>
                        <h3 className="font-medium">レビューの自動取得</h3>
                        <p className="text-sm text-muted-foreground">
                          Googleレビューを自動的に取得し、HIIDELダッシュボードで一元管理できます
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={startGoogleAuth}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none"
                      disabled={isAuthLoading}
                    >
                      {isAuthLoading ? (
                        <>
                          <Loader2 size={16} className="mr-2 animate-spin" />{" "}
                          処理中...
                        </>
                      ) : (
                        <>
                          Googleアカウントで連携する{" "}
                          <ArrowRight size={16} className="ml-2" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {isAuthenticated && userInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>連携済み アカウント</CardTitle>
                    <CardDescription>
                      現在連携中のGoogleアカウント
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      {userInfo.picture && (
                        <img
                          src={userInfo.picture}
                          alt="プロフィール"
                          className="w-12 h-12 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">{userInfo.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {userInfo.email}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" onClick={clearAuthAndRetry}>
                      連携を解除して再設定
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        <footer className="border-t py-3 px-4 md:py-4 md:px-6 text-center text-sm text-muted-foreground">
          © 2025 Leadcreation Co., Ltd.
        </footer>
      </div>
    </div>
  );
}
