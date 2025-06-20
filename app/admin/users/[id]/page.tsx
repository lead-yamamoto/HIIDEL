"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Users,
  Store,
  MessageSquare,
  QrCode,
  Calendar,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Building,
  CreditCard,
} from "lucide-react";

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  companyName: string;
  phoneNumber?: string;
  role: string;
  subscription: {
    plan: string;
    startDate: string;
    endDate: string;
  };
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  stats: {
    totalStores: number;
    totalReviews: number;
    totalQRCodes: number;
    activeSurveys: number;
    monthlyScans: number;
    responseRate: number;
    averageRating: number;
  };
}

interface Store {
  id: string;
  name: string;
  category: string;
  address: string;
  phoneNumber: string;
  createdAt: string;
  averageRating: number;
  totalReviews: number;
}

interface QRCode {
  id: string;
  name: string;
  type: string;
  url: string;
  scans: number;
  createdAt: string;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  responses: number;
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [qrCodes, setQRCodes] = useState<QRCode[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  // 管理者認証チェック
  useEffect(() => {
    checkAdminAuth();
  }, []);

  // ユーザー詳細データを取得
  useEffect(() => {
    if (adminUser && userId) {
      fetchUserDetail();
    }
  }, [adminUser, userId]);

  const checkAdminAuth = () => {
    try {
      const adminAuth = localStorage.getItem("adminAuth");

      if (!adminAuth) {
        router.push("/admin/login");
        return;
      }

      const authData = JSON.parse(adminAuth);
      const expiryTime =
        new Date(authData.timestamp).getTime() + 24 * 60 * 60 * 1000;

      if (Date.now() > expiryTime) {
        localStorage.removeItem("adminAuth");
        router.push("/admin/login");
        return;
      }

      setAdminUser(authData.user);
    } catch (error) {
      console.error("認証チェックエラー:", error);
      router.push("/admin/login");
    }
  };

  const fetchUserDetail = async () => {
    try {
      setLoading(true);

      // ユーザー詳細を取得
      const userResponse = await fetch(`/api/admin/users/${userId}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
        setStores(userData.stores || []);
        setQRCodes(userData.qrCodes || []);
        setSurveys(userData.surveys || []);
      } else {
        console.error("ユーザーが見つかりません");
        router.push("/admin");
      }
    } catch (error) {
      console.error("ユーザー詳細の取得に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (action: string) => {
    try {
      const adminAuth = localStorage.getItem("adminAuth");
      const authData = adminAuth ? JSON.parse(adminAuth) : null;

      const response = await fetch("/api/admin/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authData?.token || "admin-token"}`,
        },
        body: JSON.stringify({
          action,
          userId,
        }),
      });

      if (response.ok) {
        // データを再取得
        await fetchUserDetail();
      }
    } catch (error) {
      console.error("ユーザーアクションの実行に失敗しました:", error);
    }
  };

  const getStatusBadge = () => {
    if (!user?.isActive) {
      return <Badge variant="destructive">非アクティブ</Badge>;
    }

    const endDate = new Date(user.subscription.endDate);
    const now = new Date();
    const daysLeft = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft < 0) {
      return <Badge variant="destructive">期限切れ</Badge>;
    } else if (daysLeft <= 7) {
      return <Badge variant="secondary">期限間近 ({daysLeft}日)</Badge>;
    } else {
      return <Badge variant="default">アクティブ ({daysLeft}日)</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    const planConfig = {
      trial: { label: "トライアル", variant: "secondary" as const },
      basic: { label: "ベーシック", variant: "default" as const },
      premium: { label: "プレミアム", variant: "default" as const },
      enterprise: { label: "エンタープライズ", variant: "default" as const },
    };

    const config = planConfig[plan as keyof typeof planConfig] || {
      label: plan,
      variant: "outline" as const,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!adminUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">ユーザーが見つかりません</h1>
          <p className="text-muted-foreground">
            指定されたユーザーは存在しないか、削除されています。
          </p>
          <Button onClick={() => router.push("/admin")} className="mt-4">
            管理者画面に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{user.name} の運用管理</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          {getPlanBadge(user.subscription.plan)}
        </div>
      </div>

      {/* ユーザー基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>ユーザー基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">
                  メールアドレス
                </div>
                <div>{user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">会社名</div>
                <div>{user.companyName || "未設定"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">電話番号</div>
                <div>{user.phoneNumber || "未設定"}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">登録日</div>
                <div>
                  {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">
                    サブスクリプション
                  </div>
                  <div className="flex items-center gap-2">
                    {getPlanBadge(user.subscription.plan)}
                    <span className="text-sm text-muted-foreground">
                      {new Date(user.subscription.startDate).toLocaleDateString(
                        "ja-JP"
                      )}{" "}
                      -
                      {new Date(user.subscription.endDate).toLocaleDateString(
                        "ja-JP"
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={user.isActive ? "outline" : "default"}
                onClick={() =>
                  handleUserAction(user.isActive ? "deactivate" : "activate")
                }
              >
                {user.isActive ? (
                  <XCircle className="h-4 w-4 mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                {user.isActive ? "アカウント無効化" : "アカウント有効化"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleUserAction("resetPassword")}
              >
                パスワードリセット
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 運用統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">店舗数</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.stats.totalStores}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">レビュー数</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.stats.totalReviews}</div>
            <p className="text-xs text-muted-foreground">
              平均評価: {user.stats.averageRating}★
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QRコード数</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.stats.totalQRCodes}</div>
            <p className="text-xs text-muted-foreground">
              今月のスキャン: {user.stats.monthlyScans}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アンケート数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.stats.activeSurveys}</div>
            <p className="text-xs text-muted-foreground">
              返信率: {user.stats.responseRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 詳細タブ */}
      <Tabs defaultValue="stores" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stores">店舗一覧</TabsTrigger>
          <TabsTrigger value="qrcodes">QRコード</TabsTrigger>
          <TabsTrigger value="surveys">アンケート</TabsTrigger>
        </TabsList>

        <TabsContent value="stores">
          <Card>
            <CardHeader>
              <CardTitle>店舗一覧</CardTitle>
              <CardDescription>
                {user.name}が管理している店舗の一覧
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stores.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>店舗名</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead>住所</TableHead>
                      <TableHead>評価</TableHead>
                      <TableHead>登録日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">
                          {store.name}
                        </TableCell>
                        <TableCell>{store.category}</TableCell>
                        <TableCell>{store.address}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{store.averageRating}★</span>
                            <span className="text-sm text-muted-foreground">
                              ({store.totalReviews}件)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(store.createdAt).toLocaleDateString(
                            "ja-JP"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  店舗が登録されていません。
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qrcodes">
          <Card>
            <CardHeader>
              <CardTitle>QRコード一覧</CardTitle>
              <CardDescription>
                {user.name}が作成したQRコードの一覧
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qrCodes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>タイプ</TableHead>
                      <TableHead>スキャン数</TableHead>
                      <TableHead>作成日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qrCodes.map((qr) => (
                      <TableRow key={qr.id}>
                        <TableCell className="font-medium">{qr.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{qr.type}</Badge>
                        </TableCell>
                        <TableCell>{qr.scans}</TableCell>
                        <TableCell>
                          {new Date(qr.createdAt).toLocaleDateString("ja-JP")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  QRコードが作成されていません。
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surveys">
          <Card>
            <CardHeader>
              <CardTitle>アンケート一覧</CardTitle>
              <CardDescription>
                {user.name}が作成したアンケートの一覧
              </CardDescription>
            </CardHeader>
            <CardContent>
              {surveys.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイトル</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>回答数</TableHead>
                      <TableHead>作成日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveys.map((survey) => (
                      <TableRow key={survey.id}>
                        <TableCell className="font-medium">
                          {survey.title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={survey.isActive ? "default" : "secondary"}
                          >
                            {survey.isActive ? "アクティブ" : "非アクティブ"}
                          </Badge>
                        </TableCell>
                        <TableCell>{survey.responses}</TableCell>
                        <TableCell>
                          {new Date(survey.createdAt).toLocaleDateString(
                            "ja-JP"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  アンケートが作成されていません。
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
