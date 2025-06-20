// データベース層 - 実際のデータ管理
// 注意: 本番環境ではPrisma, Supabase, PostgreSQL等を使用してください

import { promises as fs } from "fs";
import path from "path";
import { cache } from "./cache";
import Redis from "ioredis";

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
  var __HIIDEL_USERS__: User[] | undefined;
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

// Redis クライアント
class RedisClient {
  private redis: Redis | null = null;
  private isConnecting = false;

  constructor() {
    this.connect();
  }

  private async connect() {
    if (this.isConnecting || this.redis) return;

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      console.log("⚠️ REDIS_URL not found, Redis will not be available");
      return;
    }

    try {
      this.isConnecting = true;
      console.log("🔄 Connecting to Redis...");

      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      // 接続テスト
      await this.redis.ping();
      console.log("✅ Redis connected successfully");

      this.redis.on("error", (error) => {
        console.error("❌ Redis connection error:", error);
        this.redis = null;
      });

      this.redis.on("close", () => {
        console.log("🔌 Redis connection closed");
        this.redis = null;
      });
    } catch (error) {
      console.error("❌ Failed to connect to Redis:", error);
      this.redis = null;
    } finally {
      this.isConnecting = false;
    }
  }

  isAvailable(): boolean {
    return !!this.redis;
  }

  async get(key: string): Promise<any> {
    if (!this.isAvailable()) return null;

    try {
      const value = await this.redis!.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET error for ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.redis!.set(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Redis SET error for ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      await this.redis!.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for ${key}:`, error);
      return false;
    }
  }
}

// データベースキー定義
const KEYS = {
  STORES: "hiidel:stores",
  SURVEYS: "hiidel:surveys",
  REVIEWS: "hiidel:reviews",
  QR_CODES: "hiidel:qr_codes",
  SURVEY_RESPONSES: "hiidel:survey_responses",
  USERS: "hiidel:users",
  INITIALIZED: "hiidel:initialized",
};

class Database {
  private redis: RedisClient;
  private initialized = false;

  private defaultUsers: User[] = [
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

  constructor() {
    this.redis = new RedisClient();
  }

  // 初期化チェック
  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    console.log("🔄 Initializing database...");

    if (!this.redis.isAvailable()) {
      console.log("⚠️ Redis not available, initializing global storage");
      this.initializeGlobalStorage();
      this.initialized = true;
      return;
    }

    try {
      const isInitialized = await this.redis.get(KEYS.INITIALIZED);
      if (isInitialized) {
        console.log("✅ Database already initialized");
        this.initialized = true;
        return;
      }

      console.log("🔄 Initializing default data in Redis...");
      await this.initializeDefaultData();
      await this.redis.set(KEYS.INITIALIZED, true);
      console.log("✅ Database initialization complete");
      this.initialized = true;
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      this.initializeGlobalStorage();
      this.initialized = true;
    }
  }

  // グローバルストレージの初期化（フォールバック）
  private initializeGlobalStorage(): void {
    if (!global.__HIIDEL_STORES__) {
      global.__HIIDEL_STORES__ = [
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

    if (!global.__HIIDEL_SURVEYS__) {
      global.__HIIDEL_SURVEYS__ = [
        {
          id: "demo-survey-1",
          storeId: "demo-store-1",
          userId: "1",
          name: "カフェ満足度調査",
          questions: [
            {
              id: "q1",
              type: "rating",
              question: "サービスの満足度を教えてください",
              required: true,
              options: [],
            },
            {
              id: "q2",
              type: "text",
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

    if (!global.__HIIDEL_REVIEWS__) {
      global.__HIIDEL_REVIEWS__ = [
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

    if (!global.__HIIDEL_QR_CODES__) global.__HIIDEL_QR_CODES__ = [];
    if (!global.__HIIDEL_SURVEY_RESPONSES__)
      global.__HIIDEL_SURVEY_RESPONSES__ = [];
    if (!global.__HIIDEL_USERS__) global.__HIIDEL_USERS__ = this.defaultUsers;

    console.log("✅ Global storage initialized");
  }

  // デフォルトデータの初期化（Redis用）
  private async initializeDefaultData(): Promise<void> {
    const defaultStores = [
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

    const defaultSurveys = [
      {
        id: "demo-survey-1",
        storeId: "demo-store-1",
        userId: "1",
        name: "カフェ満足度調査",
        questions: [
          {
            id: "q1",
            type: "rating",
            question: "サービスの満足度を教えてください",
            required: true,
            options: [],
          },
          {
            id: "q2",
            type: "text",
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

    const defaultReviews = [
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

    // Redisに保存
    await Promise.all([
      this.redis.set(KEYS.STORES, defaultStores),
      this.redis.set(KEYS.SURVEYS, defaultSurveys),
      this.redis.set(KEYS.REVIEWS, defaultReviews),
      this.redis.set(KEYS.QR_CODES, []),
      this.redis.set(KEYS.SURVEY_RESPONSES, []),
      this.redis.set(KEYS.USERS, this.defaultUsers),
    ]);

    console.log("✅ Default data initialized in Redis");
  }

  // データの取得（Redis優先、フォールバック付き）
  private async getData<T>(
    key: string,
    globalKey: keyof typeof global,
    fallback: T[]
  ): Promise<T[]> {
    await this.ensureInitialized();

    // Redisから取得を試行
    if (this.redis.isAvailable()) {
      try {
        const data = await this.redis.get(key);
        if (data && Array.isArray(data)) {
          // 日付オブジェクトの復元
          const restoredData = data.map((item: any) => ({
            ...item,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
          }));
          console.log(
            `📊 Retrieved ${restoredData.length} items from Redis: ${key}`
          );
          return restoredData;
        }
      } catch (error) {
        console.error(`❌ Redis get error for ${key}:`, error);
      }
    }

    // フォールバック: グローバルストレージから取得
    const globalData = (global as any)[globalKey] || fallback;
    console.log(
      `📂 Using fallback data for ${key}: ${globalData.length} items`
    );
    return globalData;
  }

  // データの保存（Redis優先、フォールバック付き）
  private async setData<T>(
    key: string,
    globalKey: keyof typeof global,
    data: T[]
  ): Promise<void> {
    // グローバルストレージには常に保存（即座にアクセス可能）
    (global as any)[globalKey] = data;

    // Redisにも保存を試行
    if (this.redis.isAvailable()) {
      try {
        const success = await this.redis.set(key, data);
        if (success) {
          console.log(`💾 Saved ${data.length} items to Redis: ${key}`);
        } else {
          console.log(
            `⚠️ Failed to save to Redis: ${key}, using global storage only`
          );
        }
      } catch (error) {
        console.error(`❌ Redis set error for ${key}:`, error);
      }
    } else {
      console.log(`💾 Saved ${data.length} items to global storage: ${key}`);
    }
  }

  // ユーザー管理
  async getUser(email: string): Promise<User | null> {
    const users = await this.getData(
      KEYS.USERS,
      "__HIIDEL_USERS__",
      this.defaultUsers
    );
    return users.find((user) => user.email === email) || null;
  }

  async updateUserGoogleConnection(
    email: string,
    isConnected: boolean
  ): Promise<void> {
    const users = await this.getData(
      KEYS.USERS,
      "__HIIDEL_USERS__",
      this.defaultUsers
    );
    const user = users.find((user) => user.email === email);
    if (user) {
      user.isGoogleConnected = isConnected;
      await this.setData(KEYS.USERS, "__HIIDEL_USERS__", users);
    }
  }

  // 店舗管理
  async getStores(userId: string): Promise<Store[]> {
    console.log(`📊 DB.getStores called - userId: ${userId}`);

    const allStores = await this.getData<Store>(
      KEYS.STORES,
      "__HIIDEL_STORES__",
      []
    );
    const userStores = allStores.filter((store) => store.userId === userId);

    console.log(`📊 Found ${userStores.length} stores for user ${userId}`);
    return userStores;
  }

  async createStore(
    storeData: Omit<Store, "id" | "createdAt" | "updatedAt">
  ): Promise<Store> {
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

    const allStores = await this.getData<Store>(
      KEYS.STORES,
      "__HIIDEL_STORES__",
      []
    );
    allStores.push(store);
    await this.setData(KEYS.STORES, "__HIIDEL_STORES__", allStores);

    console.log(`✅ New store created: ${store.id}`);
    console.log(`📊 Total stores after creation: ${allStores.length}`);

    return store;
  }

  async deleteStore(storeId: string, userId: string): Promise<boolean> {
    const allStores = await this.getData<Store>(
      KEYS.STORES,
      "__HIIDEL_STORES__",
      []
    );
    const initialLength = allStores.length;

    const updatedStores = allStores.filter(
      (store) => !(store.id === storeId && store.userId === userId)
    );

    if (updatedStores.length < initialLength) {
      await this.setData(KEYS.STORES, "__HIIDEL_STORES__", updatedStores);

      // 関連データも削除
      const [qrCodes, reviews, surveys] = await Promise.all([
        this.getData<QRCode>(KEYS.QR_CODES, "__HIIDEL_QR_CODES__", []),
        this.getData<Review>(KEYS.REVIEWS, "__HIIDEL_REVIEWS__", []),
        this.getData<Survey>(KEYS.SURVEYS, "__HIIDEL_SURVEYS__", []),
      ]);

      await Promise.all([
        this.setData(
          KEYS.QR_CODES,
          "__HIIDEL_QR_CODES__",
          qrCodes.filter((qr) => qr.storeId !== storeId)
        ),
        this.setData(
          KEYS.REVIEWS,
          "__HIIDEL_REVIEWS__",
          reviews.filter((review) => review.storeId !== storeId)
        ),
        this.setData(
          KEYS.SURVEYS,
          "__HIIDEL_SURVEYS__",
          surveys.filter((survey) => survey.storeId !== storeId)
        ),
      ]);

      return true;
    }
    return false;
  }

  // QRコード管理
  async getQRCodes(userId: string, storeId?: string): Promise<QRCode[]> {
    const allQRCodes = await this.getData<QRCode>(
      KEYS.QR_CODES,
      "__HIIDEL_QR_CODES__",
      []
    );
    let qrCodes = allQRCodes.filter((qr) => qr.userId === userId);
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

    const allQRCodes = await this.getData<QRCode>(
      KEYS.QR_CODES,
      "__HIIDEL_QR_CODES__",
      []
    );
    allQRCodes.push(qrCode);
    await this.setData(KEYS.QR_CODES, "__HIIDEL_QR_CODES__", allQRCodes);

    return qrCode;
  }

  async incrementQRScan(qrId: string): Promise<void> {
    const allQRCodes = await this.getData<QRCode>(
      KEYS.QR_CODES,
      "__HIIDEL_QR_CODES__",
      []
    );
    const qrCode = allQRCodes.find((qr) => qr.id === qrId);
    if (qrCode) {
      qrCode.scans++;
      qrCode.lastScannedAt = new Date();
      await this.setData(KEYS.QR_CODES, "__HIIDEL_QR_CODES__", allQRCodes);
    }
  }

  async deleteQRCode(qrId: string, userId: string): Promise<boolean> {
    const allQRCodes = await this.getData<QRCode>(
      KEYS.QR_CODES,
      "__HIIDEL_QR_CODES__",
      []
    );
    const initialLength = allQRCodes.length;

    const updatedQRCodes = allQRCodes.filter(
      (qr) => !(qr.id === qrId && qr.userId === userId)
    );

    if (updatedQRCodes.length < initialLength) {
      await this.setData(KEYS.QR_CODES, "__HIIDEL_QR_CODES__", updatedQRCodes);
      return true;
    }
    return false;
  }

  // レビュー管理
  async getReviews(userId: string, storeId?: string): Promise<Review[]> {
    const allReviews = await this.getData<Review>(
      KEYS.REVIEWS,
      "__HIIDEL_REVIEWS__",
      []
    );
    let reviews = allReviews.filter((review) => review.userId === userId);
    if (storeId) {
      reviews = reviews.filter((review) => review.storeId === storeId);
    }
    return reviews;
  }

  async createReview(
    reviewData: Omit<Review, "id" | "createdAt">
  ): Promise<Review> {
    const review: Review = {
      ...reviewData,
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    const allReviews = await this.getData<Review>(
      KEYS.REVIEWS,
      "__HIIDEL_REVIEWS__",
      []
    );
    allReviews.push(review);
    await this.setData(KEYS.REVIEWS, "__HIIDEL_REVIEWS__", allReviews);

    return review;
  }

  async replyToReview(
    reviewId: string,
    replyText: string,
    userId: string
  ): Promise<boolean> {
    const allReviews = await this.getData<Review>(
      KEYS.REVIEWS,
      "__HIIDEL_REVIEWS__",
      []
    );
    const review = allReviews.find(
      (r) => r.id === reviewId && r.userId === userId
    );
    if (review) {
      review.replied = true;
      review.replyText = replyText;
      await this.setData(KEYS.REVIEWS, "__HIIDEL_REVIEWS__", allReviews);
      return true;
    }
    return false;
  }

  // アンケート管理
  async getSurveys(userId: string, storeId?: string): Promise<Survey[]> {
    const allSurveys = await this.getData<Survey>(
      KEYS.SURVEYS,
      "__HIIDEL_SURVEYS__",
      []
    );
    let surveys = allSurveys.filter((survey) => survey.userId === userId);
    if (storeId) {
      surveys = surveys.filter((survey) => survey.storeId === storeId);
    }
    console.log(`📊 Found ${surveys.length} surveys for user ${userId}`);
    return surveys;
  }

  async createSurvey(
    surveyData: Omit<Survey, "id" | "responses" | "createdAt">
  ): Promise<Survey> {
    console.log(`➕ Creating survey:`, surveyData);

    const survey: Survey = {
      ...surveyData,
      id: `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responses: 0,
      createdAt: new Date(),
    };

    const allSurveys = await this.getData<Survey>(
      KEYS.SURVEYS,
      "__HIIDEL_SURVEYS__",
      []
    );
    allSurveys.push(survey);
    await this.setData(KEYS.SURVEYS, "__HIIDEL_SURVEYS__", allSurveys);

    console.log(
      `✅ Survey created: ${survey.id}, total surveys: ${allSurveys.length}`
    );
    return survey;
  }

  async createSurveyResponse(
    responseData: Omit<SurveyResponse, "id" | "createdAt">
  ): Promise<SurveyResponse> {
    console.log(`➕ Creating survey response:`, responseData);

    const response: SurveyResponse = {
      ...responseData,
      id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    const allResponses = await this.getData<SurveyResponse>(
      KEYS.SURVEY_RESPONSES,
      "__HIIDEL_SURVEY_RESPONSES__",
      []
    );
    allResponses.push(response);
    await this.setData(
      KEYS.SURVEY_RESPONSES,
      "__HIIDEL_SURVEY_RESPONSES__",
      allResponses
    );

    // サーベイの回答数を増加
    const allSurveys = await this.getData<Survey>(
      KEYS.SURVEYS,
      "__HIIDEL_SURVEYS__",
      []
    );
    const survey = allSurveys.find((s) => s.id === responseData.surveyId);
    if (survey) {
      survey.responses++;
      await this.setData(KEYS.SURVEYS, "__HIIDEL_SURVEYS__", allSurveys);
      console.log(`✅ Survey response count updated: ${survey.responses}`);
    }

    console.log(`✅ Survey response created: ${response.id}`);
    return response;
  }

  async getSurveyResponses(
    surveyId: string,
    userId: string
  ): Promise<SurveyResponse[]> {
    const allResponses = await this.getData<SurveyResponse>(
      KEYS.SURVEY_RESPONSES,
      "__HIIDEL_SURVEY_RESPONSES__",
      []
    );
    const allSurveys = await this.getData<Survey>(
      KEYS.SURVEYS,
      "__HIIDEL_SURVEYS__",
      []
    );

    const responses = allResponses.filter(
      (response) =>
        response.surveyId === surveyId &&
        allSurveys.find((s) => s.id === surveyId && s.userId === userId)
    );

    console.log(
      `📊 Found ${responses.length} responses for survey ${surveyId}`
    );
    return responses;
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

    const unansweredReviews = reviews.filter((r) => !r.replied).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayReviews = reviews.filter((r) => r.createdAt >= today).length;
    const todayScans = qrCodes.filter(
      (qr) => qr.lastScannedAt && qr.lastScannedAt >= today
    ).length;

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
    const [stores, reviews, qrCodes] = await Promise.all([
      this.getData<Store>(KEYS.STORES, "__HIIDEL_STORES__", []),
      this.getData<Review>(KEYS.REVIEWS, "__HIIDEL_REVIEWS__", []),
      this.getData<QRCode>(KEYS.QR_CODES, "__HIIDEL_QR_CODES__", []),
    ]);

    const filteredStores = stores.filter(
      (s) => s.userId !== userId || !s.isTestStore
    );
    const filteredReviews = reviews.filter(
      (r) => r.userId !== userId || !r.isTestData
    );
    const filteredQRCodes = qrCodes.filter((q) => q.userId !== userId);

    await Promise.all([
      this.setData(KEYS.STORES, "__HIIDEL_STORES__", filteredStores),
      this.setData(KEYS.REVIEWS, "__HIIDEL_REVIEWS__", filteredReviews),
      this.setData(KEYS.QR_CODES, "__HIIDEL_QR_CODES__", filteredQRCodes),
    ]);

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
        rating: Math.floor(Math.random() * 2) + 4,
        text: reviewTexts[i],
        authorName: `テストユーザー${i + 1}`,
        isTestData: true,
        replied: i < 3,
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
  var __HIIDEL_STORES__: Store[] | undefined;
  var __HIIDEL_SURVEYS__: Survey[] | undefined;
  var __HIIDEL_REVIEWS__: Review[] | undefined;
  var __HIIDEL_QR_CODES__: QRCode[] | undefined;
  var __HIIDEL_SURVEY_RESPONSES__: SurveyResponse[] | undefined;
  var __HIIDEL_USERS__: User[] | undefined;
}

export const db = getDatabase();
export type { Store, Survey, Review, QRCode, SurveyResponse, SurveyQuestion };
