import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/guard";
import { handleRouteError } from "@/server/http";
import { getDashboardSummary, getGeneralStats } from "@/server/services/analytics.service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    // `?scope=dashboard` renvoie le résumé d'accueil ; sinon les statistiques
    // générales, plus coûteuses à calculer.
    const scope = new URL(request.url).searchParams.get("scope");
    return scope === "dashboard"
      ? NextResponse.json({ summary: await getDashboardSummary(user.id) })
      : NextResponse.json({ stats: await getGeneralStats(user.id) });
  } catch (error) {
    return handleRouteError(error);
  }
}
