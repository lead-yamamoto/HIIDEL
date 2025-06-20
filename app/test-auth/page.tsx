"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

export default function TestAuthPage() {
  const { data: session, status } = useSession();

  console.log("Session status:", status);
  console.log("Session data:", session);

  if (status === "loading") {
    return <div className="p-8">ローディング中...</div>;
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">認証テストページ</h1>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-bold">Status: {status}</h2>
        <pre className="mt-2 text-sm overflow-auto">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      {session && (
        <Button onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
          ログアウト
        </Button>
      )}

      <div className="mt-4">
        <a href="/auth/signin" className="text-blue-600 underline">
          ログインページへ
        </a>
      </div>
    </div>
  );
}
