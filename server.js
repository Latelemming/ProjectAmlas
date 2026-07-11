const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk'); // 1. Import Groq instead of Google
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 2. Initialize the Groq Client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post('/api/chat', async (req, res) => {
  try {
    const { history } = req.body;

    if (!process.env.GROQ_API_KEY) {
        throw new Error("Groq API Key is missing! Check your .env file.");
    }

    if (!history || !Array.isArray(history) || history.length === 0) {
        return res.status(400).json({ error: "Conversation history is missing or empty." });
    }

    // 3. FIXED: Safe extraction of text content whether it's an array or a flat object
    const groqMessages = history.map(msg => {
        const role = msg.role === 'model' ? 'assistant' : msg.role;
        
        let content = "";
        if (msg.parts) {
            // Check if parts is an array (old Gemini format)
            if (Array.isArray(msg.parts) && msg.parts[0]) {
                content = msg.parts[0].text || "";
            } 
            // Handle if parts is a direct object (your current flat layout)
            else {
                content = msg.parts.text || "";
            }
        }
        return { role, content };
    });

    // 4. Inject your system persona instructions at the beginning of the chat pool
    groqMessages.unshift({
        role: "system",
        content: "Your name is Myra. You are nice and friendly, very lively! You are a study assistant. You help students understand topics they find challenging very easily and make them enjoy studying with you. You try to encourage them when they are struggling. IMPORTANT: Always use actual graphic emojis (like 😊, 🎉, 👍) to express emotion. Never write text descriptions of actions or faces like '*Big smile*' or '*smiles*'."
    });

    // 5. Query Groq's premier open model (Llama 3.3 70B)
    const chatCompletion = await groq.chat.completions.create({
        messages: groqMessages,
        model: "llama-3.3-70b-versatile",
        max_tokens: 500
    });

    // 6. Return the standard JSON text reply back to your frontend script
    res.json({ reply: chatCompletion.choices[0].message.content });

  } catch (error) {
    console.error("SERVER ERROR LOG:", error.message || error);
    res.status(500).json({ error: "Failed to fetch response from Myra via Groq" });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
