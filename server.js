require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

app.use(cors());
app.use(express.json());

// Serve the main static files from ./public
app.use(express.static(path.join(__dirname, "public")));

// Serve assets so paths like /assets/logo.png still work
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Root route - send the home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home-glowpath.html"));
});

// LLM proxy endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const summary = typeof req.body.summary === "string" ? req.body.summary : "";

    if (!summary) {
      return res.status(400).json({ error: "Missing or invalid 'summary' field" });
    }

    const apiKey = process.env.EXTERNAL_API_KEY;
    if (!apiKey) {
      console.error("EXTERNAL_API_KEY is not set");
      return res.status(500).json({ error: "Server AI key not configured" });
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are a friendly fitness coach. Give concise advice, mention anything unusual in the workout history, and compare the current week results to the previous week in a separate paragraph."
          },
          {
            role: "user",
            content:
              `Here is my current filtered workout summary:\n\n${summary}\n\n` +
              "Give me feedback and motivation based on this data."
          }
        ],
        temperature: 0.7,
        max_tokens: 512
      })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Groq API error", response.status, text);
      return res.status(502).json({ error: "Groq API error", status: response.status });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content?.trim() || "No response from AI.";
    return res.json({ reply });
  } catch (err) {
    console.error("Error in /api/chat", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Fallback route for direct deep links
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home-glowpath.html"));
});

app.listen(PORT, () => {
  console.log(`GlowPath server running on port ${PORT}`);
});
