"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Bell,
  Shield,
  Globe,
  Download,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Camera,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserSettings {
  name: string;
  email: string;
  companyName: string;
  phone: string;
  bio: string;
  language: string;
  timezone: string;
  profileImage?: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  twoFactorAuth: boolean;
  sessionTimeout: string;
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<UserSettings>({
    name: "",
    email: "",
    companyName: "",
    phone: "",
    bio: "",
    language: "ja",
    timezone: "Asia/Tokyo",
    profileImage: "",
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    twoFactorAuth: false,
    sessionTimeout: "30",
  });

  // 編集前の元の設定を保存（キャンセル時に使用）
  const [originalSettings, setOriginalSettings] =
    useState<UserSettings>(settings);

  const [notificationMessages, setNotificationMessages] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.profile);
        setOriginalSettings(data.profile); // 元の設定も更新
      } else {
        console.error("プロフィール取得に失敗:", response.statusText);
      }
    } catch (error) {
      console.error("プロフィール取得エラー:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotificationMessages({ type, message });
    setTimeout(() => setNotificationMessages(null), 3000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        setIsEditing(false);
        // 最新のプロフィール情報を再取得して完全に同期
        await fetchProfile();
        // セッション情報も更新（名前とプロフィール画像を即座に反映）
        try {
          await updateSession({
            name: settings.name,
            image: settings.profileImage,
          });
        } catch (sessionError) {
          console.warn("セッション更新中にエラーが発生しました:", sessionError);
        }
        showNotification(
          "success",
          data.message || "プロフィールが保存されました"
        );
      } else {
        showNotification(
          "error",
          data.error || "プロフィールの保存に失敗しました"
        );
      }
    } catch (error) {
      console.error("プロフィールの保存に失敗:", error);
      showNotification("error", "プロフィールの保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      showNotification("error", "新しいパスワードが一致しません");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/profile/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        showNotification(
          "success",
          data.message || "パスワードが変更されました"
        );
      } else {
        showNotification(
          "error",
          data.error || "パスワードの変更に失敗しました"
        );
      }
    } catch (error) {
      console.error("パスワードの変更に失敗:", error);
      showNotification("error", "パスワードの変更に失敗しました");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/profile/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // プロフィール設定を更新
        const updatedSettings = { ...settings, profileImage: data.imageUrl };
        setSettings(updatedSettings);

        // 画像アップロード成功後、プロフィール情報を自動保存
        const saveResponse = await fetch("/api/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedSettings),
        });

        if (saveResponse.ok) {
          // 最新のプロフィール情報を再取得して同期
          await fetchProfile();
          // セッション情報も更新（プロフィール画像を即座に反映）
          try {
            await updateSession({
              name: settings.name,
              image: data.imageUrl,
            });
          } catch (sessionError) {
            console.warn(
              "セッション更新中にエラーが発生しました:",
              sessionError
            );
          }
          showNotification(
            "success",
            "プロフィール画像がアップロードされ、保存されました"
          );
        } else {
          showNotification(
            "error",
            "画像はアップロードされましたが、プロフィールの保存に失敗しました"
          );
        }
      } else {
        showNotification(
          "error",
          data.error || "画像のアップロードに失敗しました"
        );
      }
    } catch (error) {
      console.error("画像アップロードエラー:", error);
      showNotification("error", "画像のアップロードに失敗しました");
    } finally {
      setIsUploadingImage(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const exportData = async () => {
    try {
      showNotification("success", "データエクスポート機能は開発中です");
      // 実際のエクスポート処理をここに実装
    } catch (error) {
      console.error("データのエクスポートに失敗:", error);
      showNotification("error", "データのエクスポートに失敗しました");
    }
  };

  const deleteAccount = async () => {
    if (
      !confirm(
        "アカウントを削除してもよろしいですか？この操作は元に戻せません。"
      )
    ) {
      return;
    }

    try {
      showNotification("success", "アカウント削除機能は開発中です");
      // 実際のアカウント削除処理をここに実装
    } catch (error) {
      console.error("アカウントの削除に失敗:", error);
      showNotification("error", "アカウントの削除に失敗しました");
    }
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">プロフィールを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-64">
        <Sidebar currentPath="/profile" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <MobileHeader
          title="プロフィール設定"
          currentPath="/profile"
          searchPlaceholder="設定を検索..."
          backUrl="/"
        />

        {/* 通知メッセージ */}
        {notificationMessages && (
          <div
            className={`mx-4 md:mx-6 mt-4 p-3 rounded-lg ${
              notificationMessages.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {notificationMessages.message}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <h1 className="text-2xl md:text-3xl font-bold mb-2">設定</h1>
              <p className="text-muted-foreground">
                アカウント設定とプリファレンスを管理します
              </p>
            </motion.div>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">プロフィール</TabsTrigger>
                <TabsTrigger value="notifications">通知</TabsTrigger>
                <TabsTrigger value="security">セキュリティ</TabsTrigger>
                <TabsTrigger value="preferences">環境設定</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        プロフィール情報
                      </CardTitle>
                      <CardDescription>
                        基本的なプロフィール情報を管理します
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center gap-6">
                        <div className="relative">
                          <Avatar className="h-20 w-20">
                            <AvatarImage src={settings.profileImage || ""} />
                            <AvatarFallback>
                              {settings.name.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          {isUploadingImage && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingImage}
                          >
                            {isUploadingImage ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                                アップロード中...
                              </>
                            ) : (
                              <>
                                <Camera className="mr-2 h-4 w-4" />
                                写真を変更
                              </>
                            )}
                          </Button>
                          <p className="text-sm text-muted-foreground">
                            JPG、PNG、GIF、またはWebP。最大2MB。
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">名前</Label>
                          <Input
                            id="name"
                            value={settings.name}
                            onChange={(e) =>
                              setSettings({ ...settings, name: e.target.value })
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">メールアドレス</Label>
                          <Input
                            id="email"
                            type="email"
                            value={settings.email}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                email: e.target.value,
                              })
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">会社名</Label>
                          <Input
                            id="company"
                            value={settings.companyName}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                companyName: e.target.value,
                              })
                            }
                            disabled={!isEditing}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">電話番号</Label>
                          <Input
                            id="phone"
                            value={settings.phone}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                phone: e.target.value,
                              })
                            }
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">自己紹介</Label>
                        <Textarea
                          id="bio"
                          placeholder="自己紹介を入力してください"
                          value={settings.bio}
                          onChange={(e) =>
                            setSettings({ ...settings, bio: e.target.value })
                          }
                          disabled={!isEditing}
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-2">
                        {!isEditing ? (
                          <Button
                            onClick={() => {
                              setOriginalSettings(settings); // 編集開始時に現在の設定を保存
                              setIsEditing(true);
                            }}
                          >
                            編集
                          </Button>
                        ) : (
                          <>
                            <button
                              onClick={handleSave}
                              disabled={isSaving}
                              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-md transition-colors"
                            >
                              {isSaving ? (
                                <>
                                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                  保存中...
                                </>
                              ) : (
                                <>
                                  <Save className="mr-2 h-4 w-4" />
                                  保存
                                </>
                              )}
                            </button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSettings(originalSettings); // 元の設定に戻す
                                setIsEditing(false);
                              }}
                            >
                              キャンセル
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        通知設定
                      </CardTitle>
                      <CardDescription>
                        受信する通知の種類を管理します
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>メール通知</Label>
                            <p className="text-sm text-muted-foreground">
                              重要な更新をメールで受信します
                            </p>
                          </div>
                          <Switch
                            checked={settings.emailNotifications}
                            onCheckedChange={(checked) =>
                              setSettings({
                                ...settings,
                                emailNotifications: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>プッシュ通知</Label>
                            <p className="text-sm text-muted-foreground">
                              ブラウザでプッシュ通知を受信します
                            </p>
                          </div>
                          <Switch
                            checked={settings.pushNotifications}
                            onCheckedChange={(checked) =>
                              setSettings({
                                ...settings,
                                pushNotifications: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <Label>マーケティングメール</Label>
                            <p className="text-sm text-muted-foreground">
                              製品の更新やプロモーション情報を受信します
                            </p>
                          </div>
                          <Switch
                            checked={settings.marketingEmails}
                            onCheckedChange={(checked) =>
                              setSettings({
                                ...settings,
                                marketingEmails: checked,
                              })
                            }
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-md transition-colors"
                      >
                        {isSaving ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            保存中...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            通知設定を保存
                          </>
                        )}
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        パスワード変更
                      </CardTitle>
                      <CardDescription>
                        アカウントのセキュリティを強化します
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">
                          現在のパスワード
                        </Label>
                        <div className="relative">
                          <Input
                            id="current-password"
                            type={showPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new-password">新しいパスワード</Label>
                        <Input
                          id="new-password"
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">パスワード確認</Label>
                        <Input
                          id="confirm-password"
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>

                      <Button
                        onClick={handlePasswordChange}
                        disabled={
                          !currentPassword ||
                          !newPassword ||
                          !confirmPassword ||
                          isChangingPassword
                        }
                        className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-none"
                      >
                        {isChangingPassword ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            変更中...
                          </>
                        ) : (
                          "パスワードを変更"
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>セキュリティオプション</CardTitle>
                      <CardDescription>
                        追加のセキュリティ機能を設定します
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>二段階認証</Label>
                          <p className="text-sm text-muted-foreground">
                            アカウントの安全性を向上させます
                          </p>
                        </div>
                        <Switch
                          checked={settings.twoFactorAuth}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, twoFactorAuth: checked })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="session-timeout">
                          セッションタイムアウト
                        </Label>
                        <Select
                          value={settings.sessionTimeout}
                          onValueChange={(value) =>
                            setSettings({ ...settings, sessionTimeout: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15分</SelectItem>
                            <SelectItem value="30">30分</SelectItem>
                            <SelectItem value="60">1時間</SelectItem>
                            <SelectItem value="480">8時間</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-md transition-colors"
                      >
                        {isSaving ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            保存中...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            セキュリティ設定を保存
                          </>
                        )}
                      </button>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              <TabsContent value="preferences" className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        言語・地域設定
                      </CardTitle>
                      <CardDescription>
                        表示言語とタイムゾーンを設定します
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="language">言語</Label>
                          <Select
                            value={settings.language}
                            onValueChange={(value) =>
                              setSettings({ ...settings, language: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ja">日本語</SelectItem>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="zh">中文</SelectItem>
                              <SelectItem value="ko">한국어</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="timezone">タイムゾーン</Label>
                          <Select
                            value={settings.timezone}
                            onValueChange={(value) =>
                              setSettings({ ...settings, timezone: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Asia/Tokyo">
                                日本標準時 (JST)
                              </SelectItem>
                              <SelectItem value="Asia/Seoul">
                                韓国標準時 (KST)
                              </SelectItem>
                              <SelectItem value="Asia/Shanghai">
                                中国標準時 (CST)
                              </SelectItem>
                              <SelectItem value="America/New_York">
                                東部標準時 (EST)
                              </SelectItem>
                              <SelectItem value="America/Los_Angeles">
                                太平洋標準時 (PST)
                              </SelectItem>
                              <SelectItem value="Europe/London">
                                グリニッジ標準時 (GMT)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-md transition-colors"
                      >
                        {isSaving ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            保存中...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            環境設定を保存
                          </>
                        )}
                      </button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>データ管理</CardTitle>
                      <CardDescription>
                        アカウントデータの管理を行います
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <button
                          onClick={exportData}
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium rounded-md transition-colors"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          データをエクスポート
                        </button>
                        <Button
                          variant="destructive"
                          onClick={deleteAccount}
                          className="flex items-center gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          アカウントを削除
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        データのエクスポートには個人情報、設定、アクティビティ履歴が含まれます。
                        アカウントの削除は元に戻すことができません。
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <footer className="border-t py-3 px-4 md:py-4 md:px-6 text-center text-sm text-muted-foreground">
          © 2025 Leadcreation Co., Ltd.
        </footer>
      </div>
    </div>
  );
}
