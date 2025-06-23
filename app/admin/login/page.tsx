"use client";

import { useState, useEffect } from "react";
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
import { Eye, EyeOff, Loader2, Shield } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Admin login successful");
        // 管理者画面にリダイレクト（Cookieは自動的に設定される）
        router.push("/admin");
      } else {
        setError(data.error || "ログインに失敗しました");
      }
    } catch (error) {
      console.error("ログインエラー:", error);
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

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
          <CardTitle className="text-2xl font-bold text-gray-900">
            Admin Portal
          </CardTitle>
          <CardDescription>管理者コンソールにログイン</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">管理者ID</Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="管理者IDを入力"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="パスワードを入力"
                  required
                  disabled={loading}
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
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ログイン中...
                </>
              ) : (
                "管理者ログイン"
              )}
            </Button>
          </form>

          <div className="text-center text-sm">
            <span className="text-gray-600">デモアカウント: </span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
              admin / admin123
            </code>
          </div>
        </CardContent>

        <CardFooter className="justify-center">
          <Link
            href="/auth/signin"
            className="text-xs text-blue-600 hover:underline"
          >
            ← 通常ログインに戻る
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
