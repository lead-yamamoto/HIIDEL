import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log("🤖 [AI Review Reply] Request received:", requestBody);

    const { reviewText, rating, businessName, businessType, storeName } =
      requestBody;

    // パラメータの正規化（storeNameもbusinessNameとして受け入れる）
    const finalBusinessName = businessName || storeName;

    console.log("🔍 [AI Review Reply] Raw parameters received:", {
      reviewText: reviewText,
      rating: rating,
      businessName: businessName,
      businessType: businessType,
      storeName: storeName,
      finalBusinessName: finalBusinessName,
    });

    console.log("🔍 [AI Review Reply] Parameter validation:", {
      reviewText: !!reviewText,
      rating: !!rating,
      businessName: !!finalBusinessName,
      businessType: !!businessType,
      reviewTextLength: reviewText?.length || 0,
      finalBusinessNameLength: finalBusinessName?.length || 0,
    });

    // レビューテキストが空の場合の処理（評価のみでも返信生成）
    const processedReviewText = reviewText?.trim() || "";
    const hasReviewText = processedReviewText.length > 0;

    if (
      rating === undefined ||
      rating === null ||
      !finalBusinessName ||
      !finalBusinessName.trim()
    ) {
      console.error("❌ [AI Review Reply] Missing required parameters:", {
        reviewText: !!reviewText,
        reviewTextTrimmed: !!processedReviewText,
        hasReviewText: hasReviewText,
        rating: !!rating,
        businessName: !!finalBusinessName,
        businessNameTrimmed: !!finalBusinessName?.trim(),
      });
      return NextResponse.json(
        {
          error: "必要なパラメータが不足しています（評価と店舗名は必須です）",
          details: {
            reviewText: hasReviewText,
            rating: !!rating,
            businessName: !!finalBusinessName,
          },
        },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    console.log("🔑 [AI Review Reply] API keys check:", {
      gemini: !!geminiApiKey,
    });

    // Google Gemini APIを最優先で使用（無料）
    if (geminiApiKey) {
      try {
        console.log("🚀 [AI Review Reply] Using Google Gemini (Free)");
        const result = await generateGeminiReply(
          processedReviewText,
          rating,
          finalBusinessName,
          businessType,
          geminiApiKey,
          hasReviewText
        );
        console.log(
          "✅ [AI Review Reply] Gemini response generated successfully"
        );
        return NextResponse.json(result);
      } catch (error) {
        console.error("❌ [AI Review Reply] Gemini failed:", error);
        // テスト返信にフォールバック
      }
    }

    // Gemini APIが利用できない場合はテスト返信
    console.log("⚠️ [AI Review Reply] Gemini not available, using test reply");
    const result = generateTestReply(
      processedReviewText,
      rating,
      finalBusinessName,
      hasReviewText
    );
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

// Google Gemini APIを使用した返信生成（無料）

// Google Gemini APIを使用した返信生成
async function generateGeminiReply(
  reviewText: string,
  rating: number,
  businessName: string,
  businessType: string = "ビジネス",
  apiKey: string,
  hasReviewText: boolean = true
) {
  const isPositive = rating >= 4;
  const responseType = isPositive ? "感謝" : "改善への取り組み";

  const prompt = hasReviewText
    ? `
あなたは ${businessName} の${businessType}の優秀な顧客サービス担当者です。
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
          ? "可能であれば改善策や連絡先を提示"
          : "また来ていただきたいという気持ちを込める"
      }
- 自然で温かみのある文章にする
- 企業的すぎず、人間味のある返信にする

返信のみを出力してください。引用符や余計な説明は不要です。
`
    : `
あなたは ${businessName} の${businessType}の優秀な顧客サービス担当者です。
以下の評価のみのGoogleレビューに対して、プロフェッショナルで心のこもった返信を日本語で作成してください。

評価: ${rating}/5（コメントなし）

返信の要件:
- 150文字以内で簡潔に
- 丁寧な敬語を使用
- ${
        isPositive
          ? "評価をいただいたことへの感謝を表現し、今後も良いサービスを提供する意欲を示す"
          : "低い評価を真摯に受け止め、サービス改善への取り組みを示す"
      }
- ${
        isPositive
          ? "また利用していただきたいという気持ちを込める"
          : "具体的な改善策や今後の対応について言及"
      }
- 自然で温かみのある文章にする
- 企業的すぎず、人間味のある返信にする
- コメントがないことを自然に受け入れる

返信のみを出力してください。引用符や余計な説明は不要です。
`;

  // 最大3回リトライ
  let lastError: any = null;
  for (let i = 0; i < 3; i++) {
    try {
      console.log(`🔄 [Gemini] Attempt ${i + 1}/3`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
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
              maxOutputTokens: 250,
              temperature: 0.7,
              topP: 0.8,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const replyText =
          data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

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
            model: "gemini-2.0-flash",
            attempt: i + 1,
            isFree: true,
          },
        };
      } else if (response.status === 429) {
        // レート制限の場合は少し待ってリトライ
        console.log(
          `⏳ [Gemini] Rate limited, waiting before retry ${i + 1}/3`
        );
        await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1))); // 指数バックオフ
        lastError = new Error(`Gemini API レート制限: ${response.statusText}`);
        continue;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [Gemini] API error:`, {
          status: response.status,
          error: errorData,
        });
        throw new Error(
          `Gemini API error: ${response.status} - ${
            errorData.error?.message || response.statusText
          }`
        );
      }
    } catch (error) {
      lastError = error;
      console.error(`❌ [Gemini] Attempt ${i + 1} failed:`, error);
      if (i === 2) break; // 最後の試行の場合はbreak
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // 待機してリトライ
    }
  }

  // 全て失敗した場合はエラーをthrow
  throw lastError || new Error("Gemini API: 全てのリトライが失敗しました");
}

// テスト返信生成
function generateTestReply(
  reviewText: string,
  rating: number,
  businessName: string,
  hasReviewText: boolean = true
) {
  const isPositive = rating >= 4;

  let testReply: string;

  if (hasReviewText) {
    // コメント付きレビューの場合
    testReply = isPositive
      ? `この度は${businessName}をご利用いただき、ありがとうございます。お客様からの温かいお言葉を頂戴し、スタッフ一同大変嬉しく思っております。今後もより良いサービスを提供できるよう努めてまいります。またのご利用を心よりお待ちしております。`
      : `この度は${businessName}をご利用いただき、ありがとうございました。貴重なご意見をいただき、改善点を真摯に受け止めております。お客様により良いサービスを提供できるよう、スタッフ一同改善に努めてまいります。機会がございましたら、ぜひ再度ご利用ください。`;
  } else {
    // 評価のみの場合
    testReply = isPositive
      ? `この度は${businessName}をご利用いただき、ありがとうございます。${rating}つ星の評価をいただき、スタッフ一同大変嬉しく思っております。今後もお客様にご満足いただけるよう、サービス向上に努めてまいります。またのご利用を心よりお待ちしております。`
      : `この度は${businessName}をご利用いただき、ありがとうございました。いただいた評価を真摯に受け止め、お客様により良いサービスを提供できるよう改善に取り組んでまいります。お気づきの点がございましたら、お気軽にお声がけください。今後ともよろしくお願いいたします。`;
  }

  console.log(`🧪 [Test] Generated test reply (${testReply.length} chars)`);

  return {
    success: true,
    reply: testReply,
    metadata: {
      rating: rating,
      isPositive: isPositive,
      responseType: isPositive ? "感謝" : "改善への取り組み",
      provider: "Test (Gemini API not available)",
      isTestReply: true,
      isFree: true,
    },
  };
}
