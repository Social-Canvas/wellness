"use client"

import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"

type BackButtonProps = {
  fallbackHref: string
  label?: string
  className?: string
}

function BackButton({
  fallbackHref,
  label = "← Back",
  className,
}: BackButtonProps) {
  const router = useRouter()

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
      return
    }

    router.push(fallbackHref)
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        "inline-flex items-center gap-1 rounded-[30px] border border-line bg-surface px-3.5 py-[7px] font-body text-[13.5px] font-bold text-ink-soft transition-colors hover:border-blue hover:text-blue",
        className
      )}
    >
      {label}
    </button>
  )
}

export { BackButton, type BackButtonProps }
