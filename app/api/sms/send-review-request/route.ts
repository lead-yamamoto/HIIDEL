import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, customerName, businessName, reviewUrl, storeId } =
      await request.json();

    if (!phoneNumber || !businessName || !reviewUrl) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています" },
        { status: 400 }
      );
    }

    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return NextResponse.json(
        { error: "Twilio設定が不完全です" },
        { status: 500 }
      );
    }

    // 日本の電話番号形式に正規化
    const normalizedPhoneNumber = phoneNumber.startsWith("+81")
      ? phoneNumber
      : phoneNumber.startsWith("0")
      ? "+81" + phoneNumber.slice(1)
      : "+81" + phoneNumber;

    // SMSメッセージを作成
    const customerDisplay = customerName ? `${customerName}様` : "お客様";
    const message = `${customerDisplay}

${businessName}をご利用いただき、ありがとうございました！

サービスはいかがでしたでしょうか？
もしよろしければ、Googleレビューで感想をお聞かせください。

レビューはこちらから：
${reviewUrl}

貴重なご意見をお待ちしております。

※配信停止をご希望の場合は「停止」と返信してください。`;

    // Twilio APIを使用してSMSを送信
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString(
            "base64"
          ),
      },
      body: new URLSearchParams({
        From: twilioPhoneNumber,
        To: normalizedPhoneNumber,
        Body: message,
      }),
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.json();
      console.error("Twilio error:", errorData);
      return NextResponse.json(
        { error: "SMS送信に失敗しました", details: errorData },
        { status: 400 }
      );
    }

    const responseData = await twilioResponse.json();

    // 送信ログを記録（実際のアプリではデータベースに保存）
    console.log(`SMS sent: ${responseData.sid} to ${normalizedPhoneNumber}`);

    return NextResponse.json({
      success: true,
      messageSid: responseData.sid,
      to: normalizedPhoneNumber,
      status: responseData.status,
      sentAt: new Date().toISOString(),
      storeId: storeId,
    });
  } catch (error) {
    console.error("SMS send error:", error);
    return NextResponse.json(
      {
        error: "SMS送信でエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
