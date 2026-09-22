import React from "react"
import {
  getTopicDisplayName,
  getTopicModuleLabel,
  getTopicScopeKey,
  TopicScopeItem
} from "../utils/topics"

type SelectedTopic = string | TopicScopeItem

type SelectedTopicsBannerProps = {
  selectedTopics?: SelectedTopic[] | null
  setSelectedTopics: (topics: SelectedTopic[]) => void
  setSelectedTopic: (topic: SelectedTopic | null) => void
}

export default function SelectedTopicsBanner({
  selectedTopics,
  setSelectedTopics,
  setSelectedTopic
}: SelectedTopicsBannerProps) {

  if (!selectedTopics || selectedTopics.length === 0) {
    return null
  }

  return (
    <div style={{
      marginBottom: 12,
      padding: "8px 10px",
      background: "rgba(34, 197, 94, 0.1)",
      border: "1px solid #22c55e",
      borderRadius: 6,
      fontSize: 13,
      color: "#e5e7eb"
    }}>

      <b>Selected topics:</b>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 10
        }}>

        {selectedTopics.map((t: SelectedTopic, i: number) => {

            const label = getTopicDisplayName(t)
            const moduleLabel = getTopicModuleLabel(t)
            const chipKey = `${getTopicScopeKey(t)}:${i}`

            return (

            <div
                key={chipKey}
                style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                
                paddingBottom: 2,
                fontSize: 12,
                color: "#22c55e"
                }}
            >

                <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>{label}</span>
                  {moduleLabel && (
                    <span style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      fontWeight: 500
                    }}>
                      {moduleLabel}
                    </span>
                  )}
                </span>

                <span
                onClick={() => {

                    setSelectedTopics(
                    selectedTopics.filter((_, index: number) => index !== i)
                    )

                }}
                style={{
                    cursor: "pointer",
                    fontWeight: 700
                }}
                >
                ✕
                </span>

            </div>

            )

        })}

        </div>

      <button
        onClick={() => {
          setSelectedTopics([])
          setSelectedTopic(null)
        }}
        style={{
          marginTop: 10,
          padding: "6px 10px",
          background: "transparent",
          border: "1px solid #22c55e",
          borderRadius: 6,
          color: "#22c55e",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 600,
          alignSelf: "flex-start"
        }}
      >
        ✏ Clear all topics
      </button>

    </div>
  )
}
