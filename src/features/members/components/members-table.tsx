"use client"

import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui"
import type { MemberListItem } from "@/features/members/types"

import { MemberRoleBadge } from "./member-role-badge"
import { MemberRoleSelect } from "./member-role-select"

type MembersTableProps = {
  members: MemberListItem[]
  canManageRoles: boolean
  currentProfileId: string
}

function formatMemberDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function formatMemberName(member: MemberListItem): string {
  return member.fullName?.trim() || "—"
}

export function MembersTable({
  members,
  canManageRoles,
  currentProfileId,
}: MembersTableProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-cream2/50 px-6 py-10 text-center">
        <p className="font-display text-lg font-medium text-ink">No members yet</p>
        <p className="mt-2 text-sm text-ink-soft">
          Member accounts will appear here after signup.
        </p>
      </div>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium text-ink">
                  {formatMemberName(member)}
                </TableCell>
                <TableCell className="text-ink-soft">{member.email}</TableCell>
                <TableCell>
                  {canManageRoles ? (
                    <MemberRoleSelect
                      member={member}
                      currentProfileId={currentProfileId}
                    />
                  ) : (
                    <MemberRoleBadge role={member.role} />
                  )}
                </TableCell>
                <TableCell className="text-ink-soft">
                  {formatMemberDate(member.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
