// 1. Initialize history from localStorage (or start empty if first time)
let conversationHistory = JSON.parse(localStorage.getItem('myra_chat_history')) || [];

function appendMessage(role, text, extraClass = '') {
    const chatbox = document.getElementById('chatbox');
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `message ${role} ${extraClass}`.trim();

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = text;

    messageWrapper.appendChild(bubble);
    chatbox.appendChild(messageWrapper);
    chatbox.scrollTop = chatbox.scrollHeight;
}

async function sendMessage() {
    const inputElement = document.getElementById('user-input');
    const button = document.getElementById('send-btn');
    const message = inputElement.value.trim();

    if (!message) return;

    // Display user message and clear inputs
    appendMessage('user', message.replace(/\n/g, '<br>'));
    inputElement.value = '';
    button.disabled = true;
    inputElement.disabled = true;

    // 2. Save using your flat array style
    conversationHistory.push({ role: 'user', parts: { text: message } });
    localStorage.setItem('myra_chat_history', JSON.stringify(conversationHistory));

    // Show the "Thinking..." bubble
    const thinkingId = `thinking-${Date.now()}`;
    const thinkingWrapper = document.createElement('div');
    thinkingWrapper.className = 'message ai';
    thinkingWrapper.id = thinkingId;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble thinking';
    bubble.textContent = 'Thinking...';

    thinkingWrapper.appendChild(bubble);
    document.getElementById('chatbox').appendChild(thinkingWrapper);
    document.getElementById('chatbox').scrollTop = document.getElementById('chatbox').scrollHeight;

    try {
        // 3. Fetch data via standard JSON request payload
        const response = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ history: conversationHistory }) 
        });

        const data = await response.json();
        
        // Remove the loading indicator bubble
        const thinkingEl = document.getElementById(thinkingId);
        if (thinkingEl) {
            thinkingEl.remove();
        }
        
        // Render Myra's complete reply on screen
        appendMessage('ai', `<strong>MYRA:</strong> ${data.reply.replace(/\n/g, '<br>')}`);

        // 4. Record MYRA's reply into local history tracking
        conversationHistory.push({ role: 'model', parts: { text: data.reply } });
        localStorage.setItem('myra_chat_history', JSON.stringify(conversationHistory));

    } catch (error) {
        const thinkingEl = document.getElementById(thinkingId);
        if (thinkingEl) {
            thinkingEl.remove();
        }
        appendMessage('ai', '<span style="color:#ff6b6b;">Error connecting to server.</span>');
        
        // Revert last array add if network failed completely to keep memory clear
        conversationHistory.pop();
        localStorage.setItem('myra_chat_history', JSON.stringify(conversationHistory));
    } finally {
        button.disabled = false;
        inputElement.disabled = false;
        inputElement.focus();
    }
}

function clearConversationHistory() {
    localStorage.removeItem('myra_chat_history');
    conversationHistory = [];
    const chatbox = document.getElementById('chatbox');
    if (chatbox) {
        chatbox.innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('send-btn');
    const input = document.getElementById('user-input');
    const clearButton = document.getElementById('clear-history-btn');

    // 5. FIXED: Corrected text selection fallback so it reads previous chats safely without crashing
    conversationHistory.forEach(msg => {
        let msgText = "";
        if (msg.parts) {
            if (Array.isArray(msg.parts) && msg.parts[0]) {
                msgText = msg.parts[0].text || "";
            } else {
                msgText = msg.parts.text || "";
            }
        }
        
        if (msg.role === 'user') {
            appendMessage('user', msgText.replace(/\n/g, '<br>'));
        } else {
            appendMessage('ai', `<strong>MYRA:</strong> ${msgText.replace(/\n/g, '<br>')}`);
        }
    });

    if (button) {
        button.addEventListener('click', sendMessage);
    }

    if (input) {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendMessage();
            }
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            clearConversationHistory();
        });
    }
});

window.sendMessage = sendMessage;
