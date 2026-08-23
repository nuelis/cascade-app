import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractExpiryDate, earliestDate } from "@/lib/extractExpiry";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const vendorName = formData.get("vendorName") as string | null;
  const companyId = formData.get("companyId") as string | null;
  const accessScope = (formData.get("accessScope") as string) || null;

  if (!file || !vendorName || !companyId) {
    return NextResponse.json(
      { error: "file, vendorName, and companyId are required" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let candidateDates: string[] = [];
  let rawText = "";
  try {
    const result = await extractExpiryDate(buffer);
    candidateDates = result.candidateDates;
    rawText = result.rawText;
  } catch (err) {
    console.error("OCR extraction failed:", err);
    // Don't hard-fail the upload — let the user manually enter the date
    // if OCR couldn't read this particular certificate layout.
  }

  const expiry = earliestDate(candidateDates);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("vendors")
    .insert({
      company_id: companyId,
      name: vendorName,
      access_scope: accessScope,
      status: expiry && expiry > new Date() ? "clear" : "needs_review",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    vendor: data,
    detectedExpiry: expiry ? expiry.toISOString().split("T")[0] : null,
    candidateDates,
    needsManualReview: !expiry,
    rawTextPreview: rawText.slice(0, 500),
  });
}
