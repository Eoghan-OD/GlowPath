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
        response: "I'm GlowPath's fitness coach and can only help with workout and health-related questions. Ask me about your fitness progress, exercise advice, or nutrition guidance! 💪"
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
      contextMessage += `- Total workouts: ${workoutData.totalWorkouts}\n`;
      contextMessage += `- Total duration: ${workoutData.totalDuration} minutes\n`;
      contextMessage += `- Total calories burned: ${workoutData.totalCalories}\n`;
      contextMessage += `- Average workout duration: ${workoutData.averageDuration} minutes\n`;
      
      if (workoutData.recentWorkouts && workoutData.recentWorkouts.length > 0) {
        contextMessage += `\nRecent workout entries:\n`;
        workoutData.recentWorkouts.forEach((w, i) => {
          contextMessage += `${i + 1}. ${w.date}: ${w.activity} - ${w.duration} min, ${w.calories} cal`;
          if (w.steps > 0) contextMessage += `, ${w.steps} steps`;
          contextMessage += `\n`;
        });
      }
      
      contextMessage += `\nUser's question: ${userMessage}`;
    }

    // Build messages with conversation history
    const messages = [
      {
        role: "system",
        content: `You are a specialized fitness coach for GlowPath, a workout tracking app. 

CRITICAL RULES:
- Keep responses VERY brief (2-3 sentences max)
- Be direct and conversational, like texting a friend
- ONLY answer fitness, exercise, workout, nutrition, and health questions
- When workout data is provided, reference their ACTUAL numbers
- Be encouraging but concise
- If asked off-topic, redirect briefly to fitness

Your expertise: workout analysis, exercise form, nutrition, goal setting, recovery, motivation

Examples of good responses:
- "Nice! 15 workouts in shows great consistency. Try adding more strength training to balance your cardio."
- "450 minutes total is solid! Aim for 60-min sessions to boost endurance."
- "I see you're focusing on running. Mix in some weights 2x/week for better results."

Keep it short, friendly, and actionable!`
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
        temperature: 0.7,
        max_tokens: 150,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", errorText);
      return res.status(response.status).json({ 
        success: false,
        error: "Sorry, I'm having trouble connecting right now. Please try again." 
      });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    res.json({
      success: true,
      response: aiResponse
    });

  } catch (err) {
    console.error("Error in /api/chat:", err);
    res.status(500).json({ 
      success: false,
      error: "Sorry, something went wrong. Please try again." 
    });
  }
});

// ============================================
// Add any other endpoints below this line
// ============================================

app.listen(PORT, () => {
  console.log(`GlowPath server running on port ${PORT}`);
});
