#!/usr/bin/env node

/**
 * Google認証情報をクリアするスクリプト
 *
 * 使用方法:
 * node scripts/clear-google-auth.js
 *
 * このスクリプトは以下を実行します:
 * 1. ブラウザのCookie削除指示を表示
 * 2. サーバー側のトークンクリア方法を案内
 */

console.log("🧹 Google認証情報のクリア方法");
console.log("=====================================");
console.log("");

console.log("📝 手動でクリアする必要があるもの:");
console.log("");

console.log("1. ブラウザのCookie（開発者ツールで）:");
console.log("   - Application > Cookies > localhost:3000");
console.log("   - 'google_access_token' を削除");
console.log("   - 'google_refresh_token' を削除");
console.log("");

console.log("2. NextAuth.jsのセッション:");
console.log("   - 'next-auth.session-token' を削除");
console.log("   - 'next-auth.csrf-token' を削除");
console.log("");

console.log(
  "3. ブラウザのローカルストレージ（F12 > Application > Local Storage）:"
);
console.log("   - 全ての関連データをクリア");
console.log("");

console.log("🔄 API呼び出しでCookieをクリア:");
console.log("   curl http://localhost:3000/api/google/logout");
console.log("");

console.log("🔄 完全なクリア後の手順:");
console.log("1. ブラウザを完全に閉じる");
console.log("2. ブラウザを再起動");
console.log("3. アプリケーションに再ログイン");
console.log("4. 新しいGoogle認証を実行");
console.log("");

console.log("✅ 完了後、Google Business Profile連携を再実行してください。");
