import { processDomainDriftWarning, verifyQStashRequest } from "@/lib/drift-warning";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verified = await verifyQStashRequest(request, rawBody);

  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as { domainId?: unknown }).domainId !== "string" ||
    typeof (payload as { expectedWarningAt?: unknown }).expectedWarningAt !== "string" ||
    typeof (payload as { expectedActivityAt?: unknown }).expectedActivityAt !== "string"
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const result = await processDomainDriftWarning(payload as {
      domainId: string;
      expectedWarningAt: string;
      expectedActivityAt: string;
    });

    if (result.sent) {
      console.info("Drift warning email sent", {
        domainId: (payload as { domainId: string }).domainId,
      });
    } else {
      console.info("Drift warning callback completed without send", {
        domainId: (payload as { domainId: string }).domainId,
        reason: result.reason,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown callback error";

    console.error("Drift warning callback failed", {
      domainId: (payload as { domainId: string }).domainId,
      error: message,
    });

    return NextResponse.json(
      { error: "Drift warning callback failed", details: message },
      { status: 500 },
    );
  }
}
