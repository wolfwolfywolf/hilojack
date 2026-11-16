import { login } from "@/lib/actions";
import { Flash } from "./Flash";
import { PasswordInput } from "./PasswordInput";

export function LoginForm({
  role,
  title,
  next,
  err,
  warning,
}: {
  role: "viewer" | "admin";
  title: string;
  next?: string;
  err?: string;
  warning?: string;
}) {
  return (
    <main className="login">
      <div className="card">
        <h1>{title}</h1>
        {warning && <div className="flash err" role="alert">{warning}</div>}
        <Flash err={err} />
        <form action={login}>
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="next" value={next ?? ""} />
          <PasswordInput label={role === "admin" ? "Admin password" : "League password"} />
          <button type="submit" style={{ width: "100%" }}>Enter</button>
        </form>
      </div>
    </main>
  );
}
