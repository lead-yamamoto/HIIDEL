"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface GoogleAuthCheckerProps {
  children: React.ReactNode;
}

export default function GoogleAuthChecker({
  children,
}: GoogleAuthCheckerProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  useEffect(() => {
    const checkGoogleAuth = async () => {
      // セッションがロード中の場合は待機
      if (status === "loading") {
        return;
      }

      // ログインしていない場合はチェック不要
      if (status === "unauthenticated") {
        setIsChecking(false);
        setAuthCheckComplete(true);
        return;
      }

      // ログインしている場合のみGoogle認証をチェック
      if (status === "authenticated" && session?.user?.email) {
        try {
          console.log(
            "🔍 [GoogleAuthChecker] Checking Google authentication..."
          );

          const response = await fetch("/api/google/auth-check");
          const result = await response.json();

          if (result.needsAuth) {
            console.log(
              "⚠️ [GoogleAuthChecker] Google re-authentication needed:",
              result.reason
            );

            // ユーザーにメッセージを表示
            toast.error(result.message, {
              duration: 5000,
              action: {
                label: "Google連携へ",
                onClick: () => router.push(result.redirectTo),
              },
            });

            // 3秒後に自動リダイレクト
            setTimeout(() => {
              router.push(result.redirectTo);
            }, 3000);
          } else {
            console.log(
              "✅ [GoogleAuthChecker] Google authentication is valid"
            );
            setAuthCheckComplete(true);
          }
        } catch (error) {
          console.error(
            "💥 [GoogleAuthChecker] Error checking Google auth:",
            error
          );
          toast.error("Google認証の確認中にエラーが発生しました");
          setAuthCheckComplete(true);
        }
      }

      setIsChecking(false);
    };

    checkGoogleAuth();
  }, [session, status, router]);

  // チェック中の場合はローディング表示
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Google認証を確認中...</p>
        </div>
      </div>
    );
  }

  // 認証チェックが完了している場合のみ子コンポーネントを表示
  if (authCheckComplete || status === "unauthenticated") {
    return <>{children}</>;
  }

  // それ以外の場合は何も表示しない（リダイレクト中）
  return null;
}
