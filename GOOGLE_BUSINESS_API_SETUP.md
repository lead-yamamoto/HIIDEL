# Google Business Profile API 設定ガイド

Google Business Profile API を使用して実際の店舗データを取得するための設定手順です。

## 1. Google Cloud Platform の設定

### 1.1 プロジェクトの作成または選択

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 既存のプロジェクトを選択するか、新しいプロジェクトを作成

### 1.2 必要な API の有効化

以下の API を有効化してください：

1. **Google My Business API**

   - APIs & Services > Library から検索
   - 「Google My Business API」を選択して有効化

2. **Google Business Profile API**
   - APIs & Services > Library から検索
   - 「Google Business Profile API」を選択して有効化

### 1.3 OAuth 2.0 認証情報の設定

1. APIs & Services > Credentials に移動
2. 「認証情報を作成」> 「OAuth 2.0 クライアント ID」を選択
3. アプリケーションの種類：「ウェブアプリケーション」
4. 承認済みのリダイレクト URI に以下を追加：
   ```
   http://localhost:3000/api/google/callback
   ```

## 2. OAuth スコープの設定

アプリケーションで以下のスコープが必要です：

```
https://www.googleapis.com/auth/business.manage
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
openid
email
profile
```

## 3. Google Business Profile アカウントの要件

### 3.1 Google Business Profile の作成

1. [Google Business Profile](https://business.google.com/) にアクセス
2. ビジネスプロフィールを作成または既存のものを使用
3. 店舗情報を正確に入力

### 3.2 アカウントの確認

- 店舗の住所確認が完了している必要があります
- Google Maps に店舗が表示されている必要があります

## 4. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の情報を設定：

```env
# Google OAuth 認証情報
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# NextAuth.js 設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# デバッグ設定
DEBUG_ENABLED=true
```

## 5. API 制限事項と注意点

### 5.1 API 配信量制限

- Google Business Profile API には日次および分あたりの配信量制限があります
- 本番環境では適切なレート制限の実装が必要です

### 5.2 認証要件

- ユーザーは Google Business Profile のオーナーまたは管理者である必要があります
- 複数の店舗を管理している場合、適切な権限が必要です

### 5.3 データアクセス

- API で取得できるのは、認証されたユーザーが管理している店舗のデータのみです
- 他のユーザーの店舗データにはアクセスできません

## 6. トラブルシューティング

### 6.1 403 Forbidden エラー

**原因：**

- API が有効化されていない
- 適切な OAuth スコープが設定されていない
- ユーザーに Google Business Profile の権限がない

**解決方法：**

1. Google Cloud Console で API の有効化を確認
2. OAuth スコープの設定を確認
3. Google Business Profile にアカウントが登録されているか確認

### 6.2 401 Unauthorized エラー

**原因：**

- アクセストークンが無効または期限切れ
- 認証情報が正しくない

**解決方法：**

1. Google 認証を再実行
2. トークンの更新処理を確認

### 6.3 Empty Response

**原因：**

- ユーザーが Google Business Profile に店舗を登録していない
- 店舗の確認プロセスが完了していない

**解決方法：**

1. Google Business Profile で店舗を登録・確認
2. 住所確認プロセスを完了

## 7. テスト方法

### 7.1 API アクセステスト

1. アプリケーションで Google 認証を実行
2. 店舗追加ダイアログを開く
3. コンソールログで API 応答を確認

### 7.2 ログの確認項目

- `📡 Accounts API response status: 200` - アカウント取得成功
- `🏢 Found X account(s)` - アカウント数
- `✅ Found X locations` - 店舗数

## 8. 本番環境への移行

### 8.1 ドメインの更新

- OAuth リダイレクト URI を本番ドメインに更新
- NEXTAUTH_URL を本番 URL に更新

### 8.2 セキュリティ強化

- NEXTAUTH_SECRET を安全なランダム文字列に変更
- 環境変数の適切な管理

### 8.3 API 使用量の監視

- Google Cloud Console で API 使用量を監視
- 必要に応じて配信量制限の調整

## 9. 参考リンク

- [Google Business Profile API Documentation](https://developers.google.com/my-business)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google Business Profile](https://business.google.com/)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
