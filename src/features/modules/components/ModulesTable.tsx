"use client"

import { useState } from "react"

import {
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
import type { Module } from "@/features/modules/types"

import { ArchiveModuleDialog } from "./ArchiveModuleDialog"
import { CreateModuleDialog } from "./CreateModuleDialog"
import { EditModuleDialog } from "./EditModuleDialog"
import { ModuleCard } from "./ModuleCard"
import { ModuleStatusBadge } from "./ModuleStatusBadge"

interface ModulesTableProps {
  courseId: string
  modules: Module[]
}

function ModuleRowActions({
  module,
  onEdit,
  onArchive,
}: {
  module: Module
  onEdit: (module: Module) => void
  onArchive: (module: Module) => void
}) {
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => onEdit(module)}>
        Edit
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={module.status === "archived"}
        onClick={() => onArchive(module)}
      >
        Archive
      </Button>
    </>
  )
}

export function ModulesTable({ courseId, modules }: ModulesTableProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editModule, setEditModule] = useState<Module | null>(null)
  const [archiveModule, setArchiveModule] = useState<Module | null>(null)

  if (modules.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
          <p className="font-display text-lg font-medium text-ink">No modules yet</p>
          <p className="mt-2 text-sm text-ink-soft">
            Create your first module for this course.
          </p>
          <div className="mt-5">
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create module
            </Button>
          </div>
        </div>

        <CreateModuleDialog
          courseId={courseId}
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
          {modules.length} module{modules.length === 1 ? "" : "s"}
        </p>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create module
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
                <TableHead>Sort Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((module) => (
                <TableRow key={module.id}>
                  <TableCell className="font-medium">{module.title}</TableCell>
                  <TableCell className="text-ink-soft">{module.slug}</TableCell>
                  <TableCell>
                    <ModuleStatusBadge module={module} />
                  </TableCell>
                  <TableCell>{module.sort_order}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <ModuleRowActions
                        module={module}
                        onEdit={setEditModule}
                        onArchive={setArchiveModule}
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
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            actions={
              <ModuleRowActions
                module={module}
                onEdit={setEditModule}
                onArchive={setArchiveModule}
              />
            }
          />
        ))}
      </div>

      <CreateModuleDialog
        courseId={courseId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <EditModuleDialog
        courseId={courseId}
        module={editModule}
        open={Boolean(editModule)}
        onOpenChange={(open) => {
          if (!open) {
            setEditModule(null)
          }
        }}
      />
      <ArchiveModuleDialog
        courseId={courseId}
        module={archiveModule}
        open={Boolean(archiveModule)}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveModule(null)
          }
        }}
      />
    </>
  )
}
