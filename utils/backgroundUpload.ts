// Uploads own their progress screen, never an activity the student opened meanwhile.
export function isUploadView(view: string) {
  return ["project", "load_project", "create_project", "upload_error"].includes(view)
}

export function shouldPresentUploadResult(canContinue: boolean, currentView: string) {
  return !canContinue || isUploadView(currentView)
}

export function uploadStatusForWorkspace(status: string, canContinue: boolean, currentView: string) {
  if (canContinue && !isUploadView(currentView) && [
    "Processing topics...", "Project upload completed", "Upload failed",
    "Upload interrupted", "Topic generation timeout"
  ].includes(status)) return ""
  return status
}
