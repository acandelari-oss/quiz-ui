"use client"

import Sidebar from "@/components/Sidebar"
import ToolPanel from "@/components/ToolPanel"
import Workspace from "@/components/Workspace"

export default function Page() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">

      {/* Sidebar */}
      <Sidebar />

      {/* Tool Panel */}
      <ToolPanel />

      {/* Workspace */}
      <Workspace />

    </div>
  )
}