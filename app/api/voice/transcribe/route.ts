import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const language = (formData.get("language") as string) || "ja";

    if (!audioFile) {
      return NextResponse.json(
        { error: "音声ファイルが必要です" },
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

    // OpenAI Whisper APIに送信
    const whisperFormData = new FormData();
    whisperFormData.append("file", audioFile);
    whisperFormData.append("model", "whisper-1");
    whisperFormData.append("language", language);
    whisperFormData.append("response_format", "json");

    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: whisperFormData,
      }
    );

    if (!whisperResponse.ok) {
      const errorData = await whisperResponse.json();
      console.error("Whisper API error:", errorData);
      return NextResponse.json(
        { error: "音声認識に失敗しました", details: errorData },
        { status: 400 }
      );
    }

    const transcriptionData = await whisperResponse.json();
    const transcribedText = transcriptionData.text;

    // AIによる分析とアクションの提案
    const analysisPrompt = `
以下は顧客から受け取った音声メモの内容です。内容を分析して、適切なアクション、優先度、カテゴリを提案してください。

音声内容: "${transcribedText}"

以下のJSON形式で回答してください：
{
  "summary": "要約（50文字以内）",
  "category": "カテゴリ（苦情/要望/質問/その他）",
  "priority": "優先度（高/中/低）",
  "suggestedActions": ["提案アクション1", "提案アクション2"],
  "sentiment": "感情（ポジティブ/ネガティブ/中立）",
  "tags": ["タグ1", "タグ2"]
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
              content:
                "あなたは顧客サービスの専門家で、音声メモの内容を分析してアクションを提案します。",
            },
            {
              role: "user",
              content: analysisPrompt,
            },
          ],
          max_tokens: 500,
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

    return NextResponse.json({
      success: true,
      transcription: transcribedText,
      analysis: analysis,
      audioInfo: {
        originalName: audioFile.name,
        size: audioFile.size,
        type: audioFile.type,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Voice transcription error:", error);
    return NextResponse.json(
      {
        error: "音声処理でエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
