import type { AdminApiEnvelope } from "./contracts";
export class AdminApiError extends Error { constructor(message:string,readonly status:number,readonly code:string){super(message);this.name="AdminApiError";} }
/** Same-origin cookie session boundary; never stores bearer tokens in browser storage. */
export async function adminRequest<T>(operation:string,init?:RequestInit):Promise<T>{
 const [path, rawQuery] = operation.split("?", 2);
 const safe=path.split("/").filter(Boolean).map(encodeURIComponent).join("/");
 const query = rawQuery ? `?${new URLSearchParams(rawQuery).toString()}` : "";
 const response=await fetch(`/api/admin/${safe}${query}`,{...init,credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json",...(init?.body?{"Content-Type":"application/json"}:{}),...init?.headers}});
 let envelope:AdminApiEnvelope<T>;try{envelope=await response.json() as AdminApiEnvelope<T>}catch{throw new AdminApiError("The school service returned an unreadable response.",response.status,"INVALID_RESPONSE")}
 if(!response.ok||!envelope.ok){const e="error" in envelope?envelope.error:{code:"UNAVAILABLE",message:"The school service is unavailable."};throw new AdminApiError(e.message,response.status,e.code)}return envelope.data;
}
