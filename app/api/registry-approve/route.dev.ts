import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { ApprovalFile } from "@/lib/schemas/candidate";

/**
 * Records review decisions to `data/registry/approvals.json`. Development only.
 *
 * Gated twice, independently, because the `app/(dev)/` route group is **not** excluded from
 * production builds — `/tokens` deploys today, which is exactly the kind of assumption worth
 * not making a second time. A deployed write endpoint on a site with no auth and no database
 * would be the single worst thing in this repository.
 *
 * It writes the *decisions*, never the registry. `scripts/registry-approve.ts` is the only
 * thing that touches `models.json`, so no request can change what the site claims.
 */

export const dynamic = "force-dynamic";

function devOnly(): void {
  if (process.env.NODE_ENV === "production") notFound();
  if (process.env.LLM_ATLAS_REVIEW !== "1") notFound();
}

export async function POST(request: Request): Promise<Response> {
  devOnly();

  const body: unknown = await request.json();
  const parsed = ApprovalFile.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "not a valid approval payload", detail: parsed.error.message },
      { status: 400 },
    );
  }

  const path = join("data", "registry", "approvals.json");
  writeFileSync(path, `${JSON.stringify(parsed.data, null, 2)}\n`, "utf8");

  return Response.json({
    written: path,
    approved: parsed.data.approved.length,
    rejected: parsed.data.rejected.length,
  });
}
