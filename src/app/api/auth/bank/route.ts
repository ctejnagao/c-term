import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BANK_PASSWORD = process.env.BANK_PASSWORD || "ctej8077";
const BANK_AUTH_COOKIE = "ctej_bank_session";

export async function GET() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(BANK_AUTH_COOKIE);
  const isAuthenticated = authCookie?.value === "authorized";

  return NextResponse.json({ authenticated: isAuthenticated });
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (password === BANK_PASSWORD) {
      const cookieStore = await cookies();
      // maxAgeを指定しないことで、ブラウザセッション中（タブ/ブラウザを閉じるまで）のみ有効
      cookieStore.set(BANK_AUTH_COOKIE, "authorized", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
      });

      return NextResponse.json({ success: true, authenticated: true });
    } else {
      return NextResponse.json(
        { success: false, message: "パスワードが正しくありません" },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "認証処理に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(BANK_AUTH_COOKIE);
  return NextResponse.json({ success: true, authenticated: false });
}
