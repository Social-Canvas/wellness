import { SiteContentEditor } from "@/features/site-content/components/site-content-editor"
import { SITE_CONTENT_FIELDS } from "@/features/site-content/registry"
import { loadSiteContent } from "@/features/site-content/services/site-content.service"
import { readSiteAlt, readSiteText } from "@/features/site-content/resolve"

export const metadata = {
  title: "Content",
  robots: { index: false, follow: false },
}

export default async function AdminContentPage() {
  const content = await loadSiteContent()
  const fields = SITE_CONTENT_FIELDS.map((field) => ({
    key: field.key,
    group: field.group,
    label: field.label,
    help: field.help,
    type: field.type,
    value: readSiteText(content, field.key, field.defaultValue),
    altText: field.type === "image" ? readSiteAlt(content, field.key) : "",
  }))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-[28px] font-medium text-ink">Content</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Edit the public site without a code change. Saving updates the live pages.
        </p>
      </div>
      <SiteContentEditor fields={fields} />
    </div>
  )
}
