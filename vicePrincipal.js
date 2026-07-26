const { GoogleGenAI } = require('@google/genai');
const { SYSTEM_PROMPT, FALLBACK_RESPONSES } = require('./persona');

// Channel cooldown tracking for random inspections (5 minutes per channel)
const channelCooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000;
const RANDOM_INSPECTION_CHANCE = 0.07; // 7% chance on suitable chat messages

let aiClient = null;

function initAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      aiClient = new GoogleGenAI({ apiKey });
      console.log('Vice Principal Bot: Gemini AI initialized.');
    } catch (err) {
      console.error('Vice Principal Bot: Error initializing Gemini AI SDK:', err);
    }
  } else {
    console.log('Vice Principal Bot: GEMINI_API_KEY not set. Using offline VP fallback mode.');
  }
}

function getSalutation(member) {
  if (!member || !member.roles || !member.roles.cache) return 'Ayy gentleman.';
  const hasFemale = member.roles.cache.some((r) => r.name.toLowerCase() === 'female');
  if (hasFemale) return 'Madam.';
  const hasMale = member.roles.cache.some((r) => r.name.toLowerCase() === 'male');
  if (hasMale) return 'Ayy gentleman.';
  return 'Ayy gentleman.';
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function generateVPResponse({ promptContext, defaultFallbackCategory = 'mentions' }) {
  if (aiClient && process.env.GEMINI_API_KEY) {
    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: promptContext }],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      });

      if (response && response.text) {
        let cleanText = response.text.trim();
        // Remove any markdown block wrappers if present
        cleanText = cleanText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
        if (cleanText) return cleanText;
      }
    } catch (err) {
      console.error('Vice Principal Bot: AI generation failed, using fallback:', err.message);
    }
  }

  const category = FALLBACK_RESPONSES[defaultFallbackCategory] || FALLBACK_RESPONSES.mentions;
  return getRandomItem(category);
}

async function handleMessage(message, client) {
  // Ignore bot messages and verification channel
  if (message.author.bot) return;
  if (process.env.VERIFY_CHANNEL_ID && message.channel.id === process.env.VERIFY_CHANNEL_ID) return;

  const isMentioned = message.mentions.has(client.user);

  let isReplyToBot = false;
  if (message.reference && message.reference.messageId) {
    try {
      const referencedMsg = await message.channel.messages.fetch(message.reference.messageId);
      if (referencedMsg && referencedMsg.author.id === client.user.id) {
        isReplyToBot = true;
      }
    } catch (err) {
      // Message couldn't be fetched, ignore
    }
  }

  const salutation = getSalutation(message.member);
  const authorName = message.member ? (message.member.displayName || message.author.username) : message.author.username;
  const now = Date.now();

  // 1. Direct interaction (Mentioned or Replied to VP) -> ALWAYS REPLY (100%)
  if (isMentioned || isReplyToBot) {
    const promptContext = `Context: User ${authorName} (${salutation}) in channel #${message.channel.name} addressed you directly.\nUser message: "${message.content}"\nRespond in character as Vice Principal Bot (1 to 4 short sentences, strict, old-school VP tone, dry dad joke, optional diary note, address them appropriately as ${salutation}).`;

    try {
      await message.channel.sendTyping();
      const replyText = await generateVPResponse({
        promptContext,
        defaultFallbackCategory: 'mentions',
      });
      await message.reply(replyText);
      channelCooldowns.set(message.channel.id, now);
    } catch (err) {
      console.error('Error sending VP reply:', err);
    }
    return;
  }

  // 2. Random Inspection Logic (5-10% of messages in active channels, subject to cooldown)
  const lastSpoke = channelCooldowns.get(message.channel.id) || 0;
  if (now - lastSpoke < COOLDOWN_MS) {
    return; // Channel is on cooldown
  }

  if (Math.random() < RANDOM_INSPECTION_CHANCE) {
    // Only interrupt if message is reasonably suitable (not tiny empty messages)
    if (message.content && message.content.length > 2) {
      const promptContext = `Context: You are walking down the corridor and overhearing channel #${message.channel.name}.\nUser ${authorName} (${salutation}) just sent: "${message.content}"\nDo a brief, dry Vice Principal inspection remark or diary observation (1 to 3 short sentences). Remember: less is funnier.`;

      try {
        await message.channel.sendTyping();
        const inspectionText = await generateVPResponse({
          promptContext,
          defaultFallbackCategory: 'randomInspections',
        });
        await message.channel.send(inspectionText);
        channelCooldowns.set(message.channel.id, now);
      } catch (err) {
        console.error('Error sending random inspection:', err);
      }
    }
  }
}

// Voice chat state monitoring
const vcJoinTimestamps = new Map();

async function handleVoiceStateUpdate(oldState, newState, client) {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const salutation = getSalutation(member);
  const displayName = member.displayName || member.user.username;

  // Joined VC
  if (!oldState.channelId && newState.channelId) {
    vcJoinTimestamps.set(member.id, Date.now());

    // 10% chance to drop inspection note in the first available text channel
    if (Math.random() < 0.10) {
      const channel = newState.guild.channels.cache.find(
        (c) => c.isTextBased() && c.id !== process.env.VERIFY_CHANNEL_ID && c.permissionsFor(newState.guild.members.me).has('SendMessages')
      );
      if (channel) {
        const prompt = `Context: ${displayName} (${salutation}) just joined voice chat channel ${newState.channel.name}.\nMake a 1-2 sentence VP inspection remark.`;
        const response = await generateVPResponse({
          promptContext: prompt,
          defaultFallbackCategory: 'voiceJoin',
        });
        channel.send(response).catch(() => {});
      }
    }
  }

  // Left VC
  if (oldState.channelId && !newState.channelId) {
    const joinedAt = vcJoinTimestamps.get(member.id);
    vcJoinTimestamps.delete(member.id);

    if (joinedAt && (Date.now() - joinedAt < 10000)) {
      // Left within 10 seconds! Quick leave inspection
      if (Math.random() < 0.20) {
        const channel = oldState.guild.channels.cache.find(
          (c) => c.isTextBased() && c.id !== process.env.VERIFY_CHANNEL_ID && c.permissionsFor(oldState.guild.members.me).has('SendMessages')
        );
        if (channel) {
          const prompt = `Context: ${displayName} (${salutation}) joined voice chat and disconnected after 5 seconds.\nMake a short VP remark about why they disconnected so fast.`;
          const response = await generateVPResponse({
            promptContext: prompt,
            defaultFallbackCategory: 'voiceLeaveQuick',
          });
          channel.send(response).catch(() => {});
        }
      }
    }
  }
}

module.exports = {
  initAI,
  handleMessage,
  handleVoiceStateUpdate,
};
