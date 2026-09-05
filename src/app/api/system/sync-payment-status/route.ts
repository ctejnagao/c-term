import { NextResponse } from "next/server";
import { syncPaymentStatuses } from "@/lib/paymentSync";

export async function GET() {
  try {
    const result = await syncPaymentStatuses();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
