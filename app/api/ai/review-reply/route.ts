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
    });

    if (!reviewText || !rating || !businessName) {
      console.error("パラメータ不足:", { reviewText, rating, businessName });
      return NextResponse.json(
        {
          error: "必要なパラメータが不足しています",
          details: {
            reviewText: !!reviewText,
            rating: !!rating,
            businessName: !!businessName,
          },
        },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    console.log("API キー確認:", {
      openai: !!openaiApiKey,
      openaiLength: openaiApiKey?.length || 0,
      gemini: !!geminiApiKey,
      geminiLength: geminiApiKey?.length || 0,
      NODE_ENV: process.env.NODE_ENV,
    });

    // OpenAI APIを試す
    if (openaiApiKey) {
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
    }

    // Google Gemini APIを試す
    if (geminiApiKey) {
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
    }

    // APIキーが設定されていない場合はテスト返信
    console.log("⚠️ APIキーが未設定のため、テスト返信を生成します");
    const result = generateTestReply(reviewText, rating, businessName);
    return NextResponse.json({
      ...result,
      warning:
        "APIキーが設定されていないため、テスト返信を使用しています。本番環境では OPENAI_API_KEY または GEMINI_API_KEY を設定してください。",
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
