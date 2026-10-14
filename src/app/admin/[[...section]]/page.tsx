import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/admin-console";
export const metadata:Metadata={title:"Admin dashboard"};
export default async function AdminPage({params}:{params:Promise<{section?:string[]}>}){const {section=[]}=await params;return <AdminConsole sectionPath={section}/>}
