"use client";

import React, { useState, useEffect } from "react";
import { signIn, getSession, getProviders } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const router = useRouter();

  // プロバイダーの利用可能性をチェック
  useEffect(() => {
    getProviders().then((providers) => {
      setGoogleAvailable(!!providers?.google);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else {
        router.push("/");
      }
    } catch (error) {
      setError("ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      setError("Googleログインに失敗しました");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <svg
              className="h-12 w-auto"
              viewBox="0 0 264.46 64.25"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <style>{`.cls-1 { fill: #0032ff; }`}</style>
              </defs>
              <g>
                <path d="M113.23,52.51v-17.87h-14.71v17.87h-9.79V11.73h9.79v14.99h14.71v-14.99h9.85v40.78h-9.85Z" />
                <path d="M131.29,52.51V11.73h8.84v40.78h-8.84Z" />
                <path d="M146.44,52.51V11.73h8.84v40.78h-8.84Z" />
                <path d="M162.93,52.51V11.73h16.13c11.29,0,19.35,7.55,19.35,19.96s-7.26,20.82-18.05,20.82h-17.43ZM178.44,44.78c7.26,0,10.11-4.24,10.11-13.08s-2.73-12.1-10.86-12.1h-5.46v25.18h6.2Z" />
                <path d="M203.8,52.51V11.73h28.16v7.92h-19.61v7.55h17.96v7.98h-17.96v9.27h20.52v8.05h-29.07Z" />
                <path d="M237.5,52.51V11.73h8.84v32.49h18.13v8.29h-26.96Z" />
                <g>
                  <path
                    className="cls-1"
                    d="M0,0c17.74,0,32.12,14.38,32.12,32.12S17.74,64.25,0,64.25V0Z"
                  />
                  <path
                    className="cls-1"
                    d="M64.25,0C46.51,0,32.12,14.38,32.12,32.12c0,17.74,14.38,32.12,32.12,32.12V0Z"
                  />
                </g>
              </g>
            </svg>
          </div>
          <CardDescription>中小企業向けDXツールにログイン</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
                  required
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ログイン中...
                </>
              ) : (
                "ログイン"
              )}
            </Button>
          </form>

          {googleAvailable && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">または</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Googleでログイン
              </Button>
            </>
          )}

          <div className="text-center text-sm">
            <span className="text-gray-600">デモアカウント: </span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              demo@hiidel.com / demo123
            </code>
          </div>

          <div className="text-center">
            <Link
              href="/admin/login"
              className="text-xs text-blue-600 hover:underline"
            >
              管理者ログインはこちら →
            </Link>
          </div>
        </CardContent>
        <CardFooter className="text-center">
          <p className="text-sm text-gray-600">
            アカウントをお持ちでない方は{" "}
            <Link href="/auth/signup" className="text-blue-600 hover:underline">
              新規登録
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
