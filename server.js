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

// ============================================
// AI Chatbox Endpoint with Workout Data Support
// ============================================
app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message || "";
    const workoutData = req.body.workoutData || null;
    const conversationHistory = req.body.history || [];

    if (!userMessage) {
      return res.status(400).json({ success: false, error: "Missing 'message' field" });
    }

    // Simple fitness keyword check
    const fitnessKeywords = [
      'workout', 'exercise', 'fitness', 'gym', 'training', 'cardio', 'strength',
      'running', 'weight', 'muscle', 'calories', 'nutrition', 'diet', 'health',
      'reps', 'sets', 'squat', 'bench', 'deadlift', 'protein', 'coach', 'goal',
      'progress', 'analyze', 'advice', 'motivation', 'rest', 'recovery', 'stretch'
    ];
    
    const offTopicKeywords = [
      'weather', 'news', 'politics', 'stock', 'code', 'programming', 
      'javascript', 'python', 'math', 'homework', 'movie', 'game', 'recipe'
    ];
    
    const lowerMessage = userMessage.toLowerCase();
    const hasOffTopic = offTopicKeywords.some(kw => lowerMessage.includes(kw));
    
    // Block off-topic questions
    if (hasOffTopic) {
      return res.json({
        success: true,
        response: "Hey! I only help with fitness stuff. What can I help you with for your workouts?"
      });
    }

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      console.error("PERPLEXITY_API_KEY is not set");
      return res.status(500).json({ 
        success: false, 
        error: "Server configuration error" 
      });
    }

    // Build context with workout data if available
    let contextMessage = userMessage;
    
    if (workoutData && (workoutData.totalWorkouts > 0 || workoutData.recentWorkouts.length > 0)) {
      contextMessage = `User's workout data:\n`;
      contextMessage += `Total workouts: ${workoutData.totalWorkouts}\n`;
      contextMessage += `Total duration: ${workoutData.totalDuration} minutes\n`;
      contextMessage += `Total calories burned: ${workoutData.totalCalories}\n`;
      contextMessage += `Average workout duration: ${workoutData.averageDuration} minutes\n`;
      
      if (workoutData.recentWorkouts && workoutData.recentWorkouts.length > 0) {
        contextMessage += `\nRecent workout entries:\n`;
        workoutData.recentWorkouts.forEach((w, i) => {
          contextMessage += `${i + 1}. ${w.date}: ${w.activity}, ${w.duration} min, ${w.calories} cal`;
          if (w.steps > 0) contextMessage += `, ${w.steps} steps`;
          contextMessage += `\n`;
        });
      }
      
      contextMessage += `\nUser question: ${userMessage}`;
    }

    // Build messages with conversation history
    const messages = [
      {
        role: "system",
        content: `You are a friendly fitness coach chatting with a client on GlowPath.

CRITICAL STYLE RULES:
- Maximum 40 words per response
- Write like you're texting a friend
- Ask follow-up questions instead of giving long advice
- Be conversational and curious about their goals
- Use ONLY plain text (no asterisks, dashes, bullets, or special characters)
- Never cite sources or references
- Keep it to 1-2 short sentences

YOUR APPROACH:
- When they share data, acknowledge it briefly then ask what they want to work on
- Instead of listing advice, ask what their goal is
- Be encouraging but always curious
- Ask about their preferences, challenges, or what they enjoyed

GOOD examples:
"131 workouts is awesome! What are you working towards right now?"
"I see lots of variety in your training. What's your main fitness goal?"
"Nice work on the consistency! Are you feeling good or need to switch things up?"
"That's solid progress. What part of your routine do you want to focus on?"

BAD examples (too long, too much info):
"Your workout durations are long which suggests endurance focus. Calorie burn is high but make sure you're recovering."

Remember: Ask questions, don't lecture. Keep it under 40 words.`
      },
      ...conversationHistory,
      {
        role: "user",
        content: contextMessage
      }
    ];

    const response = await fetch(PERPLEXITY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: messages,
        temperature: 0.8,
        max_tokens: 80,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", errorText);
      return res.status(response.status).json({ 
        success: false,
        error: "Sorry, I'm having trouble connecting right now. Try again?"
      });
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;

    // Clean up response - remove special characters
    aiResponse = aiResponse
      .replace(/\*/g, '')           // Remove asterisks
      .replace(/—/g, '')            // Remove em dashes
      .replace(/–/g, '')            // Remove en dashes
      .replace(/\*/g, '')           // Remove stars
      .replace(/•/g, '')            // Remove bullets
      .replace(/[\[\]]/g, '')       // Remove brackets
      .replace(/\s+/g, ' ')         // Clean extra spaces
      .trim();

    res.json({
      success: true,
      response: aiResponse
    });

  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ 
      success: false,
      error: "Oops, something went wrong. Try again?"
    });
  }
});

// ============================================
// Add any other endpoints below this line
// ============================================

app.listen(PORT, () => {
  console.log(`GlowPath server running on port ${PORT}`);
});
