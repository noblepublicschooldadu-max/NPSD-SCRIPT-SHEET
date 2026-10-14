import { isValidEmail } from "./common";

export type RegistrationInput = {
  studentName: string;
  grNumber?: string;
  classLevel: string;
  section?: string;
  guardianName: string;
  guardianContact: string;
  guardianEmail?: string;
};

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const clean = (value: string, max: number) => value.normalize("NFKC").replace(/[<>\u0000-\u001F\u007F]/g, "").trim().replace(/\s+/g, " ").slice(0, max);

export function validateLogin(input: { identifier: string; password: string }): ValidationResult<{ identifier: string; password: string }> {
  const identifier = clean(input.identifier, 120);
  const password = input.password;
  const errors: Record<string, string> = {};
  if (!identifier || identifier.length < 3) errors.identifier = "Enter your school-issued email or username.";
  if (!password || password.length < 8 || password.length > 128) errors.password = "Password must be between 8 and 128 characters.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { identifier, password } };
}

export function validateRegistration(input: RegistrationInput): ValidationResult<RegistrationInput> {
  const value: RegistrationInput = {
    studentName: clean(input.studentName ?? "", 100),
    grNumber: clean(input.grNumber ?? "", 40),
    classLevel: clean(input.classLevel ?? "", 2),
    section: clean(input.section ?? "", 20),
    guardianName: clean(input.guardianName ?? "", 100),
    guardianContact: clean(input.guardianContact ?? "", 30),
    guardianEmail: clean(input.guardianEmail ?? "", 254).toLowerCase(),
  };
  const errors: Record<string, string> = {};
  if (value.studentName.length < 2) errors.studentName = "Enter the student's full name.";
  if (!/^(1|2|3|4|5|6|7|8)$/.test(value.classLevel)) errors.classLevel = "Choose a class from 1 to 8.";
  if (value.guardianName.length < 2) errors.guardianName = "Enter a parent or guardian name.";
  if (!/^[+\d][\d\s()-]{6,28}$/.test(value.guardianContact)) errors.guardianContact = "Enter a valid guardian contact number.";
  if (value.guardianEmail && !isValidEmail(value.guardianEmail)) errors.guardianEmail = "Enter a valid email address or leave it blank.";
  if (value.grNumber && !/^[\p{L}\p{N}./_-]{1,40}$/u.test(value.grNumber)) errors.grNumber = "Use only letters, numbers, dots, slashes, underscores or hyphens.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function validateRecovery(identifier: string): ValidationResult<{ identifier: string }> {
  const normalized = clean(identifier, 120);
  const errors: Record<string, string> = {};
  if (normalized.length < 3) errors.identifier = "Enter your school-issued email or username.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { identifier: normalized } };
}
