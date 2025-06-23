"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Store,
  MessageSquare,
  QrCode,
  BarChart3,
  Search,
  Filter,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  LogOut,
  Shield,
  Crown,
  Activity,
  Calendar,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAccount {
  id: string;
  name: string;
  email: string;
  companyName: string;
  role: string;
  subscription: {
    plan: string;
    startDate: string;
    endDate: string;
  };
  stores: any[];
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

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalStores: number;
  activeStores: number;
  totalReviews: number;
  totalQRCodes: number;
  activeQRCodes: number;
  totalSurveys: number;
  activeSurveys: number;
  averageRating: number;
}

interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

export default function AdminPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserAccount[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 管理者認証チェック
  useEffect(() => {
    checkAdminAuth();
  }, []);

  // データ取得
  useEffect(() => {
    if (authCheckComplete) {
      fetchAdminData();
    }
  }, [authCheckComplete]);

  // フィルタリング
  useEffect(() => {
    let filtered = users;

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // ステータスフィルター
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => {
        if (statusFilter === "active") return user.isActive;
        if (statusFilter === "inactive") return !user.isActive;
        return true;
      });
    }

    // プランフィルター
    if (planFilter !== "all") {
      filtered = filtered.filter(
        (user) => user.subscription.plan === planFilter
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter, planFilter]);

  const checkAdminAuth = async () => {
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "GET",
        credentials: "include", // Cookieを含める
      });

      if (response.ok) {
        const data = await response.json();
        setAdminUser(data.user);
        setAuthCheckComplete(true);
      } else {
        setAuthCheckComplete(true);
        router.push("/admin/login");
      }
    } catch (error) {
      console.error("認証チェックエラー:", error);
      setAuthCheckComplete(true);
      router.push("/admin/login");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/login", {
        method: "DELETE",
        credentials: "include",
      });
      router.push("/admin/login");
    } catch (error) {
      console.error("ログアウトエラー:", error);
      router.push("/admin/login");
    }
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      const adminAuth = localStorage.getItem("adminAuth");
      const authData = adminAuth ? JSON.parse(adminAuth) : null;

      // ダッシュボードデータを取得
      const dashboardResponse = await fetch("/api/admin/dashboard", {
        headers: {
          Authorization: `Bearer ${authData?.token || "admin-token"}`,
        },
      });

      if (dashboardResponse.ok) {
        const dashboardData = await dashboardResponse.json();
        setDashboardStats(dashboardData.data.overview);
      }

      // ユーザー一覧を取得
      const usersResponse = await fetch("/api/admin/users");
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }
    } catch (error) {
      console.error("管理者データの取得に失敗しました:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
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
        await fetchAdminData();
      }
    } catch (error) {
      console.error("ユーザーアクションの実行に失敗しました:", error);
    }
  };

  const getStatusBadge = (user: UserAccount) => {
    if (!user.isActive) {
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
      return <Badge variant="secondary">期限間近</Badge>;
    } else {
      return <Badge variant="default">アクティブ</Badge>;
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

  // 認証チェック中のローディング
  if (!authCheckComplete) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">
            認証情報を確認中...
          </p>
        </div>
      </div>
    );
  }

  // 未認証の場合
  if (!adminUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // データ読み込み中
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">
            データを読み込み中...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Crown className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">
              管理者ダッシュボード
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            全アカウントの運用状況を管理・監視
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border">
            <Shield className="h-4 w-4 text-blue-600" />
            <span className="font-medium">{adminUser.name}</span>
            <span className="text-gray-400">({adminUser.username})</span>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => fetchAdminData()}
              variant="outline"
              className="gap-2"
              size="sm"
            >
              <Settings className="h-4 w-4" />
              データ更新
            </Button>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="gap-2"
              size="sm"
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </div>
      </div>

      {/* 概要統計 */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white dark:text-white border border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white dark:text-white">
                総ユーザー数
              </CardTitle>
              <Users className="h-4 w-4 text-white dark:text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white dark:text-white">
                {dashboardStats.totalUsers}
              </div>
              <p className="text-xs text-blue-100 dark:text-blue-100">
                アクティブ: {dashboardStats.activeUsers}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 text-white dark:text-white border border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white dark:text-white">
                総店舗数
              </CardTitle>
              <Store className="h-4 w-4 text-white dark:text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white dark:text-white">
                {dashboardStats.totalStores}
              </div>
              <p className="text-xs text-green-100 dark:text-green-100">
                アクティブ: {dashboardStats.activeStores}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 text-white dark:text-white border border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white dark:text-white">
                総レビュー数
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-white dark:text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white dark:text-white">
                {dashboardStats.totalReviews}
              </div>
              <p className="text-xs text-purple-100 dark:text-purple-100">
                平均評価: {dashboardStats.averageRating}★
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 text-white dark:text-white border border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white dark:text-white">
                総QRコード数
              </CardTitle>
              <QrCode className="h-4 w-4 text-white dark:text-white" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white dark:text-white">
                {dashboardStats.totalQRCodes}
              </div>
              <p className="text-xs text-orange-100 dark:text-orange-100">
                アクティブ: {dashboardStats.activeQRCodes}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* フィルター */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            ユーザーアカウント管理
          </CardTitle>
          <CardDescription>
            全ユーザーアカウントの運用状況を確認・管理
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="ユーザー名、メール、会社名で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="active">アクティブ</SelectItem>
                <SelectItem value="inactive">非アクティブ</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="プラン" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="trial">トライアル</SelectItem>
                <SelectItem value="basic">ベーシック</SelectItem>
                <SelectItem value="premium">プレミアム</SelectItem>
                <SelectItem value="enterprise">エンタープライズ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ユーザー一覧テーブル */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー情報</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>プラン</TableHead>
                  <TableHead>運用状況</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead>アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.companyName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell>
                      {getPlanBadge(user.subscription.plan)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-2">
                          <Store className="h-3 w-3" />
                          <span>{user.stats?.totalStores || 0} 店舗</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-3 w-3" />
                          <span>{user.stats?.totalReviews || 0} レビュー</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <QrCode className="h-3 w-3" />
                          <span>{user.stats?.totalQRCodes || 0} QR</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(user.createdAt).toLocaleDateString("ja-JP")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          詳細
                        </Button>
                        <Button
                          variant={user.isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() =>
                            handleUserAction(
                              user.id,
                              user.isActive ? "deactivate" : "activate"
                            )
                          }
                        >
                          {user.isActive ? (
                            <XCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          {user.isActive ? "無効化" : "有効化"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              条件に一致するユーザーが見つかりませんでした。
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
