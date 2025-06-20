import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      conversationId,
      businessContext,
      language = "ja",
    } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "メッセージが必要です" },
        { status: 400 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API キーが設定されていません" },
        { status: 500 }
      );
    }

    // ビジネスコンテキストに基づいたシステムプロンプト
    const systemPrompt = `
あなたは${
      businessContext?.businessName || "HIIDEL"
    }のAIカスタマーサポートボットです。

ビジネス情報:
- 業種: ${businessContext?.businessType || "中小企業向けDXツール"}
- 営業時間: ${businessContext?.businessHours || "月-金 9:00-18:00"}
- 所在地: ${businessContext?.location || "東京"}
- 主要サービス: ${
      businessContext?.services ||
      "Googleレビュー管理、QRコード生成、顧客アンケート"
    }

対応ガイドライン:
1. 丁寧で親しみやすい日本語で応答
2. 具体的で実用的な情報を提供
3. 分からない場合は正直に伝える
4. 緊急性の高い問い合わせは人間のスタッフに転送を提案
5. 営業時間外は翌営業日の対応を案内
6. レビュー管理、QRコード、アンケート機能について詳しく説明可能

応答形式:
- 簡潔で理解しやすい回答
- 必要に応じて箇条書きを使用
- 関連機能の提案も含める
`;

    // 会話履歴の管理（簡略化版、実際はデータベースで管理）
    let conversationHistory: ChatMessage[] = [];
    if (conversationId) {
      // 実際の実装では、conversationIdからデータベースより履歴を取得
      conversationHistory = [];
    }

    // AIに送信するメッセージ配列を構築
    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    const chatResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: messages,
          max_tokens: 800,
          temperature: 0.7,
          top_p: 0.9,
        }),
      }
    );

    if (!chatResponse.ok) {
      const errorData = await chatResponse.json();
      console.error("OpenAI Chat API error:", errorData);
      return NextResponse.json(
        { error: "チャットボット応答の生成に失敗しました", details: errorData },
        { status: 400 }
      );
    }

    const chatData = await chatResponse.json();
    const botReply = chatData.choices[0]?.message?.content;

    if (!botReply) {
      throw new Error("AIからの返信が生成されませんでした");
    }

    // 会話の分析（トーン、緊急度、カテゴリ）
    const analysisPrompt = `
ユーザーメッセージ: "${message}"
ボット返信: "${botReply}"

この会話を分析してJSON形式で回答してください：
{
  "urgency": "緊急度（低/中/高）",
  "category": "カテゴリ（質問/苦情/要望/技術サポート/その他）",
  "sentiment": "ユーザーの感情（ポジティブ/ネガティブ/中立）",
  "needsHumanSupport": "人間サポートが必要か（true/false）",
  "suggestedActions": ["提案アクション"]
}
`;

    const analysisResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "会話分析の専門家として分析してください。",
            },
            { role: "user", content: analysisPrompt },
          ],
          max_tokens: 300,
          temperature: 0.3,
        }),
      }
    );

    let analysis = null;
    if (analysisResponse.ok) {
      const analysisData = await analysisResponse.json();
      try {
        analysis = JSON.parse(
          analysisData.choices[0]?.message?.content || "{}"
        );
      } catch (e) {
        console.warn("Failed to parse analysis JSON:", e);
      }
    }

    // 会話ログの保存（実際の実装ではデータベースに保存）
    const conversationLog = {
      conversationId: conversationId || generateConversationId(),
      timestamp: new Date().toISOString(),
      userMessage: message,
      botReply: botReply,
      analysis: analysis,
      businessContext: businessContext,
    };

    return NextResponse.json({
      success: true,
      reply: botReply,
      conversationId: conversationLog.conversationId,
      analysis: analysis,
      timestamp: conversationLog.timestamp,
      metadata: {
        tokensUsed: chatData.usage?.total_tokens || 0,
        model: "gpt-4",
      },
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    return NextResponse.json(
      {
        error: "チャットボット処理でエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// 会話IDの生成
function generateConversationId(): string {
  return "conv_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}
