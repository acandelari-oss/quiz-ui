import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { fetchPlannerWeek } from "../../../services/plannerApi"
import { adaptPlannerStateToUi } from "./plannerWeekAdapter"
import type { PlannerMockData, PlannerUiState } from "./PlannerTypes"

export function usePlannerState(projectId: string) {
  const { t: translate } = useTranslation()
  const [plannerState, setPlannerState] = useState<PlannerUiState>("ACTIVE_WEEK")
  const [plannerData, setPlannerData] = useState<PlannerMockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPlannerWeek = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (!projectId) {
        setPlannerData(null)
        setError(translate("stats.Create or load a project before using Study Planner."))
        return
      }

      const plannerStateResponse = await fetchPlannerWeek(projectId)
      const adaptedPlannerData = adaptPlannerStateToUi(plannerStateResponse)

      setPlannerData(adaptedPlannerData)
      setPlannerState(adaptedPlannerData.state)
    } catch (err) {
      console.error("PLANNER WEEK LOAD ERROR:", err)
      setError(
        err instanceof Error
          ? err.message
          : translate("stats.Unable to load Study Planner data.")
      )
    } finally {
      setLoading(false)
    }
  }, [projectId, translate])

  useEffect(() => {
    loadPlannerWeek()
  }, [loadPlannerWeek])

  return {
    plannerState,
    setPlannerState,
    plannerData,
    loading,
    error,
    reload: loadPlannerWeek
  }
}
