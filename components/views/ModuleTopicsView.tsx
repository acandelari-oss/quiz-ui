import { resolveCategoryPriorities } from "../../utils/categoryIdentity"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { studyActivityLabel } from "../../utils/studyModeGate"
import TopicsView from "./TopicsView"
import { groupTopicsByDocument, documentAggregate, groupTopicsByModule } from "../../utils/topicModules"
import CategoryOrganizationReview from "../CategoryOrganizationReview"
import SourceMaterialReview from "../SourceMaterialReview"
import UploadAcquisitionResults from "../ui/UploadAcquisitionResults"

import DocumentTaxonomyControls from "../DocumentTaxonomyControls"
import { useTaxonomyDocuments } from "../useTaxonomyDocuments"

export default function ModuleTopicsView({ studyModules = [], projectName, onBeginModuleStudy, uploadWorkflowActive, acquisition, ...topicProps }: any) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<{ id: string; text: string } | null>(null)
  const fileState = useTaxonomyDocuments(topicProps.projectId, topicProps.loadTopics)
  const groups = useMemo(() => groupTopicsByModule(topicProps.topics, studyModules, projectName, topicProps.projectStudyMode), [topicProps.topics, studyModules, projectName, topicProps.projectStudyMode])

  async function approve(id: string) {
    if (busy !== null) return
    setBusy(id)
    setError(null)
    try { await onBeginModuleStudy(id) }
    catch (error) { setError({ id, text: error instanceof Error ? error.message : t("moduleTopics.error") }) }
    finally { setBusy(null) }
  }

  if (!groups.length) return <p>{t(topicProps.loadingTopics ? "stats.Loading topics..." : "stats.No topics detected yet")}</p>

  return <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
    {resolveCategoryPriorities(topicProps.priorityCategories || [], topicProps.topics || []).length < (topicProps.priorityCategories || []).length && <p role="status">{t("documentTaxonomy.priorityReview")}</p>}
    {fileState.error && <p role="alert">{t("documentTaxonomy.loadError")}</p>}
    {groups.map(group => {
      const files = groupTopicsByDocument(group.topics, fileState.documents, group.id)
      const aggregate = documentAggregate(files)
      const ready = aggregate ? aggregate === "ready" : group.ready
      const failed = aggregate ? aggregate === "failed" : group.failed
      const key = group.id || "legacy"
      const open = !collapsed[key]
      const status = group.accepted ? "study" : failed ? "failed" : ready ? "review" : "processing"
      return <section key={key} style={{ border: "1px solid #334155", borderRadius: 14, background: "#0b1220", minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: 16 }}>
          <button type="button" aria-expanded={open} aria-controls={`module-topics-${key}`} onClick={() => setCollapsed(previous => ({ ...previous, [key]: open }))} style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 220px", minWidth: 0, padding: 0, border: 0, background: "transparent", color: "#f8fafc", textAlign: "left", cursor: "pointer", fontSize: 21, fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <span aria-hidden="true">{open ? "▾" : "▸"}</span>
            <span style={{ overflowWrap: "anywhere" }}>{group.name || t("moduleTopics.module")}</span>
          </button>
          <span style={{ color: group.accepted ? "#4ade80" : "#fbbf24", fontSize: 12 }}>{t(`moduleTopics.${status}`)}</span>
          {!group.accepted && <button type="button" disabled={busy !== null || uploadWorkflowActive || !ready || !group.topics.length} onClick={() => void approve(group.id)} style={{ padding: "9px 12px", border: "1px solid #2fa4a9", background: "#15313a", color: "#dffeff", borderRadius: 8, whiteSpace: "normal", maxWidth: "100%", cursor: "pointer" }}>{t(busy === group.id ? "moduleTopics.approving" : "moduleTopics.enter")}</button>}
        </div>
        {error?.id === group.id && <p role="alert" style={{ padding: "0 16px", color: "#fca5a5" }}>{error.text}</p>}
        {open && <div id={`module-topics-${key}`} style={{ padding: "0 12px 12px", minWidth: 0 }}>
          {!group.accepted && <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 4px 12px" }}>{t("moduleTopics.approvalHelp")}</p>}
          {files.map(file => <section key={file.id || "legacy"}
            aria-labelledby={`document-title-${key}-${file.id || "legacy"}`}
            data-document-id={file.id || "legacy"}
            style={{ marginBottom: 12, border: "1px solid #475569", borderRadius: 12, background: "#111c2d", minWidth: 0, overflow: "hidden" }}>
          <header style={{ padding: "12px 14px", borderBottom: "1px solid #334155", background: "#162438", minWidth: 0 }}>
            <h3 id={`document-title-${key}-${file.id || "legacy"}`} style={{ margin: 0, color: "#e2e8f0", fontSize: 17, fontWeight: 700, lineHeight: 1.4, overflowWrap: "anywhere" }}>{file.id ? file.name : t("documentTaxonomy.legacyGroup")}</h3>
            {file.id && <DocumentTaxonomyControls document={file} projectId={topicProps.projectId} locked={group.accepted} onChanged={fileState.refresh} />}
          </header>
          <div style={{ padding: "10px clamp(6px, 2vw, 12px)", minWidth: 0 }}>
          {file.id && acquisition?.reports?.some((report: any) => report.document_id === file.id && report.module_id === group.id) && <UploadAcquisitionResults
            reports={acquisition.reports.filter((report: any) => report.document_id === file.id && report.module_id === group.id)}
            phase={file.status === "ready" || group.accepted ? "completed" : file.status === "failed" ? "failed" : acquisition.phase}
          />}
          <SourceMaterialReview projectId={topicProps.projectId} documentId={file.id} ready={file.status === "ready" || group.accepted} locked={group.accepted} />
          <CategoryOrganizationReview topics={file.topics} projectId={topicProps.projectId} loadTopics={topicProps.loadTopics} ready={file.status === "ready" || group.accepted || (file.status === null && group.ready)} />
          <TopicsView {...topicProps} documentName={file.id ? file.name : undefined} categoryIdentityTopics={topicProps.topics} setActiveView={(view: string) => {
            if (!group.accepted && studyActivityLabel(view)) {
              setError({ id: group.id, text: t("moduleTopics.approveFirst") })
              return
            }
            topicProps.setActiveView(view)
          }} topics={file.topics.filter((topic: any) => topic.system_category !== "to_organize")} projectStudyMode={group.accepted ? "learning" : "building"} topicsOpen={true} setTopicsOpen={() => setCollapsed(previous => ({ ...previous, [key]: true }))} />
          </div>
          </section>)}
        </div>}
      </section>
    })}
  </div>
}
