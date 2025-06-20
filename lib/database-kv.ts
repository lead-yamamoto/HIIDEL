import { kv } from "@vercel/kv";

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

class VercelKVDatabase {
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

  // KVが利用可能かチェック
  private isKVAvailable(): boolean {
    return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  }

  // 初期化チェック
  private async ensureInitialized(): Promise<void> {
    if (!this.isKVAvailable()) {
      console.log("⚠️ Vercel KV not available, using fallback data");
      return;
    }

    try {
      const initialized = await kv.get(KEYS.INITIALIZED);
      if (initialized) {
        console.log("✅ Database already initialized");
        return;
      }

      console.log("🔄 Initializing database with default data...");
      await this.initializeDefaultData();
      await kv.set(KEYS.INITIALIZED, true);
      console.log("✅ Database initialization complete");
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
    }
  }

  // デフォルトデータの初期化
  private async initializeDefaultData(): Promise<void> {
    try {
      // 初期店舗データ
      const defaultStores: Store[] = [
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

      // 初期アンケートデータ
      const defaultSurveys: Survey[] = [
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

      // 初期レビューデータ
      const defaultReviews: Review[] = [
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

      // KVに保存
      await Promise.all([
        kv.set(KEYS.STORES, defaultStores),
        kv.set(KEYS.SURVEYS, defaultSurveys),
        kv.set(KEYS.REVIEWS, defaultReviews),
        kv.set(KEYS.QR_CODES, []),
        kv.set(KEYS.SURVEY_RESPONSES, []),
        kv.set(KEYS.USERS, this.defaultUsers),
      ]);

      console.log("✅ Default data initialized in KV");
    } catch (error) {
      console.error("❌ Failed to initialize default data:", error);
    }
  }

  // データの取得（フォールバック付き）
  private async getData<T>(key: string, fallback: T[]): Promise<T[]> {
    if (!this.isKVAvailable()) {
      console.log(`⚠️ KV not available, using fallback for ${key}`);
      return fallback;
    }

    try {
      const data = await kv.get<T[]>(key);
      if (data === null) {
        console.log(`📂 No data found for ${key}, using fallback`);
        return fallback;
      }

      // 日付オブジェクトの復元
      const restoredData = data.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
      }));

      console.log(`📊 Retrieved ${restoredData.length} items from ${key}`);
      return restoredData;
    } catch (error) {
      console.error(`❌ Failed to get data from ${key}:`, error);
      return fallback;
    }
  }

  // データの保存
  private async setData<T>(key: string, data: T[]): Promise<void> {
    if (!this.isKVAvailable()) {
      console.log(`⚠️ KV not available, cannot save ${key}`);
      return;
    }

    try {
      await kv.set(key, data);
      console.log(`💾 Saved ${data.length} items to ${key}`);
    } catch (error) {
      console.error(`❌ Failed to save data to ${key}:`, error);
    }
  }

  // ユーザー管理
  async getUser(email: string): Promise<User | null> {
    const users = await this.getData(KEYS.USERS, this.defaultUsers);
    return users.find((user) => user.email === email) || null;
  }

  async updateUserGoogleConnection(
    email: string,
    isConnected: boolean
  ): Promise<void> {
    const users = await this.getData(KEYS.USERS, this.defaultUsers);
    const user = users.find((user) => user.email === email);
    if (user) {
      user.isGoogleConnected = isConnected;
      await this.setData(KEYS.USERS, users);
    }
  }

  // 店舗管理
  async getStores(userId: string): Promise<Store[]> {
    await this.ensureInitialized();

    console.log(`📊 DB.getStores called - userId: ${userId}`);

    const allStores = await this.getData<Store>(KEYS.STORES, []);
    const userStores = allStores.filter((store) => store.userId === userId);

    console.log(`📊 Found ${userStores.length} stores for user ${userId}`);
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

    const allStores = await this.getData<Store>(KEYS.STORES, []);
    allStores.push(store);
    await this.setData(KEYS.STORES, allStores);

    console.log(`✅ New store created: ${store.id}`);
    console.log(`📊 Total stores after creation: ${allStores.length}`);

    return store;
  }

  async deleteStore(storeId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();

    const allStores = await this.getData<Store>(KEYS.STORES, []);
    const initialLength = allStores.length;

    const updatedStores = allStores.filter(
      (store) => !(store.id === storeId && store.userId === userId)
    );

    if (updatedStores.length < initialLength) {
      await this.setData(KEYS.STORES, updatedStores);

      // 関連データも削除
      const [qrCodes, reviews, surveys] = await Promise.all([
        this.getData<QRCode>(KEYS.QR_CODES, []),
        this.getData<Review>(KEYS.REVIEWS, []),
        this.getData<Survey>(KEYS.SURVEYS, []),
      ]);

      await Promise.all([
        this.setData(
          KEYS.QR_CODES,
          qrCodes.filter((qr) => qr.storeId !== storeId)
        ),
        this.setData(
          KEYS.REVIEWS,
          reviews.filter((review) => review.storeId !== storeId)
        ),
        this.setData(
          KEYS.SURVEYS,
          surveys.filter((survey) => survey.storeId !== storeId)
        ),
      ]);

      return true;
    }
    return false;
  }

  // QRコード管理
  async getQRCodes(userId: string, storeId?: string): Promise<QRCode[]> {
    await this.ensureInitialized();

    const allQRCodes = await this.getData<QRCode>(KEYS.QR_CODES, []);
    let qrCodes = allQRCodes.filter((qr) => qr.userId === userId);
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

    const allQRCodes = await this.getData<QRCode>(KEYS.QR_CODES, []);
    allQRCodes.push(qrCode);
    await this.setData(KEYS.QR_CODES, allQRCodes);

    return qrCode;
  }

  async incrementQRScan(qrId: string): Promise<void> {
    await this.ensureInitialized();

    const allQRCodes = await this.getData<QRCode>(KEYS.QR_CODES, []);
    const qrCode = allQRCodes.find((qr) => qr.id === qrId);
    if (qrCode) {
      qrCode.scans++;
      qrCode.lastScannedAt = new Date();
      await this.setData(KEYS.QR_CODES, allQRCodes);
    }
  }

  async deleteQRCode(qrId: string, userId: string): Promise<boolean> {
    await this.ensureInitialized();

    const allQRCodes = await this.getData<QRCode>(KEYS.QR_CODES, []);
    const initialLength = allQRCodes.length;

    const updatedQRCodes = allQRCodes.filter(
      (qr) => !(qr.id === qrId && qr.userId === userId)
    );

    if (updatedQRCodes.length < initialLength) {
      await this.setData(KEYS.QR_CODES, updatedQRCodes);
      return true;
    }
    return false;
  }

  // レビュー管理
  async getReviews(userId: string, storeId?: string): Promise<Review[]> {
    await this.ensureInitialized();

    const allReviews = await this.getData<Review>(KEYS.REVIEWS, []);
    let reviews = allReviews.filter((review) => review.userId === userId);
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

    const allReviews = await this.getData<Review>(KEYS.REVIEWS, []);
    allReviews.push(review);
    await this.setData(KEYS.REVIEWS, allReviews);

    return review;
  }

  async replyToReview(
    reviewId: string,
    replyText: string,
    userId: string
  ): Promise<boolean> {
    await this.ensureInitialized();

    const allReviews = await this.getData<Review>(KEYS.REVIEWS, []);
    const review = allReviews.find(
      (r) => r.id === reviewId && r.userId === userId
    );
    if (review) {
      review.replied = true;
      review.replyText = replyText;
      await this.setData(KEYS.REVIEWS, allReviews);
      return true;
    }
    return false;
  }

  // アンケート管理
  async getSurveys(userId: string, storeId?: string): Promise<Survey[]> {
    await this.ensureInitialized();

    const allSurveys = await this.getData<Survey>(KEYS.SURVEYS, []);
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
    await this.ensureInitialized();

    console.log(`➕ Creating survey:`, surveyData);

    const survey: Survey = {
      ...surveyData,
      id: `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      responses: 0,
      createdAt: new Date(),
    };

    const allSurveys = await this.getData<Survey>(KEYS.SURVEYS, []);
    allSurveys.push(survey);
    await this.setData(KEYS.SURVEYS, allSurveys);

    console.log(
      `✅ Survey created: ${survey.id}, total surveys: ${allSurveys.length}`
    );
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

    const allResponses = await this.getData<SurveyResponse>(
      KEYS.SURVEY_RESPONSES,
      []
    );
    allResponses.push(response);
    await this.setData(KEYS.SURVEY_RESPONSES, allResponses);

    // サーベイの回答数を増加
    const allSurveys = await this.getData<Survey>(KEYS.SURVEYS, []);
    const survey = allSurveys.find((s) => s.id === responseData.surveyId);
    if (survey) {
      survey.responses++;
      await this.setData(KEYS.SURVEYS, allSurveys);
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

    const allResponses = await this.getData<SurveyResponse>(
      KEYS.SURVEY_RESPONSES,
      []
    );
    const allSurveys = await this.getData<Survey>(KEYS.SURVEYS, []);

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
    const [stores, reviews, qrCodes] = await Promise.all([
      this.getData<Store>(KEYS.STORES, []),
      this.getData<Review>(KEYS.REVIEWS, []),
      this.getData<QRCode>(KEYS.QR_CODES, []),
    ]);

    const filteredStores = stores.filter(
      (s) => s.userId !== userId || !s.isTestStore
    );
    const filteredReviews = reviews.filter(
      (r) => r.userId !== userId || !r.isTestData
    );
    const filteredQRCodes = qrCodes.filter((q) => q.userId !== userId);

    await Promise.all([
      this.setData(KEYS.STORES, filteredStores),
      this.setData(KEYS.REVIEWS, filteredReviews),
      this.setData(KEYS.QR_CODES, filteredQRCodes),
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
function getKVDatabase(): VercelKVDatabase {
  if (!global.__HIIDEL_KV_DB_INSTANCE__) {
    global.__HIIDEL_KV_DB_INSTANCE__ = new VercelKVDatabase();
  }
  return global.__HIIDEL_KV_DB_INSTANCE__;
}

declare global {
  var __HIIDEL_KV_DB_INSTANCE__: VercelKVDatabase | undefined;
}

export const kvDb = getKVDatabase();
export type { Store, Survey, Review, QRCode, SurveyResponse, SurveyQuestion };
