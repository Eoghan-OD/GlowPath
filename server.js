const dotenv = require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

app.use(cors());
app.use(express.json());

// Serve the main static files from ./public
app.use(express.static(path.join(__dirname, "public")));

// Serve assets go paths like /assets/logo.png still work
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

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error("PERPLEXITY_API_KEY is not set");
      return res.status(500).json({ error: "Server AI key not configured" });
    }

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content: "You are a friendly fitness coach. Give concise advice, mention anything unusual in the workout history, and compare the current week results to the previous week in a separate paragraph."
          },
          {
            role: "user",
            content: 
              "Here is my current filtered workout summary:\n\n" + summary + "\n\n" +
              "Please feedback and motivation based on this data."
          }
        ],
        temperature: 0.7,
        max_tokens: 512
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", errorText);
      return res.status(response.status).json({ error: "AI service error: " + errorText });
    }

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
