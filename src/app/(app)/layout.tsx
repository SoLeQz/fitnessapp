import { BottomNav, SidebarNav } from "@/components/layout/app-nav";
import { RestTimerBar } from "@/components/workout/rest-timer-bar";
import { ResumeWorkoutBanner } from "@/components/workout/resume-banner";
import { requireUserPage } from "@/server/auth/guard";
import { getActiveWorkout } from "@/server/services/workout.service";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  const activeWorkout = await getActiveWorkout(user.id);

  return (
    <div className="flex min-h-dvh">
      <SidebarNav displayName={user.displayName} />

      {/* La marge basse réserve la place de la barre de navigation mobile. */}
      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-8 md:py-8">
          {activeWorkout ? <ResumeWorkoutBanner workoutName={activeWorkout.name} /> : null}
          {children}
        </div>
      </main>

      {/* Monté au niveau de la mise en page : le repos continue de tourner
          même en consultant l'historique d'un exercice. */}
      <RestTimerBar />
      <BottomNav />
    </div>
  );
}
