// glowpath-ai.js
// Frontend helper that talks to the Node backend, not directly to Groq.

async function callGlowpathLLM(summaryText) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ summary: summaryText }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("API /api/chat error", response.status, text);
      return `AI service error (${response.status}): ${text}`;
    }

    const data = await response.json();
    if (data && typeof data.reply === "string" && data.reply.trim().length) {
      return data.reply.trim();
    }
    return "AI did not return a message.";
  } catch (err) {
    console.error("Error calling /api/chat", err);
    return "Could not reach the AI service right now.";
  }
}
