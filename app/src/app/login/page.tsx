import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE, AUTH_MAX_AGE, expectedToken, safeNext, verifyCredentials } from "@/lib/auth";

// The one route the proxy lets through unauthenticated. Styled to match the landing page so the
// gate reads as part of the product rather than a bare browser prompt.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const failed = sp.error === "1";

  async function login(formData: FormData) {
    "use server";
    const dest = safeNext(String(formData.get("next") ?? "/"));
    const ok = await verifyCredentials(
      String(formData.get("username") ?? ""),
      String(formData.get("password") ?? "")
    );
    if (!ok) redirect(`/login?error=1&next=${encodeURIComponent(dest)}`);

    (await cookies()).set(AUTH_COOKIE, await expectedToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_MAX_AGE,
    });
    redirect(dest);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{ background: "#faf6ef", color: "#243b34" }}
    >
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2 mb-7 justify-center">
          <span
            className="grid place-items-center w-9 h-9 rounded-lg text-white font-bold"
            style={{ background: "#1c7b8c" }}
          >
            ◎
          </span>
          <span className="font-bold text-2xl tracking-tight" style={{ color: "#14303a" }}>
            BrioCare
          </span>
        </div>

        <div
          className="rounded-2xl p-7"
          style={{ background: "#fff", border: "1px solid #ece3d6" }}
        >
          <h1 className="text-xl font-bold tracking-tight mb-1" style={{ color: "#14303a" }}>
            Private preview
          </h1>
          <p className="text-[13.5px] leading-relaxed text-[#6b7d77] mb-6">
            This build runs on synthetic data only — no real patient information. Sign in to
            continue.
          </p>

          <form action={login} className="flex flex-col gap-3">
            <input type="hidden" name="next" value={next} />
            <label className="text-[12px] font-bold uppercase tracking-wider text-[#8a9a95]">
              Username
              <input
                name="username"
                autoComplete="username"
                autoFocus
                required
                className="mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-[15px] font-normal normal-case tracking-normal text-[#243b34]"
                style={{ border: "1.5px solid #dfd6c8", background: "#fdfbf7" }}
              />
            </label>
            <label className="text-[12px] font-bold uppercase tracking-wider text-[#8a9a95]">
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-[15px] font-normal normal-case tracking-normal text-[#243b34]"
                style={{ border: "1.5px solid #dfd6c8", background: "#fdfbf7" }}
              />
            </label>

            {failed && (
              <p
                className="text-[13px] rounded-xl px-3.5 py-2.5"
                style={{ background: "#fbeef1", color: "#b8556a", border: "1px solid #f0d3da" }}
              >
                That username or password isn&apos;t right.
              </p>
            )}

            <button
              type="submit"
              className="mt-2 rounded-xl px-5 py-3 font-bold text-white text-[15px]"
              style={{ background: "#ef7d5a" }}
            >
              Sign in
            </button>
          </form>
        </div>

        <p className="text-[12px] text-center text-[#9aa8a3] mt-5">
          Access is shared for this review. Per-user accounts and roles are Phase&nbsp;2.
        </p>
      </div>
    </div>
  );
}
