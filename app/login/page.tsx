import { LoginForm } from "@/components/LoginForm";
import { one, type SearchParams } from "@/components/Flash";

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return <LoginForm role="viewer" title="Kirkbrae Hi Lo Jack League" next={one(sp.next)} err={one(sp.err)} />;
}
