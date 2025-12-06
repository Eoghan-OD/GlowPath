// glowpath-ai-chat.js
// AI Chatbox functionality for GlowPath Profile Page

(function() {
    'use strict';
    
    let conversationHistory = [];
    
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
        initAIChatbox();
    });
    
    function initAIChatbox() {
        const chatMessages = document.getElementById('aiChatMessages');
        const chatInput = document.getElementById('aiChatInput');
        const sendButton = document.getElementById('aiSendButton');
        const quickButtons = document.querySelectorAll('.quick-question-btn');
        
        if (!chatMessages || !chatInput || !sendButton) {
            console.warn('AI chatbox elements not found on this page');
            return;
        }
        
        // Send button click
        sendButton.addEventListener('click', function() {
            sendAIMessage();
        });
        
        // Enter key to send
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });
        
        // Quick question buttons
        quickButtons.forEach(function(btn) {
            btn.addEventListener('click', function() {
                const question = btn.getAttribute('data-question');
                chatInput.value = question;
                sendAIMessage();
            });
        });
    }
    
    function sendAIMessage() {
        const chatInput = document.getElementById('aiChatInput');
        const sendButton = document.getElementById('aiSendButton');
        const message = chatInput.value.trim();
        
        if (!message) return;
        
        // Disable input while processing
        chatInput.disabled = true;
        sendButton.disabled = true;
        
        // Add user message to chat
        addAIMessage(message, 'user');
        
        // Clear input
        chatInput.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send to API
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
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
            // Remove typing indicator
            removeTypingIndicator();
            
            if (data.success) {
                // Add bot response
                addAIMessage(data.response, 'bot');
                
                // Update conversation history
                conversationHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.response }
                );
                
                // Keep only last 10 exchanges (20 messages)
                if (conversationHistory.length > 20) {
                    conversationHistory = conversationHistory.slice(-20);
                }
            } else {
                addAIMessage(data.error || 'Sorry, I encountered an error. Please try again.', 'bot');
            }
        })
        .catch(function(error) {
            console.error('AI Chat error:', error);
            removeTypingIndicator();
            addAIMessage('Sorry, I\'m having trouble connecting. Please check your internet connection and try again.', 'bot');
        })
        .finally(function() {
            // Re-enable input
            chatInput.disabled = false;
            sendButton.disabled = false;
            chatInput.focus();
        });
    }
    
    function addAIMessage(text, sender) {
        const chatMessages = document.getElementById('aiChatMessages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + sender + '-message';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function showTypingIndicator() {
        const chatMessages = document.getElementById('aiChatMessages');
        if (!chatMessages) return;
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator-message';
        typingDiv.id = 'typingIndicator';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content typing-indicator';
        contentDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        
        typingDiv.appendChild(contentDiv);
        chatMessages.appendChild(typingDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function removeTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
})();
