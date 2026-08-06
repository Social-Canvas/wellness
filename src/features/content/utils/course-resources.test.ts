import assert from "node:assert/strict"
import { test } from "node:test"

import {
  COURSE_RESOURCES_BUCKET,
  COURSE_RESOURCE_DOWNLOAD_URL_EXPIRES_SECONDS,
  decideCourseResourceDownloadAccess,
} from "./course-resources.ts"

test("allows entitled authenticated users", () => {
  assert.deepEqual(
    decideCourseResourceDownloadAccess({
      isAuthenticated: true,
      canAccessCourse: true,
    }),
    { allowed: true }
  )
})

test("rejects unauthenticated users", () => {
  assert.deepEqual(
    decideCourseResourceDownloadAccess({
      isAuthenticated: false,
      canAccessCourse: true,
    }),
    { allowed: false, reason: "unauthenticated" }
  )
})

test("rejects users without course entitlement", () => {
  assert.deepEqual(
    decideCourseResourceDownloadAccess({
      isAuthenticated: true,
      canAccessCourse: false,
    }),
    { allowed: false, reason: "not_entitled" }
  )
})

test("rejects client-supplied storage paths", () => {
  assert.deepEqual(
    decideCourseResourceDownloadAccess({
      isAuthenticated: true,
      canAccessCourse: true,
      requestedStoragePath: "evil/path.pdf",
    }),
    { allowed: false, reason: "arbitrary_path_rejected" }
  )
  assert.deepEqual(
    decideCourseResourceDownloadAccess({
      isAuthenticated: true,
      canAccessCourse: true,
      requestedStorageBucket: "course-resources",
    }),
    { allowed: false, reason: "arbitrary_path_rejected" }
  )
})

test("uses private bucket and short TTL", () => {
  assert.equal(COURSE_RESOURCES_BUCKET, "course-resources")
  assert.equal(COURSE_RESOURCE_DOWNLOAD_URL_EXPIRES_SECONDS, 900)
})
