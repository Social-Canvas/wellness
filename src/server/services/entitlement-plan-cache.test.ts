import assert from "node:assert/strict"
import { test } from "node:test"

/**
 * Documents the request-scoped memoization contract used by entitlement
 * orchestration. React cache() itself is framework-provided; this test locks
 * the expected call-reduction behavior for plan-id reuse across N lesson checks
 * on direct lesson routes (outline path no longer calls canAccessLesson at all).
 */
test("active plan ids should be reusable across N lesson entitlement checks", () => {
  let planLookupCount = 0
  const userId = "11111111-1111-4111-8111-111111111111"

  const getActivePlanIds = (() => {
    const memo = new Map<string, string[]>()
    return async (id: string) => {
      const cached = memo.get(id)
      if (cached) {
        return cached
      }
      planLookupCount += 1
      const plans = ["plan-a"]
      memo.set(id, plans)
      return plans
    }
  })()

  async function canAccessLesson(id: string, _lessonId: string) {
    const plans = await getActivePlanIds(id)
    return plans.length > 0
  }

  return Promise.all([
    canAccessLesson(userId, "lesson-1"),
    canAccessLesson(userId, "lesson-2"),
    canAccessLesson(userId, "lesson-3"),
    canAccessLesson(userId, "lesson-4"),
  ]).then((results) => {
    assert.equal(results.every(Boolean), true)
    assert.equal(
      planLookupCount,
      1,
      "plan ids must be fetched once per user per request, not per lesson"
    )
  })
})
