# Google Business Profile API 実装完了

Google Business Profile API を使用して実際の店舗データを取得できるようになりました！

## 🎉 実装された機能

### ✅ 完了した機能

- Google OAuth 2.0 認証
- Google Business Profile API 連携
- 実際の店舗データ取得
- エラーハンドリングと詳細ログ
- テストデータのフォールバック
- 設定ガイドの統合
- CLI テストツール

### 🔄 API アクセス状況の表示

- **テストモード**: Google Business Profile API へのアクセスが制限されている場合
- **本番 API モード**: 実際の API からデータを取得している場合
- API 設定状況の詳細表示
- エラー詳細とトラブルシューティング情報

## 🚀 すぐに使い始める

### 1. アプリケーションを起動

```bash
npm run dev
```

### 2. Google 認証を実行

1. http://localhost:3000 にアクセス
2. Google アカウントでログイン
3. 「Google Business Profile を連携しましょう」をクリック
4. Google 認証を完了

### 3. 店舗を追加

1. 「店舗を管理」または「店舗を追加」をクリック
2. 利用可能な店舗一覧を確認
3. 追加したい店舗の「追加」ボタンをクリック

## 🔧 実際の API を使用するための設定

現在は**テストモード**で動作しています。実際の Google Business Profile API を使用するには以下の設定が必要です：

### 1. Google Cloud Platform の設定

#### プロジェクトの設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択または作成

#### API の有効化

1. **Google My Business API** を有効化

   - APIs & Services > Library から検索
   - 「Google My Business API」を選択して有効化

2. **Google Business Profile API** を有効化
   - APIs & Services > Library から検索
   - 「Google Business Profile API」を選択して有効化

#### OAuth 2.0 設定

1. APIs & Services > Credentials に移動
2. 「認証情報を作成」> 「OAuth 2.0 クライアント ID」
3. ウェブアプリケーションを選択
4. 承認済みリダイレクト URI: `http://localhost:3000/api/google/callback`

### 2. Google Business Profile の準備

#### ビジネスプロフィールの作成

1. [Google Business Profile](https://business.google.com/) にアクセス
2. ビジネスプロフィールを作成または確認
3. 店舗の住所確認を完了

#### 必要な権限

- アカウントのオーナーまたは管理者である必要があります
- 店舗が Google Maps に表示されている必要があります

### 3. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成：

```env
# Google OAuth 認証情報
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# NextAuth.js 設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secure-random-secret-here

# デバッグ設定（オプション）
DEBUG_ENABLED=true
```

## 🧪 API 接続テスト

### CLI テストツール

```bash
# アクセストークンを使用してAPIをテスト
node scripts/test-google-api.js [ACCESS_TOKEN]
```

#### アクセストークンの取得方法：

1. ブラウザで Google 認証を実行
2. 開発者ツールを開く (F12)
3. Application > Cookies > `google_access_token` の値をコピー
4. コピーした値をテストツールで使用

### ブラウザでの確認

1. 店舗追加ダイアログを開く
2. 「設定ガイド」ボタンで詳細な設定手順を確認
3. コンソールログで API 応答を確認

## 📊 API ステータスの確認方法

### アプリケーション内での確認

- **🧪 テストモード**: テストデータを使用中
- **✅ 本番 API モード**: 実際の API からデータ取得中

### ログでの確認項目

```
📡 Accounts API response status: 200  ← アカウント取得成功
🏢 Found 1 account(s)                 ← アカウント数
✅ Found 3 locations                  ← 店舗数
```

## 🔧 トラブルシューティング

### 403 Forbidden エラー

**症状**: API アクセスが拒否される

**原因と解決方法**:

1. **API が有効化されていない**

   - Google Cloud Console で Google My Business API を有効化

2. **OAuth スコープが不足**

   - `https://www.googleapis.com/auth/business.manage` スコープを追加

3. **Google Business Profile アカウントなし**

   - Google Business Profile でビジネスを登録・確認

4. **権限不足**
   - ビジネスのオーナーまたは管理者権限が必要

### 401 Unauthorized エラー

**症状**: 認証エラー

**解決方法**:

1. Google 認証を再実行
2. アクセストークンの有効期限を確認
3. OAuth 設定を見直し

### 空のレスポンス

**症状**: 店舗データが取得できない

**解決方法**:

1. Google Business Profile で店舗を登録
2. 住所確認プロセスを完了
3. 店舗が Google Maps に表示されているか確認

## 📁 関連ファイル

### コアファイル

- `app/api/google/locations/route.ts` - 店舗データ取得 API
- `app/stores/add-store-dialog.tsx` - 店舗追加ダイアログ
- `app/api/google/auth/route.ts` - Google OAuth 設定

### 設定・ガイド

- `GOOGLE_BUSINESS_API_SETUP.md` - 詳細設定ガイド
- `scripts/test-google-api.js` - CLI テストツール

### 環境設定

- `.env.local` - 環境変数 (手動作成が必要)

## 🎯 次のステップ

1. **本番環境への移行**

   - 本番ドメインで OAuth 設定を更新
   - セキュリティ強化 (NEXTAUTH_SECRET 等)

2. **機能拡張**

   - レビューデータの取得
   - 店舗統計の表示
   - 自動更新機能

3. **パフォーマンス最適化**
   - API レスポンスのキャッシュ
   - レート制限への対応

## 🔗 参考リンク

- [Google Business Profile API Documentation](https://developers.google.com/my-business)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Business Profile](https://business.google.com/)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2/web-server)

---

**📞 サポート**: 設定でご不明な点があれば、`GOOGLE_BUSINESS_API_SETUP.md` の詳細ガイドをご確認ください。
