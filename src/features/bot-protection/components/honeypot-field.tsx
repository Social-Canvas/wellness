import type { InputHTMLAttributes } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type HoneypotFieldProps = {
  id: string
  inputProps: InputHTMLAttributes<HTMLInputElement> & {
    name?: string
  }
}

/**
 * Visually hidden anti-spam field. Wrapped with aria-hidden so screen readers skip it.
 * Real humans should never fill this.
 */
export function HoneypotField({ id, inputProps }: HoneypotFieldProps) {
  return (
    <div className="sr-only" aria-hidden="true">
      <Label htmlFor={id}>Company website</Label>
      <Input
        id={id}
        tabIndex={-1}
        autoComplete="off"
        {...inputProps}
      />
    </div>
  )
}
