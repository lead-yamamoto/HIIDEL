"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { Star, Send, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Question {
  id: number;
  type: "rating" | "text" | "choice";
  question: string;
  required: boolean;
  options?: string[];
  scale?: number;
}

interface Survey {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  isActive: boolean;
  storeId?: string;
  googleReviewUrl?: string;
}

export default function SurveyResponsePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const surveyId = resolvedParams.id;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<number, string>
  >({});
  const [showImprovementForm, setShowImprovementForm] = useState(false);
  const [improvementText, setImprovementText] = useState("");
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchSurvey();

    // モバイルデバイス判定
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileKeywords = [
        "mobile",
        "android",
        "iphone",
        "ipad",
        "ipod",
        "blackberry",
        "windows phone",
      ];
      return (
        mobileKeywords.some((keyword) => userAgent.includes(keyword)) ||
        window.innerWidth <= 768
      );
    };

    setIsMobile(checkMobile());
    console.log(`📱 Device type: ${checkMobile() ? "Mobile" : "Desktop"}`);
  }, [surveyId]);

  const fetchSurvey = async () => {
    try {
      console.log(`📋 Fetching survey: ${surveyId}`);
      const response = await fetch(`/api/surveys/${surveyId}`);
      console.log(`📋 Survey API response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`📊 Survey data:`, data);
        setSurvey(data.survey);

        // 店舗のGoogleレビューURLを取得
        if (data.survey.storeId) {
          console.log(`🏪 Fetching store data for: ${data.survey.storeId}`);
          const storeUrl = `/api/stores?id=${data.survey.storeId}`;
          console.log(`🏪 Store API URL: ${storeUrl}`);

          const storeResponse = await fetch(storeUrl);
          console.log(`🏪 Store API response status: ${storeResponse.status}`);
          console.log(
            `🏪 Store API response headers:`,
            Object.fromEntries(storeResponse.headers.entries())
          );

          if (storeResponse.ok) {
            const storeData = await storeResponse.json();
            console.log(`🏪 Store API response:`, storeData);

            // 単一の店舗の場合は store プロパティ、複数の場合は stores 配列
            const store = storeData.store || storeData.stores?.[0];
            console.log(`🏪 Selected store:`, store);

            if (store?.googleReviewUrl) {
              console.log(
                `🔗 Setting Google Review URL: ${store.googleReviewUrl}`
              );
              setGoogleReviewUrl(store.googleReviewUrl);
            } else {
              console.log(`⚠️ No Google Review URL found for store`);
              console.log(`🔍 Debug: Store object details:`, {
                storeKeys: Object.keys(store || {}),
                googleReviewUrl: store?.googleReviewUrl,
                hasGoogleReviewUrl: "googleReviewUrl" in (store || {}),
                storeObject: store,
              });
            }

            if (store?.displayName) {
              console.log(`🏷️ Setting store name: ${store.displayName}`);
              setStoreName(store.displayName);
            } else if (store?.name) {
              console.log(`🏷️ Setting store name (fallback): ${store.name}`);
              setStoreName(store.name);
            }
          } else {
            console.error(`❌ Store API failed: ${storeResponse.status}`);
            const storeErrorData = await storeResponse.text();
            console.error(`❌ Store API error details:`, storeErrorData);
          }
        } else {
          console.log(`⚠️ No store ID found in survey`);
        }
      } else {
        console.error(`❌ Survey API failed: ${response.status}`);
        const errorData = await response.text();
        console.error(`❌ Survey API error details:`, errorData);
        setError("アンケートが見つかりません");
      }
    } catch (error) {
      console.error("アンケート取得エラー:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        surveyId: surveyId,
      });
      setError("アンケートの読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    // バリデーションエラーをクリア
    if (validationErrors[questionId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateAnswers = () => {
    const errors: Record<number, string> = {};

    if (!survey) return errors;

    for (const question of survey.questions) {
      if (question.required) {
        const answer = answers[question.id];
        if (!answer || answer.trim() === "") {
          errors[question.id] = "この項目は必須です";
        }
      }
    }

    return errors;
  };

  const calculateAverageRating = () => {
    if (!survey) return 0;

    const ratingQuestions = survey.questions.filter((q) => q.type === "rating");
    if (ratingQuestions.length === 0) return 0;

    let totalRating = 0;
    let ratingCount = 0;

    ratingQuestions.forEach((question) => {
      const rating = answers[question.id];
      if (rating) {
        totalRating += parseInt(rating);
        ratingCount++;
      }
    });

    return ratingCount > 0 ? totalRating / ratingCount : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!survey) return;

    const errors = validateAnswers();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // 改善点フォームが表示されている場合の処理
    if (showImprovementForm) {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await fetch(`/api/surveys/${surveyId}/responses`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answers: {
              ...answers,
              improvement: improvementText,
            },
            respondentInfo: {
              submittedAt: new Date().toISOString(),
              averageRating: calculateAverageRating(),
            },
          }),
        });

        if (response.ok) {
          setIsSubmitted(true);
        } else {
          const data = await response.json();
          setError(data.error || "回答の送信に失敗しました");
        }
      } catch (error) {
        console.error("回答送信エラー:", error);
        setError("回答の送信に失敗しました");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 平均評価を計算
    const averageRating = calculateAverageRating();
    console.log(`⭐ 平均評価: ${averageRating}`);
    console.log(`🔗 GoogleレビューURL: ${googleReviewUrl || "未設定"}`);
    console.log(`📝 星評価の詳細:`, answers);

    // 星評価の回答の詳細をログ出力
    const ratingQuestions = survey.questions.filter((q) => q.type === "rating");
    ratingQuestions.forEach((question) => {
      const rating = answers[question.id];
      console.log(
        `   質問 ${question.id}: "${question.question}" → 回答: ${rating}`
      );
    });

    // 平均評価が4.0以上の場合
    if (averageRating >= 4.0) {
      console.log(
        `✅ 平均評価が4.0以上のため、Googleレビューページへ遷移します`
      );
      console.log(`🔍 Debug: GoogleレビューURL存在チェック:`, {
        googleReviewUrl,
        hasUrl: !!googleReviewUrl,
        urlType: typeof googleReviewUrl,
        urlLength: googleReviewUrl?.length || 0,
      });

      if (googleReviewUrl) {
        setIsSubmitting(true);
        setError(null);

        try {
          // まずアンケート回答を保存
          const response = await fetch(`/api/surveys/${surveyId}/responses`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              answers,
              respondentInfo: {
                submittedAt: new Date().toISOString(),
                averageRating: averageRating,
              },
            }),
          });

          if (response.ok) {
            // 正しいPlace IDベースのGoogleレビューURLを取得
            console.log(
              `🌐 Redirecting to Google Review URL: ${googleReviewUrl}`
            );
            console.log(`📍 Store: ${storeName || "店舗名未設定"}`);

            // Place IDが含まれているかチェック
            if (
              googleReviewUrl.includes(
                "search.google.com/local/writereview?placeid="
              ) &&
              !googleReviewUrl.includes("locations/")
            ) {
              console.log(`✅ Using verified Google Review URL with Place ID`);
            } else {
              console.log(`⚠️ Using fallback Google Review URL`);
            }

            // リダイレクト状態を設定
            console.log(
              `🌟 Setting redirect state for URL: ${googleReviewUrl}`
            );
            setIsRedirecting(true);

            // デバイス別のリダイレクト処理
            const executeRedirect = () => {
              console.log(`🚀 Executing redirect to: ${googleReviewUrl}`);
              console.log(`📱 Device: ${isMobile ? "Mobile" : "Desktop"}`);

              if (isMobile) {
                // モバイル: 直接リダイレクト（同じタブ）
                console.log(`📱 Mobile redirect: Direct navigation`);
                try {
                  window.location.href = googleReviewUrl;
                } catch (error) {
                  console.error("🚨 Mobile redirect failed:", error);
                  // フォールバック: 新しいタブで開く
                  try {
                    window.open(googleReviewUrl, "_blank");
                  } catch (fallbackError) {
                    console.error("🚨 Mobile fallback failed:", fallbackError);
                    // 全て失敗した場合は完了画面を表示
                    setIsSubmitted(true);
                    setIsSubmitting(false);
                    setIsRedirecting(false);
                  }
                }
              } else {
                // デスクトップ: 新しいタブで開く
                console.log(`💻 Desktop redirect: New tab`);
                try {
                  // ユーザーアクションによるリダイレクトとして実行
                  const link = document.createElement("a");
                  link.href = googleReviewUrl;
                  link.target = "_blank";
                  link.rel = "noopener noreferrer";

                  console.log(`🔗 Debug: リンク要素作成完了`, {
                    href: link.href,
                    target: link.target,
                  });

                  // リンクを一時的にDOMに追加してクリック
                  document.body.appendChild(link);
                  console.log(`📝 Debug: リンクをDOMに追加`);

                  link.click();
                  console.log(`👆 Debug: リンククリック実行`);

                  document.body.removeChild(link);
                  console.log(`🗑️ Debug: リンクをDOMから削除`);

                  console.log(`✅ Redirect link clicked successfully`);

                  // 新しいタブでリダイレクトした後、元のタブは完了画面を表示
                  setTimeout(() => {
                    console.log(`🎉 Showing completion screen in current tab`);
                    setIsSubmitted(true);
                    setIsSubmitting(false);
                    setIsRedirecting(false);
                  }, 1000);
                } catch (error) {
                  console.error("🚨 Desktop redirect execution failed:", error);
                  // エラー時は新しいタブで開くことを試行
                  try {
                    window.open(googleReviewUrl, "_blank");
                    console.log(`✅ Fallback: Opened in new tab`);
                    // 成功した場合も完了画面を表示
                    setTimeout(() => {
                      setIsSubmitted(true);
                      setIsSubmitting(false);
                      setIsRedirecting(false);
                    }, 1000);
                  } catch (fallbackError) {
                    console.error(
                      "🚨 Desktop fallback redirect also failed:",
                      fallbackError
                    );
                    // 全てのリダイレクトが失敗した場合も完了画面を表示
                    setIsSubmitted(true);
                    setIsSubmitting(false);
                    setIsRedirecting(false);
                  }
                }
              }
            };

            // 即座に実行（ユーザーアクションのコンテキスト内で）
            console.log(`🎯 Debug: リダイレクト関数実行開始`);
            executeRedirect();

            // リダイレクト処理は非同期で実行されるため、ここではisSubmittingをfalseにしない
            return;
          } else {
            const data = await response.json();
            setError(data.error || "回答の送信に失敗しました");
            setIsSubmitting(false);
          }
        } catch (error) {
          console.error("回答送信エラー:", error);
          setError("回答の送信に失敗しました");
          setIsSubmitting(false);
        }
      } else {
        console.log(`⚠️ GoogleレビューURLが設定されていません`);
        console.log(`🔍 Debug: GoogleレビューURL詳細:`, {
          googleReviewUrl,
          type: typeof googleReviewUrl,
          length: googleReviewUrl?.length,
          truthyCheck: !!googleReviewUrl,
        });
        // GoogleレビューURLがない場合は、まず回答を保存してから完了画面を表示
        setIsSubmitting(true);
        setError(null);

        try {
          const response = await fetch(`/api/surveys/${surveyId}/responses`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              answers,
              respondentInfo: {
                submittedAt: new Date().toISOString(),
                averageRating: averageRating,
              },
            }),
          });

          if (response.ok) {
            setIsSubmitted(true);
          } else {
            const data = await response.json();
            setError(data.error || "回答の送信に失敗しました");
          }
        } catch (error) {
          console.error("回答送信エラー:", error);
          setError("回答の送信に失敗しました");
        } finally {
          setIsSubmitting(false);
        }
      }
    } else {
      // 平均評価が3.9以下の場合、改善点入力フォームを表示
      console.log(`🔽 平均評価が4.0未満のため、改善点フォームを表示します`);
      setShowImprovementForm(true);
    }
  };

  const renderQuestion = (question: Question) => {
    const hasError = validationErrors[question.id];

    switch (question.type) {
      case "rating":
        return (
          <div className="space-y-3">
            <div className="flex justify-center space-x-2">
              {Array.from({ length: question.scale || 5 }, (_, i) => i + 1).map(
                (rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() =>
                      handleAnswerChange(question.id, rating.toString())
                    }
                    className={`p-2 transition-colors ${
                      answers[question.id] === rating.toString()
                        ? "text-yellow-500"
                        : "text-gray-300 hover:text-yellow-400"
                    }`}
                  >
                    <Star
                      size={32}
                      fill={
                        answers[question.id] === rating.toString()
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                )
              )}
            </div>
            <div className="flex justify-between text-sm text-muted-foreground px-2">
              <span>とても不満</span>
              <span>とても満足</span>
            </div>
          </div>
        );

      case "choice":
        return (
          <RadioGroup
            value={answers[question.id] || ""}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "text":
        return (
          <Textarea
            value={answers[question.id] || ""}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="ご意見をお聞かせください..."
            className={hasError ? "border-red-500" : ""}
          />
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">アンケートを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>エラーが発生しました</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <CardTitle className="text-2xl">
                Googleレビューページへ移動中...
              </CardTitle>
              <CardDescription>
                アンケートの回答をありがとうございました！
                <br />
                Googleレビューページに移動しています。
                <br />
                <br />
                <span className="text-sm text-muted-foreground">
                  {isMobile
                    ? "モバイルでは同じタブで移動します。自動的に移動しない場合は、下のボタンをクリックしてください。"
                    : "新しいタブで開きます。自動的に移動しない場合は、下のボタンをクリックしてください。"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  if (googleReviewUrl) {
                    console.log(`🔗 Manual redirect to: ${googleReviewUrl}`);
                    console.log(
                      `📱 Manual redirect device: ${
                        isMobile ? "Mobile" : "Desktop"
                      }`
                    );

                    if (isMobile) {
                      // モバイル: 同じタブでリダイレクト
                      window.location.href = googleReviewUrl;
                    } else {
                      // デスクトップ: 新しいタブで開く
                      window.open(googleReviewUrl, "_blank");
                      // 手動でリンクを開いた後、完了画面を表示
                      setTimeout(() => {
                        console.log(
                          `🎉 Manual redirect completed, showing completion screen`
                        );
                        setIsSubmitted(true);
                        setIsSubmitting(false);
                        setIsRedirecting(false);
                      }, 500);
                    }
                  }
                }}
                className="w-full"
                variant="outline"
              >
                Googleレビューページを開く
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">ありがとうございます！</CardTitle>
              <CardDescription>
                アンケートの回答を送信いたしました。
                <br />
                お忙しい中、貴重なご意見をありがとうございました。
              </CardDescription>
            </CardHeader>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!survey || !survey.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle>アンケートが利用できません</CardTitle>
            <CardDescription>
              このアンケートは現在利用できない状態です。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{survey.title}</CardTitle>
              <CardDescription className="text-base">
                {survey.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {showImprovementForm ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label className="text-base font-medium">
                      サービス改善点をお聞かせください
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      貴重なご意見をお待ちしております。どのような点を改善すれば、より良いサービスを提供できるでしょうか？
                    </p>
                    <Textarea
                      value={improvementText}
                      onChange={(e) => setImprovementText(e.target.value)}
                      placeholder="改善点やご要望をお聞かせください..."
                      rows={6}
                      className="resize-none"
                    />
                  </div>
                </motion.div>
              ) : (
                survey.questions.map((question, index) => (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label className="text-base font-medium">
                        {index + 1}. {question.question}
                        {question.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </Label>
                      {validationErrors[question.id] && (
                        <p className="text-red-500 text-sm">
                          {validationErrors[question.id]}
                        </p>
                      )}
                    </div>
                    {renderQuestion(question)}
                  </motion.div>
                ))
              )}

              <div className="pt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-lg py-6"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      送信中...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Send size={20} className="mr-2" />
                      {showImprovementForm ? "ご意見を送信" : "回答を送信"}
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
