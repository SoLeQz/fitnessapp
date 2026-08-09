import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActiveWorkout } from "@/components/workout/active-workout";
import { requireUserPage } from "@/server/auth/guard";
import { getActiveWorkout } from "@/server/services/workout.service";

export const metadata: Metadata = { title: "Séance en cours" };

export default async function ActiveWorkoutPage() {
  const user = await requireUserPage();
  const workout = await getActiveWorkout(user.id);

  // Sans séance en cours, il n'y a rien à afficher : on renvoie vers l'accueil
  // d'où l'on démarre une séance.
  if (!workout) redirect("/");

  return <ActiveWorkout initialWorkout={workout} defaultRestSeconds={user.defaultRestSeconds} />;
}
