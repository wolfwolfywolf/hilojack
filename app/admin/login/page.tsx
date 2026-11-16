import { LoginForm } from "@/components/LoginForm";
import { one, type SearchParams } from "@/components/Flash";
import { passwordConfigured } from "@/lib/auth";

export default async function AdminLoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const missing = [
    !passwordConfigured("admin") && "ADMIN_PASSWORD",
    !passwordConfigured("viewer") && "SITE_PASSWORD",
    !process.env.AUTH_SECRET && "AUTH_SECRET",
  ].filter(Boolean) as string[];
  const setupWarning = missing.length
    ? `This deployment can't see ${missing.join(", ")}. In Vercel, add ${missing.length > 1 ? "them" : "it"} under Settings → Environment Variables with Production ticked, then redeploy.`
    : undefined;
  return (
    <LoginForm
      role="admin"
      title="League manager sign in"
      next={one(sp.next)}
      err={one(sp.err)}
      warning={setupWarning}
    />
  );
}
