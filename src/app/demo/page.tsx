import DemoLoginClient from "./demo-client";

function sanitizeRedirect(value: unknown) {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  // Prevent protocol-relative redirects.
  if (value.startsWith("//")) return "/dashboard";
  return value;
}

export default async function DemoLoginPage({
  searchParams,
}: {
  searchParams:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const sp = await Promise.resolve(searchParams);
  const raw = sp.redirect;
  const redirect = sanitizeRedirect(Array.isArray(raw) ? raw[0] : raw);
  return <DemoLoginClient redirect={redirect} />;
}

