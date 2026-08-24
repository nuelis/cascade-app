import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";
import { differenceInCalendarDays } from "date-fns";

const resend = new Resend(process.env.RESEND_API_KEY);

// Alert thresholds — days-before-expiry that trigger a notification.
// Vercel Cron (or any scheduler) should hit this once a day.
const ALERT_WINDOWS = [30, 14, 1];

export async function GET(req: NextRequest) {
  // Simple shared-secret check so randoms can't trigger this endpoint
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const { data: vendors, error } = await supabase
    .from("vendors")
    .select("*, companies(name)")
    .not("expiry_date", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: any[] = [];

  for (const vendor of vendors || []) {
    const daysLeft = differenceInCalendarDays(
      new Date(vendor.expiry_date),
      new Date()
    );

    let newStatus = vendor.status;
    if (daysLeft < 0) newStatus = "expired";
    else if (daysLeft <= 30) newStatus = "expiring";
    else newStatus = "clear";

    const shouldAlert =
      ALERT_WINDOWS.includes(daysLeft) ||
      (daysLeft < 0 && newStatus !== vendor.status); // fire once on the day it actually lapses

    if (shouldAlert) {
      await sendAlertEmail(vendor, daysLeft);
      await supabase
        .from("vendors")
        .update({ status: newStatus, last_alert_sent_at: new Date().toISOString() })
        .eq("id", vendor.id);
      results.push({ vendor: vendor.name, daysLeft, alerted: true });
    } else if (newStatus !== vendor.status) {
      await supabase.from("vendors").update({ status: newStatus }).eq("id", vendor.id);
      results.push({ vendor: vendor.name, daysLeft, alerted: false, statusUpdated: true });
    }
  }

  return NextResponse.json({ checked: vendors?.length || 0, results });
}

async function sendAlertEmail(vendor: any, daysLeft: number) {
  const urgency = daysLeft < 0 ? "EXPIRED" : daysLeft <= 1 ? "EXPIRES TOMORROW" : `expires in ${daysLeft} days`;

  const subject =
    daysLeft < 0
      ? `⚠️ ${vendor.name}'s insurance has LAPSED`
      : `${vendor.name}'s insurance ${urgency}`;

  const body =
    daysLeft < 0
      ? `${vendor.name}'s insurance certificate expired. They should not be doing work on your behalf until you receive updated proof of coverage.`
      : `${vendor.name}'s insurance certificate ${urgency}. Request an updated certificate now to avoid a coverage gap.`;

  // NOTE: recipientEmail should come from the company's own notification
  // settings, not hardcoded — wire this to your companies table once you
  // add a notification_email column.
  await resend.emails.send({
    from: process.env.ALERT_FROM_EMAIL!,
    to: "compliance@example.com", // TODO: replace with company.notification_email
    subject,
    text: body,
  });
}
