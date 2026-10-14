import Link from "next/link";
export default async function ProtectedAreaPage({ params }: { params: Promise<{ protectedPath: string[] }> }) {
  const { protectedPath } = await params;
  const role = protectedPath[0];
  if (!["admin", "teacher", "student"].includes(role)) return <section className="container-shell py-16"><h1 className="section-title">Page not found</h1><p className="muted mt-3">This page does not exist.</p></section>;
  const labels: Record<string,string> = { admin: "Administrator", teacher: "Teacher", student: "Student" };
  return <section className="container-shell min-h-[55vh] py-14 md:py-20"><div className="card mx-auto max-w-2xl p-7 md:p-10"><p className="text-sm font-bold uppercase tracking-[.16em] text-[var(--brand)]">Protected area</p><h1 className="mt-3 text-3xl font-black">{labels[role]} portal</h1><p className="muted mt-4 leading-7">This area is not available until backend authentication, server-side role authorization, and secure sessions are deployed. No role is assumed from a URL or browser state. Access is denied by default.</p><Link href="/login" className="btn btn-primary mt-6">Go to sign in</Link></div></section>;
}
