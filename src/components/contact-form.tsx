"use client";

import { useState, type FormEvent } from "react";
import { useLanguage } from "@/components/language-provider";

export function ContactForm() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "unavailable">("idle");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validEmail = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (name.trim().length < 2 || message.trim().length < 10 || !validEmail) {
      setStatus("error");
      return;
    }
    // No enquiry API is configured. Do not transmit or claim to save personal information.
    setStatus("unavailable");
  }

  const resetStatus = () => setStatus("idle");

  return (
    <form className="card enquiry-form" onSubmit={submit} noValidate>
      <div className="enquiry-form-heading"><h3>Send an enquiry</h3><p>Fields marked * are required.</p></div>
      <div>
        <label htmlFor="contact-name" className="field-label">{t.formName} <span aria-hidden="true">*</span></label>
        <input id="contact-name" className="field field-input" autoComplete="name" maxLength={120} value={name} onChange={event => { setName(event.target.value); resetStatus(); }} required aria-required="true" aria-invalid={status === "error" && name.trim().length < 2} />
      </div>
      <div>
        <label htmlFor="contact-email" className="field-label">{t.formEmail}</label>
        <input id="contact-email" type="email" className="field field-input" autoComplete="email" maxLength={254} value={email} onChange={event => { setEmail(event.target.value); resetStatus(); }} aria-invalid={status === "error" && !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)} />
      </div>
      <div>
        <label htmlFor="contact-message" className="field-label">{t.formMessage} <span aria-hidden="true">*</span></label>
        <textarea id="contact-message" className="field field-input min-h-32 resize-y" maxLength={2000} value={message} onChange={event => { setMessage(event.target.value); resetStatus(); }} required aria-required="true" aria-invalid={status === "error" && message.trim().length < 10} />
      </div>
      <button className="btn btn-primary enquiry-submit" type="submit">Check enquiry</button>
      <p className="form-privacy-note">Please do not include passwords, identity documents or other sensitive personal information. This form does not send or store your message.</p>
      <div role={status === "error" ? "alert" : "status"} aria-live="polite" className={status === "error" ? "form-feedback is-error" : status === "unavailable" ? "form-feedback is-unavailable" : "sr-only"}>
        {status === "error" ? t.formError : status === "unavailable" ? "Your message has not been sent or saved because online enquiries are not connected. Please use a school-verified contact channel once one is published." : ""}
      </div>
    </form>
  );
}
