# Hiidel Dashboard

アンケート機能付きのビジネスダッシュボードアプリケーション。アンケート結果に基づいて Google レビューへの誘導または改善フィードバックの収集を自動で行います。

## 機能

- 📊 **アンケート作成・管理**: 店舗別のカスタムアンケート作成
- ⭐ **スマート誘導**: 評価に基づく Google レビューまたは改善フィードバックへの自動振り分け
- 🏪 **店舗管理**: Google Business Profile との連携
- 📱 **QR コード生成**: アンケートへの簡単アクセス
- 🔐 **認証システム**: NextAuth.js によるセキュアな認証
- 📈 **分析機能**: アンケート結果の可視化

## 技術スタック

- **フレームワーク**: Next.js 15
- **UI**: React, Tailwind CSS, shadcn/ui
- **認証**: NextAuth.js
- **データベース**: SQLite (開発) / PostgreSQL (本番推奨)
- **API 連携**: Google Business Profile API

## デプロイ手順

### 1. Vercel でのデプロイ

1. [Vercel](https://vercel.com)にアクセスしてアカウントを作成
2. GitHub リポジトリをインポート
3. 環境変数を設定:
   - `DATABASE_URL`: データベース URL
   - `NEXTAUTH_URL`: デプロイ後の URL
   - `NEXTAUTH_SECRET`: NextAuth 用のシークレット
   - `GOOGLE_CLIENT_ID`: Google OAuth クライアント ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth クライアントシークレット
   - その他必要な環境変数（.env.example を参照）

### 2. 環境変数の設定

`.env.example`ファイルを参考に、以下の環境変数を設定してください：

```bash
# 必須の環境変数
DATABASE_URL="your-database-url"
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. データベースの設定

本番環境では、PostgreSQL または MySQL データベースの使用を推奨します。
Vercel Postgres や PlanetScale などのサービスを利用できます。

## ローカル開発

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

http://localhost:3000 でアプリケーションにアクセスできます。

## 主要な機能の使い方

### アンケート作成

1. ダッシュボードから「アンケート作成」を選択
2. 質問を追加（評価質問、テキスト質問など）
3. 設定タブで対象店舗を選択（必須）
4. アンケートを保存・公開

### 評価ベースの自動振り分け

- **4.0 以上の評価**: Google レビューページへ自動リダイレクト
- **3.9 以下の評価**: 改善フィードバックフォームを表示

### 店舗管理

- Google Business Profile との連携
- 自動的な Google レビュー URL 生成
- 店舗情報の一元管理

## ライセンス

MIT License
