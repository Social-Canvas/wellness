import { z } from "zod"

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

export const emailField = z
  .email("Enter a valid email address")
  .max(255, "Email is too long")

export const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, "Password is too long")

export const fullNameField = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(120, "Name is too long")

export const phoneField = z
  .string()
  .trim()
  .max(30, "Phone number is too long")

export const avatarUrlField = z
  .url("Enter a valid URL")
  .max(2048, "URL is too long")
