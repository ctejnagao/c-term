import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const DEFAULT_PAYABLE_PASSWORD = process.env.PAYABLE_PASSWORD || "ctej8077";
const AUTH_COOKIE_NAME = "ctej_payable_auth";

export async function GET() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const isAuthenticated = authCookie?.value === "authorized";

  return NextResponse.json({ authenticated: isAuthenticated });
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password === DEFAULT_PAYABLE_PASSWORD) {
      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_NAME, "authorized", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24, // 24時間
      });

      return NextResponse.json({ success: true, authenticated: true });
    } else {
      return NextResponse.json(
        { success: false, message: "パスワードが正しくありません" },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "リクエストの処理に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  return NextResponse.json({ success: true, authenticated: false });
}
