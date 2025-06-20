# Google レビュー URL 自動取得機能

## 概要

アンケート回答後に Google レビューページへ自動リダイレクトする機能で、店舗の Google レビュー URL を自動的に生成・取得します。

## 実装内容

### 1. 自動 URL 生成

#### A. Google Location ID からの生成

```typescript
// stores APIで自動生成
function generateGoogleReviewUrl(googleLocationId: string): string {
  return `https://search.google.com/local/writereview?placeid=${googleLocationId}`;
}
```

#### B. Google Business Profile API からの取得

```typescript
// locations APIでPlace IDを取得して生成
if (location.metadata?.placeId) {
  googleReviewUrl = `https://search.google.com/local/writereview?placeid=${location.metadata.placeId}`;
}
```

### 2. URL パターン

Google レビュー URL は以下の形式に対応：

1. **Place ID ベース** (推奨)

   - 形式: `https://search.google.com/local/writereview?placeid=ChIJxxxxxxxxxxxxxx`
   - Place ID は`ChIJ`で始まる文字列

2. **CID ベース** (Customer ID)

   - 形式: `https://search.google.com/local/writereview?placeid=1234567890123456789`
   - 数値のみの ID

3. **旧形式** (リダイレクト対応)
   - 形式: `https://g.page/r/CYd_EAAQNdg7EAE/review`
   - 自動的に新形式にリダイレクトされる

## API 統合

### Google Business Profile API

既存の Google 認証を活用して、以下の情報を取得：

```javascript
// metadata から必要な情報を取得
{
  placeId: "ChIJxxxxxxxxxxxxxx",     // Place ID
  mapsUri: "https://maps.google.com/?cid=1234567890", // CIDを含むURL
}
```

### 自動取得フロー

1. **店舗追加時**

   - Google Business Profile から店舗を選択
   - Location ID と Place ID を自動保存
   - レビュー URL を自動生成

2. **アンケート作成時**

   - 店舗を選択（必須）
   - 選択した店舗のレビュー URL が自動設定

3. **アンケート回答時**
   - 平均評価 4.0 以上で自動リダイレクト
   - 手動入力不要

## メリット

1. **ユーザー負担軽減**

   - URL の手動入力が不要
   - 間違った URL 入力のリスクなし

2. **正確性向上**

   - Google API から直接取得
   - 常に最新の URL を使用

3. **運用効率化**
   - 店舗追加時に自動設定
   - メンテナンス不要

## 技術仕様

### 必要な API 権限

```
https://www.googleapis.com/auth/business.manage
```

### エンドポイント

- `/api/stores` - 店舗情報取得（URL を自動生成）
- `/api/google/locations` - Google 店舗一覧（Place ID 含む）

### データ構造

```typescript
interface Store {
  id: string;
  googleLocationId: string; // Location ID
  googleReviewUrl?: string; // 自動生成されるURL
  // ... その他のフィールド
}
```

## トラブルシューティング

### URL が生成されない場合

1. **Google Location ID が未設定**

   - 店舗追加時に Google から選択する必要あり

2. **Place ID が取得できない**

   - Google Business Profile API の権限確認
   - API クォータの確認

3. **古い形式の URL**
   - 自動的に新形式にリダイレクトされるため問題なし

## 今後の拡張

1. **複数言語対応**

   - `&hl=ja`パラメータで言語指定可能

2. **トラッキング**

   - UTM パラメータの追加でアナリティクス連携

3. **カスタマイズ**
   - レビュー投稿後のリダイレクト先指定
