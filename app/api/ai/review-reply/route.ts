import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log("AI返信生成APIリクエスト:", requestBody);

    const { reviewText, rating, businessName, businessType } = requestBody;

    console.log("パラメータチェック:", {
      reviewText: reviewText,
      rating: rating,
      businessName: businessName,
      businessType: businessType,
      hasReviewText: !!reviewText,
      hasRating: !!rating,
      hasBusinessName: !!businessName,
      reviewTextType: typeof reviewText,
      reviewTextLength: reviewText?.length || 0,
      reviewTextTrimmed: reviewText?.trim?.() || "",
      reviewTextTrimmedLength: reviewText?.trim?.()?.length || 0,
    });

    // より詳細なパラメータ検証
    const isValidReviewText =
      reviewText &&
      typeof reviewText === "string" &&
      reviewText.trim().length > 0;

    const isValidRating =
      rating && typeof rating === "number" && rating >= 1 && rating <= 5;

    const isValidBusinessName =
      businessName &&
      typeof businessName === "string" &&
      businessName.trim().length > 0;

    console.log("詳細検証結果:", {
      isValidReviewText,
      isValidRating,
      isValidBusinessName,
    });

    if (!isValidReviewText || !isValidRating || !isValidBusinessName) {
      console.error("パラメータ検証エラー:", {
        reviewText: {
          value: reviewText,
          type: typeof reviewText,
          valid: isValidReviewText,
        },
        rating: {
          value: rating,
          type: typeof rating,
          valid: isValidRating,
        },
        businessName: {
          value: businessName,
          type: typeof businessName,
          valid: isValidBusinessName,
        },
      });
      return NextResponse.json(
        {
          error:
            "必要なパラメータが不足またはしており、正しく設定されていません",
          details: {
            reviewText: isValidReviewText,
            rating: isValidRating,
            businessName: isValidBusinessName,
          },
          validation: {
            reviewText: {
              received: reviewText,
              type: typeof reviewText,
              length: reviewText?.length || 0,
              trimmedLength: reviewText?.trim?.()?.length || 0,
            },
            rating: {
              received: rating,
              type: typeof rating,
            },
            businessName: {
              received: businessName,
              type: typeof businessName,
              length: businessName?.length || 0,
            },
          },
        },
        { status: 400 }
      );
    }

    // 環境変数の詳細チェック
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // よくある環境変数名のバリエーションもチェック
    const possibleOpenAIKeys = [
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_KEY,
      process.env.OPEN_AI_API_KEY,
      process.env.OPENAI_SECRET_KEY,
    ].filter(Boolean);

    const possibleGeminiKeys = [
      process.env.GEMINI_API_KEY,
      process.env.GOOGLE_AI_API_KEY,
      process.env.GOOGLE_GEMINI_API_KEY,
      process.env.GEMINI_KEY,
    ].filter(Boolean);

    console.log("🔍 環境変数デバッグ:", {
      OPENAI_API_KEY: {
        exists: !!openaiApiKey,
        length: openaiApiKey?.length || 0,
        startsWithSk: openaiApiKey?.startsWith("sk-") || false,
        firstChars: openaiApiKey
          ? openaiApiKey.substring(0, 8) + "..."
          : "なし",
      },
      GEMINI_API_KEY: {
        exists: !!geminiApiKey,
        length: geminiApiKey?.length || 0,
        firstChars: geminiApiKey
          ? geminiApiKey.substring(0, 8) + "..."
          : "なし",
      },
      possibleOpenAIKeys: possibleOpenAIKeys.length,
      possibleGeminiKeys: possibleGeminiKeys.length,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      allEnvKeys: Object.keys(process.env)
        .filter(
          (key) =>
            key.includes("OPENAI") ||
            key.includes("GEMINI") ||
            key.includes("API") ||
            key.includes("KEY")
        )
        .slice(0, 10), // 最初の10個だけ表示
    });

    // OpenAI APIを試す
    if (openaiApiKey && openaiApiKey.length > 10) {
      try {
        console.log("🤖 OpenAI APIで返信を生成中...");
        const result = await generateOpenAIReply(
          reviewText,
          rating,
          businessName,
          businessType,
          openaiApiKey
        );
        console.log("✅ OpenAI API成功");
        return NextResponse.json(result);
      } catch (error) {
        console.error("OpenAI API失敗:", error);
        // Geminiにフォールバック
      }
    } else {
      console.log("⚠️ OpenAI APIキーが無効:", {
        exists: !!openaiApiKey,
        length: openaiApiKey?.length || 0,
      });
    }

    // Google Gemini APIを試す
    if (geminiApiKey && geminiApiKey.length > 10) {
      try {
        console.log("🤖 Gemini APIで返信を生成中...");
        const result = await generateGeminiReply(
          reviewText,
          rating,
          businessName,
          businessType,
          geminiApiKey
        );
        console.log("✅ Gemini API成功");
        return NextResponse.json(result);
      } catch (error) {
        console.error("Gemini API失敗:", error);
        // テスト返信にフォールバック
      }
    } else {
      console.log("⚠️ Gemini APIキーが無効:", {
        exists: !!geminiApiKey,
        length: geminiApiKey?.length || 0,
      });
    }

    // APIキーが設定されていない場合はテスト返信
    console.log("⚠️ 有効なAPIキーが見つからないため、テスト返信を生成します");
    const result = generateTestReply(reviewText, rating, businessName);
    return NextResponse.json({
      ...result,
      warning:
        "APIキーが設定されていないか無効のため、テスト返信を使用しています。本番環境では OPENAI_API_KEY または GEMINI_API_KEY を正しく設定してください。",
      debug: {
        openaiExists: !!openaiApiKey,
        openaiLength: openaiApiKey?.length || 0,
        geminiExists: !!geminiApiKey,
        geminiLength: geminiApiKey?.length || 0,
      },
    });
  } catch (error) {
    console.error("AI review reply error:", error);
    return NextResponse.json(
      {
        error: "AI返信生成でエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// OpenAI APIを使用した返信生成
async function generateOpenAIReply(
  reviewText: string,
  rating: number,
  businessName: string,
  businessType: string,
  apiKey: string
) {
  const isPositive = rating >= 4;
  const responseType = isPositive ? "感謝" : "改善への取り組み";

  const prompt = `
あなたは ${businessName} の${
    businessType || "ビジネス"
  }の顧客サービス担当者です。
以下のGoogleレビューに対して、${responseType}を示す丁寧で心のこもった返信を日本語で作成してください。

レビュー内容: "${reviewText}"
評価: ${rating}/5

返信の条件:
- 150文字以内
- 敬語を使用
- ${
    isPositive
      ? "感謝の気持ちを表現"
      : "問題を真摯に受け止め、改善への意欲を示す"
  }
- 顧客の具体的なコメントに言及
- ${
    !isPositive
      ? "今後の改善策や連絡先を提示"
      : "今後ともよろしくお願いしますという気持ちを込める"
  }
`;

  // レート制限対策：3回までリトライ
  let lastError;
  for (let i = 0; i < 3; i++) {
    try {
      // リトライ時は待機
      if (i > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        ); // 1秒、2秒、4秒待機
        console.log(`OpenAI API リトライ ${i + 1}/3`);
      }

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo", // より制限が緩いモデルに変更
            messages: [
              {
                role: "system",
                content:
                  "あなたは顧客サービスの専門家で、レビューへの返信作成を支援します。",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 200,
            temperature: 0.7,
          }),
        }
      );

      if (response.ok) {
        // 成功時はループを抜けてデータを処理
        const data = await response.json();
        const replyText = data.choices[0]?.message?.content;

        if (!replyText) {
          throw new Error("OpenAIからの返信生成に失敗しました");
        }

        return {
          success: true,
          reply: replyText.trim(),
          metadata: {
            rating: rating,
            isPositive: isPositive,
            responseType: responseType,
            provider: "OpenAI",
            model: "gpt-3.5-turbo",
            retries: i,
          },
        };
      } else if (response.status === 429) {
        // レート制限の場合は再試行
        lastError = new Error(`OpenAI API レート制限: ${response.statusText}`);
        console.log(`レート制限に達した (${i + 1}/3)`);
        continue;
      } else {
        // その他のエラーの場合は即座に終了
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }
    } catch (error) {
      lastError = error;
      if (i === 2) break; // 最後の試行の場合はbreak
    }
  }

  // 全て失敗した場合はエラーをthrow
  throw lastError || new Error("OpenAI API: 全てのリトライが失敗しました");
}

// Google Gemini APIを使用した返信生成
async function generateGeminiReply(
  reviewText: string,
  rating: number,
  businessName: string,
  businessType: string,
  apiKey: string
) {
  const isPositive = rating >= 4;
  const responseType = isPositive ? "感謝" : "改善への取り組み";

  const prompt = `
あなたは ${businessName} の${
    businessType || "ビジネス"
  }の顧客サービス担当者です。
以下のGoogleレビューに対して、${responseType}を示す丁寧で心のこもった返信を日本語で作成してください。

レビュー内容: "${reviewText}"
評価: ${rating}/5

返信の条件:
- 150文字以内
- 敬語を使用
- ${
    isPositive
      ? "感謝の気持ちを表現"
      : "問題を真摯に受け止め、改善への意欲を示す"
  }
- 顧客の具体的なコメントに言及
- ${
    !isPositive
      ? "今後の改善策や連絡先を提示"
      : "今後ともよろしくお願いしますという気持ちを込める"
  }

返信のみを出力してください。
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!replyText) {
    throw new Error("Geminiからの返信生成に失敗しました");
  }

  return {
    success: true,
    reply: replyText.trim(),
    metadata: {
      rating: rating,
      isPositive: isPositive,
      responseType: responseType,
      provider: "Google Gemini",
      model: "gemini-pro",
    },
  };
}

// テスト返信生成
function generateTestReply(
  reviewText: string,
  rating: number,
  businessName: string
) {
  const isPositive = rating >= 4;
  const testReply = isPositive
    ? `この度は${businessName}をご利用いただき、ありがとうございます。お客様からの温かいお言葉を頂戴し、スタッフ一同大変嬉しく思っております。今後もより良いサービスを提供できるよう努めてまいります。またのご利用を心よりお待ちしております。`
    : `この度は${businessName}をご利用いただき、ありがとうございました。貴重なご意見をいただき、改善点を真摯に受け止めております。お客様により良いサービスを提供できるよう、スタッフ一同改善に努めてまいります。機会がございましたら、ぜひ再度ご利用ください。`;

  return {
    success: true,
    reply: testReply,
    metadata: {
      rating: rating,
      isPositive: isPositive,
      responseType: isPositive ? "感謝" : "改善への取り組み",
      provider: "Test",
      isTestReply: true,
    },
  };
}
