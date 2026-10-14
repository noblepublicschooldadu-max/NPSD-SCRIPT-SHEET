 "use client";
import {createContext,useContext,useEffect,useState} from "react";
import {messages,type Locale} from "@/lib/i18n/messages";
type Messages=(typeof messages)[Locale];
type ContextValue={locale:Locale;setLocale:(locale:Locale)=>void;t:Messages};
const Context=createContext<ContextValue|null>(null);
export function LanguageProvider({children}:{children:React.ReactNode}){
 const [locale,setLocaleState]=useState<Locale>("en");
 useEffect(()=>{const saved=window.localStorage.getItem("npsd-locale");if(saved==="en"||saved==="ur"||saved==="sd")setLocaleState(saved)},[]);
 const setLocale=(next:Locale)=>{setLocaleState(next);window.localStorage.setItem("npsd-locale",next);document.documentElement.lang=next;document.documentElement.dir=messages[next].dir};
 useEffect(()=>{document.documentElement.lang=locale;document.documentElement.dir=messages[locale].dir},[locale]);
 return <Context.Provider value={{locale,setLocale,t:messages[locale]}}>{children}</Context.Provider>
}
export function useLanguage(){const value=useContext(Context);if(!value)throw new Error("useLanguage must be used within LanguageProvider");return value}
