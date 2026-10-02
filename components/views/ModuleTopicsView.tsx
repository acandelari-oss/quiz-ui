import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { studyActivityLabel } from "../../utils/studyModeGate"
import TopicsView from "./TopicsView"
import { groupTopicsByModule } from "../../utils/topicModules"

export default function ModuleTopicsView({ studyModules = [], projectName, onBeginModuleStudy, uploadWorkflowActive, ...topicProps }: any) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<{ id: string; text: string } | null>(null)
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
    {groups.map(group => {
      const key = group.id || "legacy"
      const open = !collapsed[key]
      const status = group.accepted ? "study" : group.failed ? "failed" : group.ready ? "review" : "processing"
      return <section key={key} style={{ border: "1px solid #334155", borderRadius: 14, background: "#0b1220", minWidth: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: 16 }}>
          <button type="button" aria-expanded={open} aria-controls={`module-topics-${key}`} onClick={() => setCollapsed(previous => ({ ...previous, [key]: open }))} style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 220px", minWidth: 0, padding: 0, border: 0, background: "transparent", color: "#f8fafc", textAlign: "left", cursor: "pointer", fontSize: 21, fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <span aria-hidden="true">{open ? "▾" : "▸"}</span>
            <span style={{ overflowWrap: "anywhere" }}>{group.name || t("moduleTopics.module")}</span>
          </button>
          <span style={{ color: group.accepted ? "#4ade80" : "#fbbf24", fontSize: 12 }}>{t(`moduleTopics.${status}`)}</span>
          {!group.accepted && <button type="button" disabled={busy !== null || uploadWorkflowActive || !group.ready || !group.topics.length} onClick={() => void approve(group.id)} style={{ padding: "9px 12px", border: "1px solid #2fa4a9", background: "#15313a", color: "#dffeff", borderRadius: 8, whiteSpace: "normal", maxWidth: "100%", cursor: "pointer" }}>{t(busy === group.id ? "moduleTopics.approving" : "moduleTopics.enter")}</button>}
        </div>
        {error?.id === group.id && <p role="alert" style={{ padding: "0 16px", color: "#fca5a5" }}>{error.text}</p>}
        {open && <div id={`module-topics-${key}`} style={{ padding: "0 12px 12px", minWidth: 0 }}>
          {!group.accepted && <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 4px 12px" }}>{t("moduleTopics.approvalHelp")}</p>}
          <TopicsView {...topicProps} setActiveView={(view: string) => {
            if (!group.accepted && studyActivityLabel(view)) {
              setError({ id: group.id, text: t("moduleTopics.approveFirst") })
              return
            }
            topicProps.setActiveView(view)
          }} topics={group.topics} projectStudyMode={group.accepted ? "learning" : "building"} topicsOpen={true} setTopicsOpen={() => setCollapsed(previous => ({ ...previous, [key]: true }))} />
        </div>}
      </section>
    })}
  </div>
}
