import type { ReactNode } from "react";
import Link from "next/link";
export function AuthCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section className="container-shell py-12 md:py-20"><div className="mx-auto max-w-xl"><Link href="/" className="muted text-sm underline underline-offset-4">← Back to school website</Link><div className="card mt-5 p-6 md:p-9"><p className="text-sm font-bold uppercase tracking-[.16em] text-[var(--brand)]">Student & staff portal</p><h1 className="mt-3 text-3xl font-black tracking-tight">{title}</h1><p className="muted mt-3 leading-7">{description}</p><div className="mt-7">{children}</div></div></div></section>;
}
