const dotenv = require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();

const PORT = process.env.PORT || 3000;
const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

app.use(express.json());

// Serve the main static files from ./public
app.use(express.static(path.join(__dirname, "public")));

// Serve assets so paths like /assets/logo.png still work
app.use("/assets", express.static(path.join(__dirname, "assets")));

// Root route - send the home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home-glowpath.html"));
});

// Validation function to keep AI fitness-focused
function isWorkoutRelated(text) {
  const fitnessKeywords = [
    'workout', 'exercise', 'fitness', 'gym', 'training', 'cardio', 'strength',
    'running', 'weight', 'muscle', 'calories', 'nutrition', 'diet', 'health',
    'reps', 'sets', 'push', 'pull', 'squat', 'bench', 'deadlift', 'protein',
    'recovery', 'rest', 'stretch', 'flexibility', 'endurance', 'performance'
  ];
  
  const offTopicKeywords = [
    'weather', 'news', 'politics', 'stock', 'code', 'programming', 
    'javascript', 'python', 'math', 'homework', 'recipe', 'movie', 'music'
  ];
  
  const lowerText = text.toLowerCase();
  
  // Check for explicit off-topic requests
  const hasOffTopic = offTopicKeywords.some(keyword => lowerText.includes(keyword));
  if (hasOffTopic) return false;
  
  // If it's workout summary data, always allow
  if (lowerText.includes('workout summary') || lowerText.includes('feedback')) return true;
  
  // Check for fitness keywords
  return fitnessKeywords.some(keyword => lowerText.includes(keyword));
}

// LLM proxy endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const summary = typeof req.body.summary === "string" ? req.body.summary : "";
    const userQuestion = req.body.question || "";

    if (!summary) {
      return res.status(400).json({ error: "Missing or invalid 'summary' field" });
    }

    // Pre-filter off-topic questions
    if (userQuestion && !isWorkoutRelated(userQuestion)) {
      return res.json({
        choices: [{
          message: {
            role: "assistant",
            content: "I'm GlowPath's fitness coach and can only help with workout and health-related questions. Please ask me about your fitness progress, exercise advice, or nutrition guidance! 💪"
          }
        }]
      });
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
            content: `You are a specialized fitness coach for GlowPath, a workout tracking application. 

STRICT GUIDELINES:
- ONLY answer questions about fitness, exercise, workouts, nutrition, and health
- Analyze the provided workout data and give personalized feedback
- Compare current week performance to previous weeks when data is available
- Provide motivation and exercise recommendations
- If asked about non-fitness topics, politely decline and redirect to fitness

IMPORTANT: If the user asks about anything unrelated to fitness, health, or exercise, respond with:
"I'm GlowPath's fitness coach and can only help with workout and health-related questions. Please ask me about your fitness progress, exercise advice, or nutrition guidance!"

Keep responses concise (2-3 paragraphs maximum) and motivating.`
          },
          {
            role: "user",
            content: userQuestion || 
              ("Here is my current filtered workout summary:\n\n" + summary + "\n\n" +
               "Please provide feedback and motivation based on this data.")
          }
        ],
        temperature: 0.7,
        max_tokens: 512,
        top_p: 0.9,
        frequency_penalty: 0.5
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
  console.log(`GlowPath server running on port ${PORT}`);
});
