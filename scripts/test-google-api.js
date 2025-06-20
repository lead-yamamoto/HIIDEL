#!/usr/bin/env node

/**
 * Google Business Profile API テストスクリプト
 *
 * 使用方法:
 * 1. .env.local にGoogle認証情報を設定
 * 2. アクセストークンを取得（ブラウザのCookieから）
 * 3. node scripts/test-google-api.js [ACCESS_TOKEN]
 */

const https = require("https");

// 環境変数の読み込み
require("dotenv").config({ path: ".env.local" });

function makeRequest(url, token) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.get(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

async function testGoogleAPI(accessToken) {
  console.log("🔍 Google Business Profile API テスト開始");
  console.log("🔑 アクセストークン:", accessToken.substring(0, 30) + "...");
  console.log("");

  try {
    // 1. ユーザー情報の取得
    console.log("👤 ユーザー情報の取得...");
    const userResponse = await makeRequest(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      accessToken
    );

    console.log(`   ステータス: ${userResponse.status}`);
    if (userResponse.status === 200) {
      console.log(`   ユーザー: ${userResponse.data.email}`);
      console.log(`   名前: ${userResponse.data.name}`);
    } else {
      console.log(`   エラー:`, userResponse.data);
      return;
    }
    console.log("");

    // 2. アカウント情報の取得
    console.log("🏢 Google Business アカウント情報の取得...");
    const accountsResponse = await makeRequest(
      "https://mybusinessbusinessinformation.googleapis.com/v1/accounts",
      accessToken
    );

    console.log(`   ステータス: ${accountsResponse.status}`);
    if (accountsResponse.status === 200) {
      const accounts = accountsResponse.data.accounts || [];
      console.log(`   アカウント数: ${accounts.length}`);

      if (accounts.length > 0) {
        accounts.forEach((account, index) => {
          console.log(`   アカウント ${index + 1}: ${account.name}`);
        });

        // 3. 店舗情報の取得（最初のアカウントのみ）
        const firstAccount = accounts[0];
        console.log("");
        console.log(`🏪 店舗情報の取得 (${firstAccount.name})...`);

        const locationsResponse = await makeRequest(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${firstAccount.name}/locations`,
          accessToken
        );

        console.log(`   ステータス: ${locationsResponse.status}`);
        if (locationsResponse.status === 200) {
          const locations = locationsResponse.data.locations || [];
          console.log(`   店舗数: ${locations.length}`);

          locations.forEach((location, index) => {
            console.log(
              `   店舗 ${index + 1}: ${location.displayName || location.title}`
            );
            if (location.storefrontAddress) {
              const address =
                location.storefrontAddress.addressLines?.join(", ") ||
                "住所未設定";
              console.log(`             住所: ${address}`);
            }
          });
        } else {
          console.log(`   エラー:`, locationsResponse.data);
        }
      }
    } else {
      console.log(`   エラー:`, accountsResponse.data);

      if (accountsResponse.status === 403) {
        console.log("");
        console.log("🔐 403エラーの対処法:");
        console.log(
          "   1. Google Cloud Console で Google My Business API を有効化"
        );
        console.log(
          "   2. OAuth スコープに https://www.googleapis.com/auth/business.manage を追加"
        );
        console.log("   3. Google Business Profile でビジネスを登録・確認");
        console.log(
          "   4. ユーザーがビジネスのオーナーまたは管理者である必要があります"
        );
      }
    }
  } catch (error) {
    console.error("💥 テスト中にエラーが発生:", error.message);
  }
}

// メイン実行
const accessToken = process.argv[2];

if (!accessToken) {
  console.log("使用方法: node scripts/test-google-api.js [ACCESS_TOKEN]");
  console.log("");
  console.log("アクセストークンの取得方法:");
  console.log("1. ブラウザでアプリケーションにアクセス");
  console.log("2. Google認証を実行");
  console.log("3. ブラウザの開発者ツールを開く");
  console.log("4. Application > Cookies > google_access_token の値をコピー");
  console.log("");
  process.exit(1);
}

testGoogleAPI(accessToken);
