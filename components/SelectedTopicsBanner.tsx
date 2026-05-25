import React from "react"

export default function SelectedTopicsBanner({
  selectedTopics,
  setSelectedTopics,
  setSelectedTopic
}: any) {

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

        {selectedTopics.map((t:any, i:number) => {

            const label =
            typeof t === "string"
                ? t
                : t.topic

            return (

            <div
                key={i}
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

                <span>{label}</span>

                <span
                onClick={() => {

                    setSelectedTopics(
                    selectedTopics.filter((item:any) => {

                        const itemLabel =
                        typeof item === "string"
                            ? item
                            : item.topic

                        return itemLabel !== label

                    })
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