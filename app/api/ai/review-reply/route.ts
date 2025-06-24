import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log("🤖 [AI Review Reply] Request received:", requestBody);

    const { reviewText, rating, businessName, businessType, storeName } =
      requestBody;

    // パラメータの正規化（storeNameもbusinessNameとして受け入れる）
    const finalBusinessName = businessName || storeName;

    console.log("🔍 [AI Review Reply] Parameter check:", {
      reviewText: !!reviewText,
      rating: !!rating,
      businessName: !!finalBusinessName,
      businessType: !!businessType,
    });

    if (!reviewText || !rating || !finalBusinessName) {
      console.error("❌ [AI Review Reply] Missing required parameters:", {
        reviewText: !!reviewText,
        rating: !!rating,
        businessName: !!finalBusinessName,
      });
      return NextResponse.json(
        {
          error: "必要なパラメータが不足しています",
          details: {
            reviewText: !!reviewText,
            rating: !!rating,
            businessName: !!finalBusinessName,
          },
        },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    console.log("🔑 [AI Review Reply] API keys check:", {
      openai: !!openaiApiKey,
      gemini: !!geminiApiKey,
    });

    // OpenAI GPT-4oを優先的に使用
    if (openaiApiKey) {
      try {
        console.log("🚀 [AI Review Reply] Using OpenAI GPT-4o");
        const result = await generateOpenAIReply(
          reviewText,
          rating,
          finalBusinessName,
          businessType,
          openaiApiKey
        );
        console.log(
          "✅ [AI Review Reply] OpenAI response generated successfully"
        );
        return NextResponse.json(result);
      } catch (error) {
        console.error("❌ [AI Review Reply] OpenAI failed:", error);
        // Geminiにフォールバック
      }
    }

    // Google Gemini APIにフォールバック
    if (geminiApiKey) {
      try {
        console.log("🔄 [AI Review Reply] Falling back to Gemini");
        const result = await generateGeminiReply(
          reviewText,
          rating,
          finalBusinessName,
          businessType,
          geminiApiKey
        );
        console.log(
          "✅ [AI Review Reply] Gemini response generated successfully"
        );
        return NextResponse.json(result);
      } catch (error) {
        console.error("❌ [AI Review Reply] Gemini failed:", error);
      }
    }

    // APIキーが設定されていない場合はテスト返信
    console.log("⚠️ [AI Review Reply] No API keys available, using test reply");
    const result = generateTestReply(reviewText, rating, finalBusinessName);
    return NextResponse.json(result);
  } catch (error) {
    console.error("💥 [AI Review Reply] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "AI返信生成でエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// OpenAI GPT-4oを使用した返信生成
async function generateOpenAIReply(
  reviewText: string,
  rating: number,
  businessName: string,
  businessType: string = "ビジネス",
  apiKey: string
) {
  const isPositive = rating >= 4;
  const responseType = isPositive ? "感謝" : "改善への取り組み";

  const prompt = `
あなたは ${businessName} の${businessType}の顧客サービス担当者です。
以下のGoogleレビューに対して、プロフェッショナルで心のこもった返信を日本語で作成してください。

レビュー内容: "${reviewText}"
評価: ${rating}/5

返信の要件:
- 150文字以内で簡潔に
- 丁寧な敬語を使用
- ${
    isPositive
      ? "感謝の気持ちを表現し、今後も良いサービスを提供する意欲を示す"
      : "問題を真摯に受け止め、具体的な改善への取り組みを示す"
  }
- 顧客の具体的なコメントに触れる
- ${
    !isPositive
      ? "可能であれば連絡先や改善策を提示"
      : "また来ていただきたいという気持ちを込める"
  }
- 自然で温かみのある文章にする

返信のみを出力してください。引用符は不要です。
`;

  // 最大3回リトライ
  let lastError: any = null;
  for (let i = 0; i < 3; i++) {
    try {
      console.log(`🔄 [OpenAI] Attempt ${i + 1}/3`);

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o", // GPT-4oを使用
            messages: [
              {
                role: "system",
                content:
                  "あなたは優秀な顧客サービス担当者で、レビューへの心のこもった返信作成の専門家です。常にプロフェッショナルで温かく、顧客に寄り添う返信を作成します。",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 300,
            temperature: 0.7,
            top_p: 0.9,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const replyText = data.choices[0]?.message?.content?.trim();

        if (!replyText) {
          throw new Error("OpenAIからの返信が空でした");
        }

        console.log(
          `✅ [OpenAI] Generated reply (${replyText.length} chars):`,
          replyText.substring(0, 100) + "..."
        );

        return {
          success: true,
          reply: replyText,
          metadata: {
            rating: rating,
            isPositive: isPositive,
            responseType: responseType,
            provider: "OpenAI",
            model: "gpt-4o",
            attempt: i + 1,
            tokensUsed: data.usage?.total_tokens || 0,
          },
        };
      } else if (response.status === 429) {
        // レート制限の場合は少し待ってリトライ
        console.log(
          `⏳ [OpenAI] Rate limited, waiting before retry ${i + 1}/3`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1))); // 指数バックオフ
        lastError = new Error(`OpenAI API レート制限: ${response.statusText}`);
        continue;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [OpenAI] API error:`, {
          status: response.status,
          error: errorData,
        });
        throw new Error(
          `OpenAI API error: ${response.status} - ${
            errorData.error?.message || response.statusText
          }`
        );
      }
    } catch (error) {
      lastError = error;
      console.error(`❌ [OpenAI] Attempt ${i + 1} failed:`, error);
      if (i === 2) break; // 最後の試行の場合はbreak
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // 待機してリトライ
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
  businessType: string = "ビジネス",
  apiKey: string
) {
  const isPositive = rating >= 4;
  const responseType = isPositive ? "感謝" : "改善への取り組み";

  const prompt = `
あなたは ${businessName} の${businessType}の顧客サービス担当者です。
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
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Gemini API error: ${response.status} - ${
        errorData.error?.message || response.statusText
      }`
    );
  }

  const data = await response.json();
  const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!replyText) {
    throw new Error("Geminiからの返信が空でした");
  }

  console.log(
    `✅ [Gemini] Generated reply (${replyText.length} chars):`,
    replyText.substring(0, 100) + "..."
  );

  return {
    success: true,
    reply: replyText,
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

  console.log(`🧪 [Test] Generated test reply (${testReply.length} chars)`);

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
