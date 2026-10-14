import type { Metadata } from "next";
import { TeacherPortal } from "@/components/teacher/teacher-portal";
export const metadata: Metadata = { title: "Teacher portal" };
export default async function TeacherPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  return <TeacherPortal sectionPath={section} />;
}
