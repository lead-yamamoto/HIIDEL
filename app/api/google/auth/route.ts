import { NextResponse } from "next/server"

export async function GET() {
  // Instead of redirecting directly, return a JSON response with the auth URL
  // This avoids potential issues with redirects in the preview environment

  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

    // Check if the required environment variable is set
    if (!GOOGLE_CLIENT_ID) {
      console.error("Missing GOOGLE_CLIENT_ID environment variable")
      return NextResponse.json(
        {
          error: "Configuration error",
          message: "Missing GOOGLE_CLIENT_ID environment variable",
        },
        { status: 500 },
      )
    }

    // Define the OAuth parameters
    const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:3000/api/google/callback"
    const SCOPES = [
      "https://www.googleapis.com/auth/business.manage",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ]

    // Construct the auth URL
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(SCOPES.join(" "))}` +
      `&access_type=offline` +
      `&prompt=consent`

    // Return the auth URL in the response
    // The frontend will handle the redirect
    return NextResponse.json({
      success: true,
      authUrl: authUrl,
    })
  } catch (error) {
    console.error("Google auth error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    )
  }
}
