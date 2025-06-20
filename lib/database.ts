// データベース層 - 実際のデータ管理
// 注意: 本番環境ではPrisma, Supabase, PostgreSQL等を使用してください

import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const STORES_FILE = path.join(DATA_DIR, "stores.json");
const SURVEYS_FILE = path.join(DATA_DIR, "surveys.json");
const SURVEY_RESPONSES_FILE = path.join(DATA_DIR, "survey-responses.json");

// Vercel環境での永続化のためのグローバルストレージ
declare global {
  var __HIIDEL_STORES__: Store[] | undefined;
  var __HIIDEL_SURVEYS__: Survey[] | undefined;
  var __HIIDEL_REVIEWS__: Review[] | undefined;
  var __HIIDEL_QR_CODES__: QRCode[] | undefined;
  var __HIIDEL_SURVEY_RESPONSES__: SurveyResponse[] | undefined;
  var __HIIDEL_INITIALIZED__: boolean | undefined;
}

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
  placeId?: string;
  rating?: number;
  reviewCount?: number;
  isActive?: boolean;
  title?: string;
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

class Database {
  private users: User[] = [
    {
      id: "1",
      email: "demo@hiidel.com",
      name: "Demo User",
      role: "owner",
      companyName: "HIIDEL株式会社",
      isGoogleConnected: false,
      createdAt: new Date(),
    },
  ];

  // グローバルストレージを使用
  private get stores(): Store[] {
    return global.__HIIDEL_STORES__ || [];
  }

  private set stores(value: Store[]) {
    global.__HIIDEL_STORES__ = value;
  }

  private get surveys(): Survey[] {
    return global.__HIIDEL_SURVEYS__ || [];
  }

  private set surveys(value: Survey[]) {
    global.__HIIDEL_SURVEYS__ = value;
  }

  private get reviews(): Review[] {
    return global.__HIIDEL_REVIEWS__ || [];
  }

  private set reviews(value: Review[]) {
    global.__HIIDEL_REVIEWS__ = value;
  }

  private get qrCodes(): QRCode[] {
    return global.__HIIDEL_QR_CODES__ || [];
  }

  private set qrCodes(value: QRCode[]) {
    global.__HIIDEL_QR_CODES__ = value;
  }

  private get surveyResponses(): SurveyResponse[] {
    return global.__HIIDEL_SURVEY_RESPONSES__ || [];
  }

  private set surveyResponses(value: SurveyResponse[]) {
    global.__HIIDEL_SURVEY_RESPONSES__ = value;
  }

  private get initialized(): boolean {
    return global.__HIIDEL_INITIALIZED__ || false;
  }

  private set initialized(value: boolean) {
    global.__HIIDEL_INITIALIZED__ = value;
  }

  constructor() {
    // 初期化は非同期で行う
    this.initializeDataDir().catch(console.error);
  }

  // 初回アクセス時にすべてのデータを読み込む
  private async ensureInitialized() {
    if (this.initialized) {
      console.log("✅ Database already initialized");
      return;
    }

    console.log("🔄 Initializing database data...");

    try {
      await Promise.all([
        this.loadStoresFromFile(),
        this.loadSurveysFromFile(),
        this.loadReviewsFromFile(),
      ]);

      this.initialized = true;
      console.log("✅ Database initialization complete");
      console.log(
        `📊 Loaded data: ${this.stores.length} stores, ${this.surveys.length} surveys, ${this.reviews.length} reviews`
      );
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      // 初期化に失敗した場合でも、デフォルトデータで続行
      this.initializeDefaultData();
      this.initialized = true;
    }
  }

  private initializeDefaultData() {
    console.log("🔧 Initializing default data...");

    if (this.stores.length === 0) {
      this.stores = [
        {
          id: "demo-store-1",
          userId: "1",
          googleLocationId: "ChIJiXXOObgJAWAR6RUFpc_1Esw",
          displayName: "レンタルスタジオ Dancers四条烏丸店",
          address: "京都府京都市下京区芦刈山町136 HOSEIビル 4階 401号室",
          phone: "075-123-4567",
          website: "https://dancers-studio.com",
          category: "レンタルスタジオ",
          isTestStore: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          googleReviewUrl:
            "https://search.google.com/local/writereview?placeid=ChIJiXXOObgJAWAR6RUFpc_1Esw",
          placeId: "ChIJiXXOObgJAWAR6RUFpc_1Esw",
          rating: 4.5,
          reviewCount: 25,
          isActive: true,
        },
      ];
    }

    if (this.surveys.length === 0) {
      this.surveys = [
        {
          id: "demo-survey-1",
          storeId: "demo-store-1",
          userId: "1",
          name: "カフェ満足度調査",
          questions: [
            {
              id: "q1",
              type: "rating" as const,
              question: "サービスの満足度を教えてください",
              required: true,
              options: [],
            },
            {
              id: "q2",
              type: "text" as const,
              question: "改善点があれば教えてください",
              required: false,
              options: [],
            },
          ],
          responses: 0,
          createdAt: new Date(),
          isActive: true,
        },
      ];
    }

    if (this.reviews.length === 0) {
      this.reviews = [
        {
          id: "demo-review-1",
          storeId: "demo-store-1",
          userId: "1",
          rating: 5,
          text: "素晴らしいサービスでした！",
          authorName: "田中太郎",
          isTestData: true,
          createdAt: new Date(),
          replied: false,
        },
        {
          id: "demo-review-2",
          storeId: "demo-store-1",
          userId: "1",
          rating: 4,
          text: "スタッフの対応が丁寧でした。",
          authorName: "佐藤花子",
          isTestData: true,
          createdAt: new Date(),
          replied: true,
          replyText: "ありがとうございます！",
        },
      ];
    }

    console.log("✅ Default data initialized");
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
      if (process.env.VERCEL) {
        console.log(`⚠️ Vercel環境：グローバルストレージを使用`);
        return;
      }

      const data = await fs.readFile(STORES_FILE, "utf-8");
      const parsedData = JSON.parse(data);
      this.stores = parsedData.map((store: any) => ({
        ...store,
        createdAt: new Date(store.createdAt),
        updatedAt: new Date(store.updatedAt),
      }));
      console.log(`📂 Loaded ${this.stores.length} stores from file`);
    } catch (error) {
      console.log("📂 No existing stores file found, using default data");
    }
  }

  private async saveStoresToFile() {
    try {
      if (process.env.VERCEL) {
        console.log(
          `💾 Vercel環境：グローバルストレージに保存 (${this.stores.length}件)`
        );
        return;
      }

      await fs.writeFile(STORES_FILE, JSON.stringify(this.stores, null, 2));
      console.log(`💾 Saved ${this.stores.length} stores to file`);
    } catch (error) {
      console.error("Failed to save stores to file:", error);
    }
  }

  private async loadSurveysFromFile() {
    try {
      if (process.env.VERCEL) {
        console.log(`⚠️ Vercel環境：グローバルストレージを使用`);
        return;
      }

      const data = await fs.readFile(SURVEYS_FILE, "utf-8");
      const parsedData = JSON.parse(data);
      this.surveys = parsedData.map((survey: any) => ({
        ...survey,
        createdAt: new Date(survey.createdAt),
      }));
      console.log(`📂 Loaded ${this.surveys.length} surveys from file`);
    } catch (error) {
      console.log("📂 No existing surveys file found, using default data");
    }
  }

  private async saveSurveysToFile() {
    try {
      if (process.env.VERCEL) {
        console.log(
          `💾 Vercel環境：グローバルストレージに保存 (${this.surveys.length}件)`
        );
        return;
      }

      await fs.writeFile(SURVEYS_FILE, JSON.stringify(this.surveys, null, 2));
      console.log(`💾 Saved ${this.surveys.length} surveys to file`);
    } catch (error) {
      console.error("Failed to save surveys to file:", error);
    }
  }

  private async loadReviewsFromFile() {
    try {
      // レビューは初期データのみ使用
      console.log(`📂 Using default review data`);
    } catch (error) {
      console.log("📂 No existing reviews file found, using default data");
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
    await this.ensureInitialized();

    console.log(`📊 DB.getStores called - userId: ${userId}`);
    console.log(`📊 Total stores in database: ${this.stores.length}`);

    const userStores = this.stores.filter((store) => store.userId === userId);
    console.log(`📊 Stores for user ${userId}: ${userStores.length}`);

    return userStores;
  }

  async createStore(
    storeData: Omit<Store, "id" | "createdAt" | "updatedAt">
  ): Promise<Store> {
    await this.ensureInitialized();

    console.log(`➕ DB.createStore called with data:`, storeData);

    const store: Store = {
      ...storeData,
      id: `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: storeData.isActive ?? true,
      rating: storeData.rating ?? 0,
      reviewCount: storeData.reviewCount ?? 0,
    };

    this.stores = [...this.stores, store];
    console.log(`✅ New store created: ${store.id}`);
    console.log(`📊 Total stores after creation: ${this.stores.length}`);

    await this.saveStoresToFile();
    return store;
  }

  async deleteStore(storeId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();

    const initialLength = this.stores.length;
    this.stores = this.stores.filter(
      (store) => !(store.id === storeId && store.userId === userId)
    );

    if (this.stores.length < initialLength) {
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
    await this.ensureInitialized();

    let qrCodes = this.qrCodes.filter((qr) => qr.userId === userId);
    if (storeId) {
      qrCodes = qrCodes.filter((qr) => qr.storeId === storeId);
    }
    return qrCodes;
  }

  async createQRCode(
    qrData: Omit<QRCode, "id" | "scans" | "createdAt">
  ): Promise<QRCode> {
    await this.ensureInitialized();

    const qrCode: QRCode = {
      ...qrData,
      id: `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scans: 0,
      createdAt: new Date(),
    };

    this.qrCodes = [...this.qrCodes, qrCode];
    return qrCode;
  }

  async incrementQRScan(qrId: string): Promise<void> {
    await this.ensureInitialized();

    const qrCode = this.qrCodes.find((qr) => qr.id === qrId);
    if (qrCode) {
      qrCode.scans++;
      qrCode.lastScannedAt = new Date();
    }
  }

  async deleteQRCode(qrId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();

    const initialLength = this.qrCodes.length;
    this.qrCodes = this.qrCodes.filter(
      (qr) => !(qr.id === qrId && qr.userId === userId)
    );
    return this.qrCodes.length < initialLength;
  }

  // レビュー管理
  async getReviews(userId: string, storeId?: string): Promise<Review[]> {
    await this.ensureInitialized();

    let reviews = this.reviews.filter((review) => review.userId === userId);
    if (storeId) {
      reviews = reviews.filter((review) => review.storeId === storeId);
    }
    return reviews;
  }

  async createReview(
    reviewData: Omit<Review, "id" | "createdAt">
  ): Promise<Review> {
    await this.ensureInitialized();

    const review: Review = {
      ...reviewData,
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    this.reviews = [...this.reviews, review];
    return review;
  }

  async replyToReview(
    reviewId: string,
    replyText: string,
    userId: string
  ): Promise<boolean> {
    await this.ensureInitialized();

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
    await this.ensureInitialized();

    let surveys = this.surveys.filter((survey) => survey.userId === userId);
    if (storeId) {
      surveys = surveys.filter((survey) => survey.storeId === storeId);
    }
    console.log(`📊 Found ${surveys.length} surveys for user ${userId}`);
    return surveys;
  }

  async createSurvey(
    surveyData: Omit<Survey, "id" | "responses" | "createdAt">
  ): Promise<Survey> {
    await this.ensureInitialized();

    console.log(`➕ Creating survey:`, surveyData);

    const survey: Survey = {
      ...surveyData,
      id: `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responses: 0,
      createdAt: new Date(),
    };

    this.surveys = [...this.surveys, survey];
    console.log(
      `✅ Survey created: ${survey.id}, total surveys: ${this.surveys.length}`
    );

    await this.saveSurveysToFile();
    return survey;
  }

  async createSurveyResponse(
    responseData: Omit<SurveyResponse, "id" | "createdAt">
  ): Promise<SurveyResponse> {
    await this.ensureInitialized();

    console.log(`➕ Creating survey response:`, responseData);

    const response: SurveyResponse = {
      ...responseData,
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    this.surveyResponses = [...this.surveyResponses, response];

    // サーベイの回答数を増加
    const survey = this.surveys.find((s) => s.id === responseData.surveyId);
    if (survey) {
      survey.responses++;
      console.log(`✅ Survey response count updated: ${survey.responses}`);
    }

    console.log(`✅ Survey response created: ${response.id}`);
    return response;
  }

  async getSurveyResponses(
    surveyId: string,
    userId: string
  ): Promise<SurveyResponse[]> {
    await this.ensureInitialized();

    const responses = this.surveyResponses.filter(
      (response) =>
        response.surveyId === surveyId &&
        this.surveys.find((s) => s.id === surveyId && s.userId === userId)
    );

    console.log(
      `📊 Found ${responses.length} responses for survey ${surveyId}`
    );
    return responses;
  }

  // 分析データ
  async getAnalytics(userId: string, storeId?: string) {
    await this.ensureInitialized();

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
    await this.ensureInitialized();

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

    console.log("✅ Test data initialized successfully");
  }
}

// シングルトンパターンでデータベースインスタンスを管理
function getDatabase(): Database {
  if (!global.__HIIDEL_DB_INSTANCE__) {
    global.__HIIDEL_DB_INSTANCE__ = new Database();
  }
  return global.__HIIDEL_DB_INSTANCE__;
}

declare global {
  var __HIIDEL_DB_INSTANCE__: Database | undefined;
}

export const db = getDatabase();
export type { Store, Survey, Review, QRCode, SurveyResponse, SurveyQuestion };
