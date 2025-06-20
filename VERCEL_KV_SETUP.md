# Vercel Redis データベース設定手順

## 1. Vercel Redis データベースの作成

### Vercel ダッシュボードでの設定

1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセス
2. プロジェクト `hiidel-dashboard` を選択
3. **Storage** タブをクリック
4. **Create Database** → **Redis** を選択
5. データベース名: `hiidel-redis-prod`
6. **Create** をクリック

### 自動設定される環境変数

データベース作成後、以下の環境変数が自動的にプロジェクトに設定されます：

- `REDIS_URL`

## 2. 環境変数の確認

### Vercel ダッシュボードで確認

1. プロジェクト → **Settings** → **Environment Variables**
2. 以下の変数が設定されていることを確認：
   ```
   REDIS_URL=redis://default:AXAx3316Q7NYWwMHXbrkLTjj9Bfhmt63@redis-11682.c17.us-east-1-4.ec2.redns.redis-cloud.com:11682
   ```

### ローカル開発環境の設定

`.env.local` ファイルを作成（既存の場合は追加）：

```bash
# Redis設定
REDIS_URL=redis://default:AXAx3316Q7NYWwMHXbrkLTjj9Bfhmt63@redis-11682.c17.us-east-1-4.ec2.redns.redis-cloud.com:11682
```

## 3. デプロイ

### 自動デプロイ

1. コードを GitHub にプッシュ
2. Vercel が自動的にデプロイを開始
3. デプロイ完了後、Redis データベースが使用可能

### 手動デプロイ

```bash
# Vercel CLIを使用
npx vercel --prod
```

## 4. データベース動作確認

### 初期化の確認

本番環境にアクセスすると、以下のログが表示されます：

```
🔄 Connecting to Redis...
✅ Redis connected successfully
🔄 Initializing default data in Redis...
✅ Database initialization complete
```

### データ永続化の確認

1. 店舗を作成
2. アンケートを作成
3. ブラウザを再読み込み
4. データが保持されていることを確認

## 5. トラブルシューティング

### Redis が利用できない場合

- グローバルストレージにフォールバック
- ログに以下が表示：
  ```
  ⚠️ REDIS_URL not found, Redis will not be available
  ⚠️ Redis not available, initializing global storage
  ```

### 環境変数の問題

1. Vercel ダッシュボードで環境変数を再確認
2. 必要に応じて再デプロイ

### 接続エラーの場合

- ログに以下が表示：
  ```
  ❌ Failed to connect to Redis: [error details]
  ```
- Redis URL が正しいことを確認
- ネットワーク接続を確認

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

- グローバルストレージと Redis の二重保存
- 読み込み：Redis 優先、フォールバックでグローバル
- 書き込み：両方に同時保存

### 制限事項

- Redis Cloud：30MB ストレージ、30 接続（無料プラン）
- 大量データの場合は有料プランへのアップグレードを推奨

## 8. 監視とログ

### 成功ログ

```
💾 Saved X items to Redis: hiidel:stores
📊 Retrieved X items from Redis: hiidel:surveys
✅ Redis connected successfully
```

### エラーログ

```
❌ Redis SET error for hiidel:stores: [error details]
❌ Redis connection error: [error details]
⚠️ Failed to save to Redis: hiidel:surveys, using global storage only
```

## 9. Redis Cloud について

- **プロバイダー**: Redis Cloud (by Redis Inc.)
- **場所**: Vercel Storage 経由で提供
- **特徴**:
  - 完全マネージド
  - 高可用性
  - 自動バックアップ
  - SSL/TLS 暗号化

## 10. 本番環境での確認

デプロイ後、以下を確認してください：

1. **Redis 接続確認**：

   ```
   🔄 Connecting to Redis...
   ✅ Redis connected successfully
   ```

2. **データ永続化テスト**：

   - 店舗を作成
   - ページを再読み込み
   - データが保持されていることを確認

3. **フォールバック動作**：
   - Redis 接続失敗時にグローバルストレージが使用される
   - エラーログが適切に出力される
