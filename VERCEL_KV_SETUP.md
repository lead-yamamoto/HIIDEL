# Vercel KV（Redis）データベース設定手順

## 1. Vercel KV データベースの作成

### Vercel ダッシュボードでの設定

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクト `hiidel-dashboard` を選択
3. **Storage** タブをクリック
4. **Create Database** → **KV** を選択
5. データベース名: `hiidel-redis-prod`
6. **Create** をクリック

### 自動設定される環境変数

データベース作成後、以下の環境変数が自動的にプロジェクトに設定されます：

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

## 2. 環境変数の確認

### Vercel ダッシュボードで確認

1. プロジェクト → **Settings** → **Environment Variables**
2. 以下の変数が設定されていることを確認：
   ```
   KV_REST_API_URL=https://******.kv.vercel-storage.com
   KV_REST_API_TOKEN=*******************
   ```

### ローカル開発環境の設定

`.env.local` ファイルを作成（既存の場合は追加）：

```bash
# Vercel KV設定
KV_REST_API_URL=https://******.kv.vercel-storage.com
KV_REST_API_TOKEN=*******************
```

## 3. デプロイ

### 自動デプロイ

1. コードを GitHub にプッシュ
2. Vercel が自動的にデプロイを開始
3. デプロイ完了後、KV データベースが使用可能

### 手動デプロイ

```bash
# Vercel CLIを使用
npx vercel --prod
```

## 4. データベース動作確認

### 初期化の確認

本番環境にアクセスすると、以下のログが表示されます：

```
🔄 Initializing database...
🔄 Initializing default data in Vercel KV...
✅ Database initialization complete
```

### データ永続化の確認

1. 店舗を作成
2. アンケートを作成
3. ブラウザを再読み込み
4. データが保持されていることを確認

## 5. トラブルシューティング

### KV が利用できない場合

- グローバルストレージにフォールバック
- ログに以下が表示：
  ```
  ⚠️ Vercel KV not available, initializing global storage
  ```

### 環境変数の問題

1. Vercel ダッシュボードで環境変数を再確認
2. 必要に応じて再デプロイ

### データが消える場合

- KV が正常に動作していない可能性
- ログを確認して KV 接続状況をチェック

## 6. データベース構造

### 使用されるキー

```
hiidel:stores          - 店舗データ
hiidel:surveys         - アンケートデータ
hiidel:reviews         - レビューデータ
hiidel:qr_codes        - QRコードデータ
hiidel:survey_responses - アンケート回答データ
hiidel:users           - ユーザーデータ
hiidel:initialized     - 初期化フラグ
```

### データ形式

- JSON 形式で保存
- 日付は文字列として保存され、取得時に Date オブジェクトに復元

## 7. パフォーマンス

### キャッシュ戦略

- グローバルストレージと KV の二重保存
- 読み込み：KV 優先、フォールバックでグローバル
- 書き込み：両方に同時保存

### 制限事項

- Vercel KV：1MB/キー、10,000 リクエスト/月（Hobby Plan）
- 大量データの場合は Pro Plan へのアップグレードを推奨

## 8. 監視とログ

### 成功ログ

```
💾 Saved X items to KV: hiidel:stores
📊 Retrieved X items from KV: hiidel:surveys
```

### エラーログ

```
❌ KV set error for hiidel:stores: [error details]
⚠️ Failed to save to KV: hiidel:surveys, using global storage only
```
