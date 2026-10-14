export function getAppsScriptApiUrl():string|undefined{const value=process.env.GOOGLE_APPS_SCRIPT_API_URL?.trim();return value||undefined}
