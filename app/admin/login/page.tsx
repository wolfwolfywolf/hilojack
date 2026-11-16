import { LoginForm } from "@/components/LoginForm";
import { one, type SearchParams } from "@/components/Flash";

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return <LoginForm role="admin" title="League manager sign in" next={one(sp.next)} err={one(sp.err)} />;
}
