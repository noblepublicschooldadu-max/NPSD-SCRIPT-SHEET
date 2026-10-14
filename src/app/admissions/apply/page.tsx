import type { Metadata } from "next";
import { AdmissionApplicationForm } from "@/components/admissions/application-form";
export const metadata: Metadata = { title: "Apply for admission" };
export default function AdmissionApplyPage() { return <section className="container-shell min-h-[55vh] py-10 md:py-16"><AdmissionApplicationForm/></section>; }
