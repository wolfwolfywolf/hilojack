import { login } from "@/lib/actions";
import { Flash } from "./Flash";

export function LoginForm({
  role,
  title,
  next,
  err,
}: {
  role: "viewer" | "admin";
  title: string;
  next?: string;
  err?: string;
}) {
  return (
    <main className="login">
      <div className="card">
        <h1>{title}</h1>
        <Flash err={err} />
        <form action={login}>
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="next" value={next ?? ""} />
          <div className="field">
            <label htmlFor="password">{role === "admin" ? "Admin password" : "League password"}</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
          </div>
          <button type="submit" style={{ width: "100%" }}>Enter</button>
        </form>
      </div>
    </main>
  );
}
