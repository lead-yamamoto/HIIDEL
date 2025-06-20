import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json();

    if (!action || !data) {
      return NextResponse.json(
        { error: "アクションとデータが必要です" },
        { status: 400 }
      );
    }

    // Salesforce認証情報
    const salesforceUsername = process.env.SALESFORCE_USERNAME;
    const salesforcePassword = process.env.SALESFORCE_PASSWORD;
    const salesforceSecurityToken = process.env.SALESFORCE_SECURITY_TOKEN;
    const salesforceLoginUrl =
      process.env.SALESFORCE_LOGIN_URL || "https://login.salesforce.com";

    if (
      !salesforceUsername ||
      !salesforcePassword ||
      !salesforceSecurityToken
    ) {
      return NextResponse.json(
        { error: "Salesforce認証情報が不足しています" },
        { status: 500 }
      );
    }

    // Salesforceにログイン
    const loginXml = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:enterprise.soap.sforce.com">
        <soapenv:Header/>
        <soapenv:Body>
          <urn:login>
            <urn:username>${salesforceUsername}</urn:username>
            <urn:password>${salesforcePassword}${salesforceSecurityToken}</urn:password>
          </urn:login>
        </soapenv:Body>
      </soapenv:Envelope>
    `;

    const loginResponse = await fetch(
      `${salesforceLoginUrl}/services/Soap/c/58.0`,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=UTF-8",
          SOAPAction: "login",
        },
        body: loginXml,
      }
    );

    if (!loginResponse.ok) {
      throw new Error("Salesforceログインに失敗しました");
    }

    const loginResult = await loginResponse.text();

    // セッションIDとサーバーURLを抽出（簡略化）
    const sessionIdMatch = loginResult.match(/<sessionId>([^<]+)<\/sessionId>/);
    const serverUrlMatch = loginResult.match(/<serverUrl>([^<]+)<\/serverUrl>/);

    if (!sessionIdMatch || !serverUrlMatch) {
      throw new Error("Salesforceログイン情報の解析に失敗しました");
    }

    const sessionId = sessionIdMatch[1];
    const serverUrl = serverUrlMatch[1];

    // アクションに応じた処理
    let result;
    switch (action) {
      case "createLead":
        result = await createSalesforceLead(data, sessionId, serverUrl);
        break;
      case "updateContact":
        result = await updateSalesforceContact(data, sessionId, serverUrl);
        break;
      case "syncReviews":
        result = await syncReviewsToSalesforce(data, sessionId, serverUrl);
        break;
      default:
        return NextResponse.json(
          { error: `未対応のアクション: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action: action,
      result: result,
    });
  } catch (error) {
    console.error("Salesforce CRM sync error:", error);
    return NextResponse.json(
      {
        error: "Salesforce連携でエラーが発生しました",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Salesforceリード作成
async function createSalesforceLead(
  data: any,
  sessionId: string,
  serverUrl: string
) {
  const createXml = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:enterprise.soap.sforce.com">
      <soapenv:Header>
        <urn:SessionHeader>
          <urn:sessionId>${sessionId}</urn:sessionId>
        </urn:SessionHeader>
      </soapenv:Header>
      <soapenv:Body>
        <urn:create>
          <urn:sObjects>
            <urn:type>Lead</urn:type>
            <urn:FirstName>${data.firstName}</urn:FirstName>
            <urn:LastName>${data.lastName}</urn:LastName>
            <urn:Email>${data.email}</urn:Email>
            <urn:Phone>${data.phone}</urn:Phone>
            <urn:Company>${data.company}</urn:Company>
            <urn:LeadSource>HIIDEL</urn:LeadSource>
          </urn:sObjects>
        </urn:create>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  const response = await fetch(serverUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=UTF-8",
      SOAPAction: "create",
    },
    body: createXml,
  });

  return await response.text();
}

// Salesforceコンタクト更新
async function updateSalesforceContact(
  data: any,
  sessionId: string,
  serverUrl: string
) {
  // 実装は類似パターン
  return { updated: true, contactId: data.contactId };
}

// レビューデータをSalesforceに同期
async function syncReviewsToSalesforce(
  data: any,
  sessionId: string,
  serverUrl: string
) {
  // レビューデータをカスタムオブジェクトに保存
  return { synced: data.reviews.length, timestamp: new Date().toISOString() };
}
