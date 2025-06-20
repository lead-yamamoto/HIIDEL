# HIIDEL セットアップガイド

## 概要

HIIDEL は中小企業向け DX ツールで、Google レビュー管理、QR コード生成、顧客アンケート、AI 機能などを提供する SaaS システムです。

## 環境変数設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の環境変数を設定してください：

```bash
# Google OAuth2 設定
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
REDIRECT_URI=http://localhost:3000/api/google/callback

# NextAuth.js 設定
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# OpenAI API 設定
OPENAI_API_KEY=your_openai_api_key_here

# Twilio SMS 設定
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# Salesforce CRM 設定
SALESFORCE_USERNAME=your_salesforce_username_here
SALESFORCE_PASSWORD=your_salesforce_password_here
SALESFORCE_SECURITY_TOKEN=your_salesforce_security_token_here
SALESFORCE_LOGIN_URL=https://login.salesforce.com

# データベース設定（本格運用時）
DATABASE_URL=postgresql://username:password@localhost:5432/hiidel_db

# セキュリティ設定
ENCRYPTION_KEY=your_encryption_key_here
JWT_SECRET=your_jwt_secret_here
```

## 必要なサービスのセットアップ

### 1. Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成
3. Google My Business API を有効化
4. OAuth2.0 認証情報を作成
5. リダイレクト URI に `http://localhost:3000/api/google/callback` を追加

### 2. OpenAI API

1. [OpenAI Platform](https://platform.openai.com/) でアカウント作成
2. API キーを生成
3. 使用制限と課金設定を確認

### 3. Twilio SMS

1. [Twilio Console](https://console.twilio.com/) でアカウント作成
2. SMS 対応の電話番号を取得
3. Account SID と Auth Token を取得

### 4. Salesforce（オプション）

1. Salesforce Developer Edition アカウントを作成
2. 接続アプリケーションを設定
3. セキュリティトークンを取得

## インストールと起動

```bash
# 依存関係のインストール
npm install --legacy-peer-deps

# 開発サーバーの起動
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## 実装された機能

### ✅ コア機能

- [x] QR コード生成・管理機能
- [x] 顧客アンケート機能
- [x] Google レビュー管理機能
- [x] AI によるレビュー返信テンプレート生成
- [x] Google ビジネスプロフィール管理
- [x] CRM・外部ツール連携（Salesforce）
- [x] SMS・通知機能
- [x] AI ボット機能（チャットボット）
- [x] 音声メモ機能（音声 → テキスト変換）

### ✅ 管理機能

- [x] 管理者ダッシュボード
- [x] 店舗管理機能
- [x] ユーザーアカウント管理
- [x] データエクスポート機能（CSV/JSON）

### ✅ API エンドポイント

- `/api/google/*` - Google API 連携
- `/api/ai/review-reply` - AI レビュー返信生成
- `/api/sms/send-review-request` - SMS レビューリクエスト送信
- `/api/crm/salesforce/sync` - Salesforce CRM 連携
- `/api/voice/transcribe` - 音声認識・テキスト変換
- `/api/chatbot/chat` - AI チャットボット
- `/api/admin/dashboard` - 管理者ダッシュボード
- `/api/export/data` - データエクスポート

## セキュリティ機能

### 認証・認可

- OAuth2.0 対応（Google）
- JWT トークンベース認証
- ロールベースアクセス制御

### データ保護

- 環境変数による機密情報の保護
- API レスポンスの適切なエラーハンドリング
- ログ記録とアクセス監視

## 本格運用に向けた追加設定

### データベース設定

PostgreSQL または MySQL を設定し、以下のテーブルを作成：

- users（ユーザー情報）
- stores（店舗情報）
- reviews（レビューデータ）
- surveys（アンケートデータ）
- qr_codes（QR コード情報）
- export_logs（エクスポート履歴）

### インフラ設定

- AWS/GCP でのホスティング
- オートスケーリング設定
- ロードバランサー設定
- CDN 設定
- バックアップポリシー

### 監視・ログ

- アプリケーション監視
- パフォーマンス監視
- エラー追跡
- セキュリティ監視

## トラブルシューティング

### よくある問題

1. **Google API エラー**: 環境変数と Google Cloud Console の設定を確認
2. **SMS 送信失敗**: Twilio 設定と電話番号形式を確認
3. **AI 機能エラー**: OpenAI API キーと使用制限を確認
4. **データベース接続エラー**: DATABASE_URL の設定を確認

### ログの確認

```bash
# 開発サーバーのログを確認
npm run dev

# ブラウザの開発者ツールでネットワークタブを確認
```

## サポート

技術的な問題や質問については、プロジェクトの Issue を作成してください。
