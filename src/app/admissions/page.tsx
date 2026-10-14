import type { Metadata } from "next";
import { AdmissionsPageContent } from "@/components/admissions/admissions-page-content";
export const metadata: Metadata = { title: "Admissions", description: "Admission information and online application for Noble Public School Dadu." };
export default function AdmissionsPage() { return <AdmissionsPageContent/>; }
