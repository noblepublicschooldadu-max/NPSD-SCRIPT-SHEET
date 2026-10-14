import type { Metadata } from "next";
import { StudentPortal } from "@/components/student/student-portal";

export const metadata: Metadata = { title: "Student portal" };

export default async function StudentPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section = [] } = await params;
  return <StudentPortal sectionPath={section} />;
}
