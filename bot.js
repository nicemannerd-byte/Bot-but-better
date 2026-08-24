import mineflayer from 'mineflayer';
import fetch from 'node-fetch';
import fs from 'fs';

const SERVER_HOST = 'Stridesmp.mcsh.io;
const SERVER_PORT = 25565;
const BOT_USERNAME = 'FayaazMJacc;
const TRIGGER_PREFIX = '!ai ';
const MODEL = 'openai/gpt-oss-20b';
const GROQ_API_KEY = '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';

let currentVersion = '1.21.11';

// ——— SHARED MEMORY ———
const MEMORY_FILE = 'chat_memory.json';
let conversationMemory = [];

if (fs.existsSync(MEMORY_FILE)) {
  try {
    conversationMemory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    console.log(`Loaded ${conversationMemory.length} past messages`);
  } catch (e) {
    console.log('Failed to load memory – starting fresh');
    conversationMemory = [];
  }
}

function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(conversationMemory, null, 2));
  } catch (e) {
    console.log('Failed to save memory');
  }
}

// ——— BOT CREATION ———
function createBot(version = currentVersion) {
  console.log(`Attempting connect with MC version: ${version}`);
  const bot = mineflayer.createBot({
  host: SERVER_HOST,
  port: SERVER_PORT,
  username: BOT_USERNAME,
  version: version,
  auth: 'offline',
  hideErrors: true,
});
 
  bot.once('login', () => {
    console.log(`${BOT_USERNAME} logged in! Ready for AI chats.`);
  });

  bot.on('error', (err) => {
    console.error('Bot error:', err.message);
  });

  bot.on('end', () => {
    console.log('Bot disconnected. Reconnecting in 10 seconds...');
    setTimeout(() => createBot(version), 10000);
  });

  bot.on('chat', async (username, message) => {
    if (username === BOT_USERNAME) return;
    if (!message.startsWith(TRIGGER_PREFIX)) return;

    const userQuery = message.slice(TRIGGER_PREFIX.length).trim();
    console.log(`Player ${username} asked: ${userQuery}`);

    conversationMemory.push({ who: username, text: userQuery });
    saveMemory();

    try {
      const aiResponse = await getGroqResponse(userQuery);
      const shortResponse = aiResponse.length > 200 ? aiResponse.slice(0, 200) + '...' : aiResponse;
      bot.chat(`${username}, ${shortResponse}`);
      console.log(`Replied to ${username}: ${shortResponse}`);
    } catch (error) {
      console.error('Groq API error:', error);
      bot.chat(`${username}, Sorry, my brain glitched — try again?`);
    }
  });
}

// ——— GROQ RESPONSE ———
async function getGroqResponse(query) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer KEY',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are CHAT_AI, a super-fast, funny, and helpful Minecraft AI created by Server Owner.
You remember everything everyone has ever said to you.
Here is the full server conversation history (newest at the bottom):

${conversationMemory.map(m => `${m.who}: ${m.text}`).join('\n') || 'No previous conversation'} `
        },
        { role: 'user', content: query }
      ],
      max_tokens: 200,
      temperature: 0.8
    })
  });

  if (!response.ok) throw new Error(`Groq API failed: ${response.statusText}`);
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

console.log('Starting bot...');
createBot();
