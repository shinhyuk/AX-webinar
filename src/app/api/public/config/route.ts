import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("config")
    .select("ppt_embed_url")
    .eq("id", 1)
    .maybeSingle();
  return NextResponse.json({
    ppt_embed_url: data?.ppt_embed_url ?? null,
  });
}
