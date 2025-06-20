"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Home, LogIn } from "lucide-react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const error = searchParams?.get("error") || "unknown";

  const getErrorMessage = (error: string) => {
    switch (error) {
      case "Configuration":
        return "認証設定に問題があります。管理者にお問い合わせください。";
      case "AccessDenied":
        return "アクセスが拒否されました。";
      case "Verification":
        return "認証リンクの有効期限が切れているか、既に使用されています。";
      case "Default":
        return "認証中にエラーが発生しました。";
      case "Signin":
        return "ログインに失敗しました。";
      case "OAuthSignin":
        return "OAuth プロバイダーでのサインインに失敗しました。";
      case "OAuthCallback":
        return "OAuth コールバックでエラーが発生しました。";
      case "OAuthCreateAccount":
        return "OAuth アカウントの作成に失敗しました。";
      case "EmailCreateAccount":
        return "メールアカウントの作成に失敗しました。";
      case "Callback":
        return "コールバック処理でエラーが発生しました。";
      case "OAuthAccountNotLinked":
        return "このアカウントは既に別の認証方法でリンクされています。";
      case "EmailSignin":
        return "メール認証でエラーが発生しました。";
      case "CredentialsSignin":
        return "メールアドレスまたはパスワードが正しくありません。";
      case "SessionRequired":
        return "このページにアクセスするにはログインが必要です。";
      default:
        return "認証中に予期しないエラーが発生しました。";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            認証エラー
          </CardTitle>
          <CardDescription>ログイン中に問題が発生しました</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/auth/signin">
                <LogIn className="mr-2 h-4 w-4" />
                ログインページに戻る
              </Link>
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                ホームページ
              </Link>
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">エラーコード: {error}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
