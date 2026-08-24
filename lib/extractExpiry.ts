import {
  TextractClient,
  AnalyzeDocumentCommand,
} from "@aws-sdk/client-textract";

const textract = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Standard ACORD 25 certificates (the industry-standard COI form) label
// expiry dates like "POLICY EXP (MM/DD/YYYY)" next to each coverage line.
// We grab every date-shaped string near an "EXP" label and return the
// LATEST one — the certificate is only as good as its earliest-expiring
// line, but for v1 we surface all candidates and let the user confirm.
const DATE_PATTERN = /(\d{1,2}\/\d{1,2}\/\d{2,4})/g;

export async function extractExpiryDate(fileBuffer: Buffer): Promise<{
  candidateDates: string[];
  rawText: string;
}> {
  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: fileBuffer },
    FeatureTypes: ["FORMS"],
  });

  const result = await textract.send(command);

  const lines: string[] =
    result.Blocks?.filter((b) => b.BlockType === "LINE")
      .map((b) => b.Text || "")
      .filter(Boolean) || [];

  const rawText = lines.join("\n");

  // Look specifically at lines mentioning EXP/EXPIRATION to reduce false
  // positives from unrelated dates (policy effective dates, cert issue date)
  const expiryLines = lines.filter((l) => /EXP/i.test(l));
  const candidateDates = expiryLines
    .flatMap((l) => l.match(DATE_PATTERN) || [])
    .filter(Boolean);

  // Fallback: if no line matched "EXP" (unusual cert layout), scan everything
  if (candidateDates.length === 0) {
    candidateDates.push(...(rawText.match(DATE_PATTERN) || []));
  }

  return { candidateDates: [...new Set(candidateDates)], rawText };
}

// Picks the EARLIEST date from the candidates — that's the one that
// actually determines when the vendor becomes uninsured.
export function earliestDate(dates: string[]): Date | null {
  const parsed = dates
    .map((d) => new Date(d))
    .filter((d) => !isNaN(d.getTime()));
  if (parsed.length === 0) return null;
  return new Date(Math.min(...parsed.map((d) => d.getTime())));
}
