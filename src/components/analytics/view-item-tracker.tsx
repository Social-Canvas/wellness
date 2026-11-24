"use client"

import { useEffect } from "react"

import { trackViewItem } from "@/lib/analytics/client"

type ViewItemTrackerProps = {
  itemId: string
  itemName: string
}

export function ViewItemTracker({ itemId, itemName }: ViewItemTrackerProps) {
  useEffect(() => {
    trackViewItem({ itemId, itemName })
  }, [itemId, itemName])

  return null
}
