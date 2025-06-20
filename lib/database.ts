// データベース層 - 実際のデータ管理
// 注意: 本番環境ではPrisma, Supabase, PostgreSQL等を使用してください

import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const STORES_FILE = path.join(DATA_DIR, "stores.json");

interface User {
  id: string;
  email: string;
  name: string;
  role: "owner" | "manager" | "staff";
  companyName: string;
  isGoogleConnected: boolean;
  createdAt: Date;
}

interface Store {
  id: string;
  userId: string;
  googleLocationId?: string;
  displayName: string;
  address: string;
  phone?: string;
  website?: string;
  category?: string;
  isTestStore: boolean;
  createdAt: Date;
  updatedAt: Date;
  googleReviewUrl?: string;
}

interface QRCode {
  id: string;
  storeId: string;
  userId: string;
  name: string;
  type: "review" | "survey" | "contact";
  url: string;
  scans: number;
  createdAt: Date;
  lastScannedAt?: Date;
}

interface Review {
  id: string;
  storeId: string;
  userId: string;
  googleReviewId?: string;
  rating: number;
  text: string;
  authorName: string;
  isTestData: boolean;
  createdAt: Date;
  replied: boolean;
  replyText?: string;
}

interface Survey {
  id: string;
  storeId: string;
  userId: string;
  name: string;
  questions: SurveyQuestion[];
  responses: number;
  createdAt: Date;
  isActive: boolean;
}

interface SurveyQuestion {
  id: string;
  type: "text" | "rating" | "choice";
  question: string;
  required: boolean;
  options?: string[];
}

interface SurveyResponse {
  id: string;
  surveyId: string;
  storeId: string;
  responses: Record<string, any>;
  createdAt: Date;
}

// インメモリデータストア（本番環境では実際のDBに置き換え）
class Database {
  private users: User[] = [
    {
      id: "1",
      email: "demo@hiidel.com",
      name: "デモユーザー",
      role: "owner",
      companyName: "デモ株式会社",
      isGoogleConnected: true, // Google連携済みに変更
      createdAt: new Date("2024-01-01"),
    },
  ];

  private stores: Store[] = [];
  private qrCodes: QRCode[] = [];
  private reviews: Review[] = [];
  private surveys: Survey[] = [];
  private surveyResponses: SurveyResponse[] = [];

  constructor() {
    this.initializeDataDir();
    this.loadStoresFromFile();
  }

  private async initializeDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
      console.error("Failed to create data directory:", error);
    }
  }

  private async loadStoresFromFile() {
    try {
      const data = await fs.readFile(STORES_FILE, "utf-8");
      const parsedData = JSON.parse(data);
      this.stores = parsedData.map((store: any) => ({
        ...store,
        createdAt: new Date(store.createdAt),
        updatedAt: new Date(store.updatedAt),
      }));
      console.log(`📂 Loaded ${this.stores.length} stores from file`);
    } catch (error) {
      console.log(
        "📂 No existing stores file found, starting with empty stores"
      );
      this.stores = [];
    }
  }

  private async saveStoresToFile() {
    try {
      await fs.writeFile(STORES_FILE, JSON.stringify(this.stores, null, 2));
      console.log(`💾 Saved ${this.stores.length} stores to file`);
    } catch (error) {
      console.error("Failed to save stores to file:", error);
    }
  }

  // ユーザー管理
  async getUser(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) || null;
  }

  async updateUserGoogleConnection(
    email: string,
    isConnected: boolean
  ): Promise<void> {
    const user = this.users.find((user) => user.email === email);
    if (user) {
      user.isGoogleConnected = isConnected;
    }
  }

  // 店舗管理
  async getStores(userId: string): Promise<Store[]> {
    // ファイルから最新のデータを読み込む
    await this.loadStoresFromFile();

    console.log(`📊 DB.getStores called - userId: ${userId}`);
    console.log(`📊 Total stores in database: ${this.stores.length}`);
    console.log(`📊 All stores:`, this.stores);

    const userStores = this.stores.filter((store) => store.userId === userId);
    console.log(`📊 Stores for user ${userId}: ${userStores.length}`);
    console.log(`📊 User stores:`, userStores);

    return userStores;
  }

  async createStore(
    storeData: Omit<Store, "id" | "createdAt" | "updatedAt">
  ): Promise<Store> {
    console.log(`➕ DB.createStore called with data:`, storeData);

    // ファイルから最新のデータを読み込む
    await this.loadStoresFromFile();
    console.log(`📊 Stores before creation: ${this.stores.length}`);

    const store: Store = {
      ...storeData,
      id: `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log(`✅ New store object created:`, store);
    this.stores.push(store);
    console.log(`📊 Stores after creation: ${this.stores.length}`);
    console.log(`📊 All stores in database:`, this.stores);

    // ファイルに保存
    await this.saveStoresToFile();

    return store;
  }

  async deleteStore(storeId: string, userId: string): Promise<boolean> {
    // ファイルから最新のデータを読み込む
    await this.loadStoresFromFile();

    const index = this.stores.findIndex(
      (store) => store.id === storeId && store.userId === userId
    );
    if (index !== -1) {
      this.stores.splice(index, 1);

      // ファイルに保存
      await this.saveStoresToFile();

      // 関連データも削除
      this.qrCodes = this.qrCodes.filter((qr) => qr.storeId !== storeId);
      this.reviews = this.reviews.filter(
        (review) => review.storeId !== storeId
      );
      this.surveys = this.surveys.filter(
        (survey) => survey.storeId !== storeId
      );
      return true;
    }
    return false;
  }

  // QRコード管理
  async getQRCodes(userId: string, storeId?: string): Promise<QRCode[]> {
    let qrCodes = this.qrCodes.filter((qr) => qr.userId === userId);
    if (storeId) {
      qrCodes = qrCodes.filter((qr) => qr.storeId === storeId);
    }
    return qrCodes;
  }

  async createQRCode(
    qrData: Omit<QRCode, "id" | "scans" | "createdAt">
  ): Promise<QRCode> {
    const qrCode: QRCode = {
      ...qrData,
      id: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scans: 0,
      createdAt: new Date(),
    };
    this.qrCodes.push(qrCode);
    return qrCode;
  }

  async incrementQRScan(qrId: string): Promise<void> {
    const qrCode = this.qrCodes.find((qr) => qr.id === qrId);
    if (qrCode) {
      qrCode.scans++;
      qrCode.lastScannedAt = new Date();
    }
  }

  async deleteQRCode(qrId: string, userId: string): Promise<boolean> {
    const index = this.qrCodes.findIndex(
      (qr) => qr.id === qrId && qr.userId === userId
    );
    if (index !== -1) {
      this.qrCodes.splice(index, 1);
      return true;
    }
    return false;
  }

  // レビュー管理
  async getReviews(userId: string, storeId?: string): Promise<Review[]> {
    let reviews = this.reviews.filter((review) => review.userId === userId);
    if (storeId) {
      reviews = reviews.filter((review) => review.storeId === storeId);
    }
    return reviews.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createReview(
    reviewData: Omit<Review, "id" | "createdAt">
  ): Promise<Review> {
    const review: Review = {
      ...reviewData,
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    this.reviews.push(review);
    return review;
  }

  async replyToReview(
    reviewId: string,
    replyText: string,
    userId: string
  ): Promise<boolean> {
    const review = this.reviews.find(
      (r) => r.id === reviewId && r.userId === userId
    );
    if (review) {
      review.replied = true;
      review.replyText = replyText;
      return true;
    }
    return false;
  }

  // アンケート管理
  async getSurveys(userId: string, storeId?: string): Promise<Survey[]> {
    let surveys = this.surveys.filter((survey) => survey.userId === userId);
    if (storeId) {
      surveys = surveys.filter((survey) => survey.storeId === storeId);
    }
    return surveys;
  }

  async createSurvey(
    surveyData: Omit<Survey, "id" | "responses" | "createdAt">
  ): Promise<Survey> {
    const survey: Survey = {
      ...surveyData,
      id: `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responses: 0,
      createdAt: new Date(),
    };
    this.surveys.push(survey);
    return survey;
  }

  async createSurveyResponse(
    responseData: Omit<SurveyResponse, "id" | "createdAt">
  ): Promise<SurveyResponse> {
    const response: SurveyResponse = {
      ...responseData,
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    this.surveyResponses.push(response);

    // サーベイの回答数を増加
    const survey = this.surveys.find((s) => s.id === responseData.surveyId);
    if (survey) {
      survey.responses++;
    }

    return response;
  }

  async getSurveyResponses(
    surveyId: string,
    userId: string
  ): Promise<SurveyResponse[]> {
    return this.surveyResponses.filter(
      (response) =>
        response.surveyId === surveyId &&
        this.surveys.find((s) => s.id === surveyId && s.userId === userId)
    );
  }

  // 分析データ
  async getAnalytics(userId: string, storeId?: string) {
    const stores = await this.getStores(userId);
    const targetStores = storeId
      ? stores.filter((s) => s.id === storeId)
      : stores;

    const reviews = await this.getReviews(userId, storeId);
    const qrCodes = await this.getQRCodes(userId, storeId);
    const surveys = await this.getSurveys(userId, storeId);

    // 基本統計
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;
    const totalQRScans = qrCodes.reduce((sum, qr) => sum + qr.scans, 0);
    const totalSurveyResponses = surveys.reduce(
      (sum, s) => sum + s.responses,
      0
    );

    // 未返信レビュー
    const unansweredReviews = reviews.filter((r) => !r.replied).length;

    // 今日の活動
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayReviews = reviews.filter((r) => r.createdAt >= today).length;
    const todayScans = qrCodes.filter(
      (qr) => qr.lastScannedAt && qr.lastScannedAt >= today
    ).length;

    // 返信率
    const responseRate =
      totalReviews > 0
        ? Math.round(((totalReviews - unansweredReviews) / totalReviews) * 100)
        : 0;

    return {
      totalStores: targetStores.length,
      totalReviews,
      averageRating: Math.round(averageRating * 100) / 100,
      unansweredReviews,
      responseRate,
      totalQRScans,
      totalSurveyResponses,
      todayReviews,
      todayScans,
      hasRealData: stores.some((s) => !s.isTestStore),
    };
  }

  // テストデータの初期化
  async initializeTestData(userId: string): Promise<void> {
    const user = await this.getUser("demo@hiidel.com");
    if (!user || user.id !== userId) return;

    // 既存のテストデータを削除
    this.stores = this.stores.filter(
      (s) => s.userId !== userId || !s.isTestStore
    );
    this.reviews = this.reviews.filter(
      (r) => r.userId !== userId || !r.isTestData
    );
    this.qrCodes = this.qrCodes.filter((q) => q.userId !== userId);

    // テスト店舗を作成
    const testStore = await this.createStore({
      userId,
      displayName: "HIIDELテスト店舗",
      address: "東京都渋谷区渋谷1-1-1",
      phone: "03-1234-5678",
      website: "http://localhost:3000",
      category: "テクノロジー",
      isTestStore: true,
    });

    // テストレビューを作成
    const reviewTexts = [
      "素晴らしいサービスでした！スタッフの対応も丁寧で、また利用したいと思います。",
      "商品の品質が高く、価格も適正だと思います。おすすめです。",
      "店舗の雰囲気が良く、居心地が良かったです。",
      "迅速な対応をしていただき、ありがとうございました。",
      "改善の余地はありますが、全体的には満足しています。",
    ];

    for (let i = 0; i < 5; i++) {
      await this.createReview({
        storeId: testStore.id,
        userId,
        rating: Math.floor(Math.random() * 2) + 4, // 4-5の評価
        text: reviewTexts[i],
        authorName: `テストユーザー${i + 1}`,
        isTestData: true,
        replied: i < 3, // 最初の3件は返信済み
        replyText: i < 3 ? "ご利用いただき、ありがとうございます！" : undefined,
      });
    }

    // テストQRコードを作成
    await this.createQRCode({
      storeId: testStore.id,
      userId,
      name: "レビュー収集用QR",
      type: "review",
      url: `http://localhost:3000/review/${testStore.id}`,
    });

    await this.createQRCode({
      storeId: testStore.id,
      userId,
      name: "アンケート用QR",
      type: "survey",
      url: `http://localhost:3000/survey/${testStore.id}`,
    });

    // テストアンケートを作成
    const testSurvey = await this.createSurvey({
      storeId: testStore.id,
      userId,
      name: "顧客満足度調査",
      questions: [
        {
          id: "q1",
          type: "rating",
          question: "総合的な満足度を教えてください",
          required: true,
        },
        {
          id: "q2",
          type: "text",
          question: "改善点があれば教えてください",
          required: false,
        },
      ],
      isActive: true,
    });

    // テストアンケート回答を作成（改善点フィードバック用）
    const improvementFeedbacks = [
      {
        rating: 2,
        improvementText: "部屋が、少し汚かったです😅",
      },
      {
        rating: 3,
        improvementText: "クーラーから水がかかり漏れてます",
      },
      {
        rating: 3,
        improvementText:
          "床に水(空調から？)が溜まっていたのは困りましたが、スタッフの方はとても丁寧に対応していただきました。床のハッチ部分も壊れていて踏むと沈んで危ないので、直していただけると幸いです。",
      },
      {
        rating: 2,
        improvementText:
          "部屋は綺麗ですが、階段で4階はキツかったです。不便さ、箱の小ささを考えると料金は高く感じました。",
      },
    ];

    for (let i = 0; i < improvementFeedbacks.length; i++) {
      const feedback = improvementFeedbacks[i];
      await this.createSurveyResponse({
        surveyId: testSurvey.id,
        storeId: testStore.id,
        responses: {
          q1: feedback.rating,
          improvementText: feedback.improvementText,
        },
      });
    }
  }
}

// シングルトンインスタンス
export const db = new Database();

export type {
  User,
  Store,
  QRCode,
  Review,
  Survey,
  SurveyQuestion,
  SurveyResponse,
};
