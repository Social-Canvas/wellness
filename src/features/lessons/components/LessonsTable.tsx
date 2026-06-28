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
import type { Lesson } from "@/features/lessons/types"

import { ArchiveLessonDialog } from "./ArchiveLessonDialog"
import { CreateLessonDialog } from "./CreateLessonDialog"
import { EditLessonDialog } from "./EditLessonDialog"
import { LessonCard } from "./LessonCard"
import { LessonStatusBadge, LessonVideoLabel } from "./LessonStatusBadge"
import type { LessonVideoOption } from "./lesson-video-utils"

interface LessonsTableProps {
  courseId: string
  moduleId: string
  lessons: Lesson[]
  videos: LessonVideoOption[]
}

function LessonRowActions({
  lesson,
  onEdit,
  onArchive,
}: {
  lesson: Lesson
  onEdit: (lesson: Lesson) => void
  onArchive: (lesson: Lesson) => void
}) {
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(lesson)}>
        Edit
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={lesson.status === "archived"}
        onClick={() => onArchive(lesson)}
      >
        Archive
      </Button>
    </>
  )
}

export function LessonsTable({ courseId, moduleId, lessons, videos }: LessonsTableProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editLesson, setEditLesson] = useState<Lesson | null>(null)
  const [archiveLesson, setArchiveLesson] = useState<Lesson | null>(null)

  if (lessons.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No lessons yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Create your first lesson for this module.
          </p>
          <div className="mt-5">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create lesson
            </Button>
          </div>
        </div>

        <CreateLessonDialog
          courseId={courseId}
          moduleId={moduleId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-soft">
          {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create lesson
        </Button>
      </div>

      <Card className="mt-4 hidden lg:block">
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Video</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lessons.map((lesson) => (
                <TableRow key={lesson.id}>
                  <TableCell className="font-medium">{lesson.title}</TableCell>
                  <TableCell className="text-ink-soft">{lesson.slug}</TableCell>
                  <TableCell>
                    <LessonStatusBadge lesson={lesson} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={lesson.is_required ? "plan" : "outline"}>
                      {lesson.is_required ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                  <TableCell>{lesson.sort_order}</TableCell>
                  <TableCell>
                    <LessonVideoLabel videoId={lesson.video_id} videos={videos} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <LessonRowActions
                        lesson={lesson}
                        onEdit={setEditLesson}
                        onArchive={setArchiveLesson}
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
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            videos={videos}
            actions={
              <LessonRowActions
                lesson={lesson}
                onEdit={setEditLesson}
                onArchive={setArchiveLesson}
              />
            }
          />
        ))}
      </div>

      <CreateLessonDialog
        courseId={courseId}
        moduleId={moduleId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <EditLessonDialog
        courseId={courseId}
        moduleId={moduleId}
        lesson={editLesson}
        videos={videos}
        open={Boolean(editLesson)}
        onOpenChange={(open) => {
          if (!open) {
            setEditLesson(null)
          }
        }}
      />
      <ArchiveLessonDialog
        courseId={courseId}
        moduleId={moduleId}
        lesson={archiveLesson}
        open={Boolean(archiveLesson)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveLesson(null)
          }
        }}
      />
    </>
  )
}
