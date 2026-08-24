import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/vendors?companyId=xxx — list all vendors for a company
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("company_id", companyId)
    .order("expiry_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendors: data });
}

// PATCH /api/vendors — manually set/correct an expiry date
// (needed for certs OCR couldn't read cleanly)
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { vendorId, expiryDate, accessScope, contactEmail } = body;

  if (!vendorId) {
    return NextResponse.json({ error: "vendorId required" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const updates: Record<string, any> = {};
  if (expiryDate) {
    updates.expiry_date = expiryDate;
    updates.status = new Date(expiryDate) > new Date() ? "clear" : "expired";
  }
  if (accessScope !== undefined) updates.access_scope = accessScope;
  if (contactEmail !== undefined) updates.contact_email = contactEmail;

  const { data, error } = await supabase
    .from("vendors")
    .update(updates)
    .eq("id", vendorId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendor: data });
}

// DELETE /api/vendors?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("vendors").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
