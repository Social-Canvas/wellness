"use client"

import { useState } from "react"

import {
  Badge,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"
import type { CourseWithPlanAccess } from "@/features/courses/types"

import { ArchiveCourseDialog } from "./ArchiveCourseDialog"
import { CourseCard } from "./CourseCard"
import { CourseStatusBadge } from "./CourseStatusBadge"
import { CreateCourseDialog } from "./CreateCourseDialog"
import { EditCourseDialog } from "./EditCourseDialog"

interface CoursesTableProps {
  courses: CourseWithPlanAccess[]
}

function CourseRowActions({
  course,
  onEdit,
  onArchive,
}: {
  course: CourseWithPlanAccess
  onEdit: (course: CourseWithPlanAccess) => void
  onArchive: (course: CourseWithPlanAccess) => void
}) {
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(course)}>
        Edit
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={course.status === "archived"}
        onClick={() => onArchive(course)}
      >
        Archive
      </Button>
    </>
  )
}

export function CoursesTable({ courses }: CoursesTableProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editCourse, setEditCourse] = useState<CourseWithPlanAccess | null>(null)
  const [archiveCourse, setArchiveCourse] = useState<CourseWithPlanAccess | null>(null)

  if (courses.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No courses yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Create your first course to get started.
          </p>
          <div className="mt-5">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create course
            </Button>
          </div>
        </div>

        <CreateCourseDialog open={createOpen} onOpenChange={setCreateOpen} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {courses.length} course{courses.length === 1 ? "" : "s"}
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create course
        </Button>
      </div>

      <Card className="mt-4 hidden lg:block">
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Certificate</TableHead>
                <TableHead>Completion %</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{course.title}</p>
                      <p className="text-sm text-ink-soft">{course.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <CourseStatusBadge course={course} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={course.certificate_enabled ? "plan" : "outline"}>
                      {course.certificate_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell>{course.completion_threshold}%</TableCell>
                  <TableCell>{course.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <CourseRowActions
                        course={course}
                        onEdit={setEditCourse}
                        onArchive={setArchiveCourse}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 lg:hidden">
        {courses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            actions={
              <CourseRowActions
                course={course}
                onEdit={setEditCourse}
                onArchive={setArchiveCourse}
              />
            }
          />
        ))}
      </div>

      <CreateCourseDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditCourseDialog
        course={editCourse}
        open={Boolean(editCourse)}
        onOpenChange={(open) => {
          if (!open) {
            setEditCourse(null)
          }
        }}
      />
      <ArchiveCourseDialog
        course={archiveCourse}
        open={Boolean(archiveCourse)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveCourse(null)
          }
        }}
      />
    </>
  )
}
