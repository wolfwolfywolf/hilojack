import { redirect } from "next/navigation";

// Old week links now open the schedule on that week.
export default async function WeekPage({ params }: { params: Promise<{ n: string }> }) {
  const n = Number((await params).n);
  redirect(Number.isInteger(n) ? `/schedule?week=${n}` : "/schedule");
}
