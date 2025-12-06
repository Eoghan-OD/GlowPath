// glowpath-ai-widget.js
// Floating AI Chatbox Widget for GlowPath Profile Page

(function() {
    'use strict';
    
    let conversationHistory = [];
    let isExpanded = false;
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        initAIWidget();
    });
    
    function initAIWidget() {
        const widgetButton = document.getElementById('aiWidgetButton');
        const chatbox = document.getElementById('aiChatbox');
        const minimizeBtn = document.getElementById('aiMinimizeBtn');
        const sendBtn = document.getElementById('aiWidgetSend');
        const input = document.getElementById('aiWidgetInput');
        const quickBtns = document.querySelectorAll('.ai-quick-btn');
        
        if (!widgetButton || !chatbox) {
            console.warn('AI Widget elements not found on this page');
            return;
        }
        
        // Toggle chatbox on button click
        widgetButton.addEventListener('click', function() {
            toggleChatbox();
        });
        
        // Minimize chatbox
        minimizeBtn.addEventListener('click', function() {
            toggleChatbox();
        });
        
        // Send message
        sendBtn.addEventListener('click', function() {
            sendMessage();
        });
        
        // Enter key to send
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Quick action buttons
        quickBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const action = btn.getAttribute('data-action');
                handleQuickAction(action);
            });
        });
    }
    
    function toggleChatbox() {
        const widgetButton = document.getElementById('aiWidgetButton');
        const chatbox = document.getElementById('aiChatbox');
        
        isExpanded = !isExpanded;
        
        if (isExpanded) {
            chatbox.classList.remove('hidden');
            widgetButton.classList.add('hidden');
            // Focus input when opened
            setTimeout(function() {
                document.getElementById('aiWidgetInput').focus();
            }, 300);
        } else {
            chatbox.classList.add('hidden');
            widgetButton.classList.remove('hidden');
        }
    }
    
    function handleQuickAction(action) {
        let message = '';
        
        switch(action) {
            case 'analyze':
                message = 'Analyze my recent workouts and tell me how I\'m doing';
                break;
            case 'advice':
                message = 'Give me personalized advice based on my workout data';
                break;
            case 'motivation':
                message = 'Give me some motivation based on my progress';
                break;
        }
        
        if (message) {
            document.getElementById('aiWidgetInput').value = message;
            sendMessage();
        }
    }
    
    function sendMessage() {
        const input = document.getElementById('aiWidgetInput');
        const sendBtn = document.getElementById('aiWidgetSend');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Disable input while processing
        input.disabled = true;
        sendBtn.disabled = true;
        
        // Add user message
        addMessage(message, 'user');
        
        // Clear input
        input.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Get workout data to send with message
        const workoutData = getWorkoutData();
        
        // Send to API
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                workoutData: workoutData,
                history: conversationHistory
            })
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(function(data) {
            removeTypingIndicator();
            
            if (data.success) {
                addMessage(data.response, 'bot');
                
                // Update conversation history
                conversationHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.response }
                );
                
                // Keep only last 10 exchanges
                if (conversationHistory.length > 20) {
                    conversationHistory = conversationHistory.slice(-20);
                }
            } else {
                addMessage(data.error || 'Sorry, I encountered an error.', 'bot');
            }
        })
        .catch(function(error) {
            console.error('AI Widget error:', error);
            removeTypingIndicator();
            addMessage('Sorry, I\'m having trouble connecting. Please try again.', 'bot');
        })
        .finally(function() {
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        });
    }
    
    function getWorkoutData() {
        // Try to get workout data from the page
        let workoutSummary = {
            totalWorkouts: 0,
            totalDuration: 0,
            totalCalories: 0,
            averageDuration: 0,
            recentWorkouts: []
        };
        
        try {
            // Get stats from the page using data attributes
            const totalWorkoutsEl = document.querySelector('[data-stat="total-workouts"]');
            const totalDurationEl = document.querySelector('[data-stat="total-duration"]');
            const totalCaloriesEl = document.querySelector('[data-stat="total-calories"]');
            
            if (totalWorkoutsEl) workoutSummary.totalWorkouts = parseInt(totalWorkoutsEl.textContent) || 0;
            if (totalDurationEl) workoutSummary.totalDuration = parseInt(totalDurationEl.textContent) || 0;
            if (totalCaloriesEl) workoutSummary.totalCalories = parseInt(totalCaloriesEl.textContent) || 0;
            
            // Calculate average
            if (workoutSummary.totalWorkouts > 0) {
                workoutSummary.averageDuration = Math.round(workoutSummary.totalDuration / workoutSummary.totalWorkouts);
            }
            
            // Try to get workout data from global variable
            if (typeof window.allWorkouts !== 'undefined' && Array.isArray(window.allWorkouts)) {
                // Get last 5 workouts
                workoutSummary.recentWorkouts = window.allWorkouts.slice(-5).map(function(w) {
                    return {
                        date: w.date || 'Unknown',
                        activity: w.activity || 'Unknown',
                        duration: w.duration || 0,
                        calories: w.calories || 0,
                        steps: w.steps || 0
                    };
                });
            }
            
            // If we have workout data, return it
            if (workoutSummary.totalWorkouts > 0 || workoutSummary.recentWorkouts.length > 0) {
                return workoutSummary;
            }
            
        } catch (e) {
            console.warn('Could not extract workout data:', e);
        }
        
        return null;
    }
    
    function addMessage(text, sender) {
        const messagesContainer = document.getElementById('aiChatboxMessages');
        if (!messagesContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + sender + '-message';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom smoothly
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function showTypingIndicator() {
        const messagesContainer = document.getElementById('aiChatboxMessages');
        if (!messagesContainer) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        typingDiv.id = 'typingIndicator';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content typing-indicator';
        contentDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        
        typingDiv.appendChild(contentDiv);
        messagesContainer.appendChild(typingDiv);
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    // Export for debugging
    window.GlowPathAI = {
        getWorkoutData: getWorkoutData,
        toggleChatbox: toggleChatbox
    };
    
})();
