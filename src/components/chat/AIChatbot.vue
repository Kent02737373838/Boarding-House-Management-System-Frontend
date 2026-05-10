<template>
  <div class="chatbot-wrapper">
    <!-- Toggle FAB -->
    <button class="fab" :class="{ open: isOpen }" @click="toggleChat" aria-label="Toggle AI Assistant">
      <span class="fab-icon">
        <svg v-if="!isOpen" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2.5 21.5l4.5-.838A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
          <path d="M8 10.5h8M8 14h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </span>
      <span class="fab-pulse" v-if="!isOpen && hasUnread"></span>
    </button>

    <!-- Chat panel -->
    <Transition name="chat-panel">
      <div v-if="isOpen" class="chat-panel">
        <!-- Header -->
        <div class="chat-header">
          <div class="chat-header-left">
            <div class="avatar-ring">
              <div class="avatar-dot"></div>
            </div>
            <div>
              <p class="chat-title">ResidEase AI</p>
              <p class="chat-subtitle">Powered by Groq</p>
            </div>
          </div>
          <button class="clear-btn" @click="clearChat" title="Clear conversation">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        <!-- Messages -->
        <div class="chat-messages" ref="messagesEl">
          <!-- Welcome -->
          <div v-if="messages.length === 0" class="welcome-block">
            <div class="welcome-orb"></div>
            <p class="welcome-title">Hello! I'm your ResidEase assistant.</p>
            <p class="welcome-sub">Ask me about rent payments, lease details, room availability, or anything about your boarding house.</p>
            <div class="quick-prompts">
              <button
                v-for="prompt in quickPrompts"
                :key="prompt"
                class="quick-chip"
                @click="sendQuick(prompt)"
              >{{ prompt }}</button>
            </div>
          </div>

          <!-- Message bubbles -->
          <TransitionGroup name="message" tag="div">
            <div
              v-for="msg in messages"
              :key="msg.id"
              class="message-row"
              :class="msg.role"
            >
              <div v-if="msg.role === 'assistant'" class="msg-avatar">
                <div class="msg-avatar-inner"></div>
              </div>
              <div class="bubble" :class="msg.role === 'assistant' ? 'model' : 'user'">
                <span v-html="formatMessage(msg.content)"></span>
                <span class="msg-time">{{ formatTime(msg.ts) }}</span>
              </div>
            </div>
          </TransitionGroup>

          <!-- Typing indicator -->
          <div v-if="isTyping" class="message-row assistant">
            <div class="msg-avatar"><div class="msg-avatar-inner"></div></div>
            <div class="bubble model typing-bubble">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="error-banner">
            <span>⚠ {{ error }}</span>
            <button @click="error = null">✕</button>
          </div>
        </div>

        <!-- Input -->
        <div class="chat-input-area">
          <textarea
            ref="inputEl"
            v-model="userInput"
            class="chat-input"
            placeholder="Ask anything about ResidEase…"
            rows="1"
            @keydown.enter.exact.prevent="send"
            @input="autoResize"
          ></textarea>
          <button class="send-btn" :disabled="!userInput.trim() || isTyping" @click="send">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'

// ── Props ──────────────────────────────────────────────────────────────────────
const props = defineProps<{
  groqApiKey: string
  model?:     string    // default: llama-3.3-70b-versatile
  systemContext?: string
}>()

// ── Groq config ────────────────────────────────────────────────────────────────
// Groq exposes an OpenAI-compatible endpoint — no SDK needed, plain fetch works.
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL   = props.model ?? 'llama-3.3-70b-versatile'

const DEFAULT_SYSTEM = `You are ResidEase AI, a helpful assistant for a boarding house management system called ResidEase.
You help tenants and staff with questions about:
- Rent payments (including PayPal and cash payments)
- Lease agreements and renewal
- Room assignments and availability
- Maintenance requests
- Boarding house policies
Keep answers concise, friendly, and professional. Format lists with dashes. When unsure, recommend contacting management.`

// ── Types ──────────────────────────────────────────────────────────────────────
// Groq uses OpenAI roles: "user" | "assistant" | "system"
interface Message {
  id:      string
  role:    'user' | 'assistant'
  content: string
  ts:      Date
}

// ── State ──────────────────────────────────────────────────────────────────────
const isOpen    = ref(false)
const hasUnread = ref(false)
const userInput = ref('')
const isTyping  = ref(false)
const error     = ref<string | null>(null)
const messages  = ref<Message[]>([])
const messagesEl = ref<HTMLElement | null>(null)
const inputEl    = ref<HTMLTextAreaElement | null>(null)

const quickPrompts = [
  'How do I pay rent via PayPal?',
  'When is my rent due?',
  'What happens when my lease expires?',
  'How do I request maintenance?',
]

// ── Helpers ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2)

const formatTime = (d: Date) =>
  d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })

const formatMessage = (text: string) =>
  text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '• $1')
    .replace(/\n/g, '<br>')

const scrollBottom = async () => {
  await nextTick()
  if (messagesEl.value)
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}

const autoResize = () => {
  if (!inputEl.value) return
  inputEl.value.style.height = 'auto'
  inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 120) + 'px'
}

// ── Chat actions ───────────────────────────────────────────────────────────────
const toggleChat = () => {
  isOpen.value    = !isOpen.value
  hasUnread.value = false
  if (isOpen.value) nextTick(() => inputEl.value?.focus())
}

const clearChat = () => {
  messages.value = []
  error.value    = null
}

const sendQuick = (prompt: string) => {
  userInput.value = prompt
  send()
}

const send = async () => {
  const text = userInput.value.trim()
  if (!text || isTyping.value) return

  // Add user message to local history
  messages.value.push({ id: uid(), role: 'user', content: text, ts: new Date() })
  userInput.value = ''
  if (inputEl.value) inputEl.value.style.height = 'auto'
  error.value   = null
  isTyping.value = true
  await scrollBottom()

  try {
    // ── Build Groq request ──────────────────────────────────────────────────
    // Groq uses OpenAI chat format:
    //   messages: [ { role: "system"|"user"|"assistant", content: "..." }, ... ]
    const groqMessages = [
      // System prompt — always first
      {
        role:    'system',
        content: props.systemContext ?? DEFAULT_SYSTEM,
      },
      // Full conversation history (all prior turns)
      ...messages.value.slice(0, -1).map(m => ({
        role:    m.role,       // "user" | "assistant"
        content: m.content,
      })),
      // Current user message
      { role: 'user', content: text },
    ]

    const res = await fetch(GROQ_API_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${props.groqApiKey}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages:    groqMessages,
        temperature: 0.7,
        max_tokens:  512,
        top_p:       0.9,
        stream:      false,
      }),
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData?.error?.message ?? `Groq API error: HTTP ${res.status}`)
    }

    const data = await res.json()

    // Groq response shape (identical to OpenAI):
    // data.choices[0].message.content
    const reply: string =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I'm sorry, I couldn't generate a response. Please try again."

    messages.value.push({ id: uid(), role: 'assistant', content: reply, ts: new Date() })
    if (!isOpen.value) hasUnread.value = true

  } catch (e: any) {
    error.value = e.message || 'Something went wrong. Please try again.'
  } finally {
    isTyping.value = false
    await scrollBottom()
  }
}
</script>

<style scoped>
/* ── Variables ──────────────────────────────────────────────────────────────── */
:root {
  --re-primary: #1a6cff;
  --re-primary-light: #e8f0ff;
  --re-surface: #ffffff;
  --re-bg: #f5f7fb;
  --re-border: #e2e8f0;
  --re-text: #0f172a;
  --re-muted: #64748b;
  --re-radius: 20px;
  --re-shadow: 0 20px 60px -10px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.06);
}

.chatbot-wrapper {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9999;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* ── FAB ────────────────────────────────────────────────────────────────────── */
.fab {
  position: relative;
  width: 56px; height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1a6cff 0%, #0047cc 100%);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(26, 108, 255, 0.45);
  transition: transform 0.2s, box-shadow 0.2s;
  color: white; z-index: 2;
}
.fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(26, 108, 255, 0.55); }
.fab.open { background: linear-gradient(135deg, #475569 0%, #1e293b 100%); box-shadow: 0 4px 20px rgba(0,0,0,0.25); }
.fab-icon { width: 24px; height: 24px; }
.fab-pulse {
  position: absolute; top: 0; right: 0;
  width: 13px; height: 13px;
  background: #ef4444; border-radius: 50%; border: 2px solid white;
  animation: pulse 1.5s infinite;
}
@keyframes pulse { 0%,100%{transform:scale(1)}50%{transform:scale(1.3)} }

/* ── Chat panel ─────────────────────────────────────────────────────────────── */
.chat-panel {
  position: absolute; bottom: 70px; right: 0;
  width: 370px; max-height: 600px;
  border-radius: var(--re-radius);
  background: var(--re-surface);
  box-shadow: var(--re-shadow);
  display: flex; flex-direction: column;
  overflow: hidden; border: 1px solid var(--re-border);
}

.chat-panel-enter-active,
.chat-panel-leave-active { transition: all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }
.chat-panel-enter-from,
.chat-panel-leave-to { opacity: 0; transform: translateY(16px) scale(0.94); }

/* ── Header ─────────────────────────────────────────────────────────────────── */
.chat-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #1a6cff 0%, #0047cc 100%);
  color: white;
}
.chat-header-left { display: flex; align-items: center; gap: 12px; }
.avatar-ring {
  width: 38px; height: 38px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.15);
}
.avatar-dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: #4ade80; box-shadow: 0 0 6px #4ade80;
  animation: pulse 2s infinite;
}
.chat-title { font-size: 15px; font-weight: 700; margin: 0; letter-spacing: -0.2px; }
.chat-subtitle { font-size: 11px; opacity: 0.75; margin: 0; }
.clear-btn {
  background: rgba(255,255,255,0.15); border: none; color: white;
  cursor: pointer; padding: 6px; border-radius: 8px;
  display: flex; align-items: center; transition: background 0.15s;
}
.clear-btn:hover { background: rgba(255,255,255,0.25); }
.clear-btn svg { width: 18px; height: 18px; }

/* ── Messages ───────────────────────────────────────────────────────────────── */
.chat-messages {
  flex: 1; overflow-y: auto; padding: 16px;
  display: flex; flex-direction: column; gap: 10px;
  background: var(--re-bg); scroll-behavior: smooth;
}
.chat-messages::-webkit-scrollbar { width: 4px; }
.chat-messages::-webkit-scrollbar-thumb { background: var(--re-border); border-radius: 4px; }

/* ── Welcome ────────────────────────────────────────────────────────────────── */
.welcome-block {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; padding: 16px 8px; gap: 10px;
}
.welcome-orb {
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #1a6cff, #0047cc);
  box-shadow: 0 4px 20px rgba(26,108,255,0.35);
  animation: float 3s ease-in-out infinite;
}
@keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)} }
.welcome-title { font-weight: 700; font-size: 15px; color: var(--re-text); margin: 0; }
.welcome-sub { font-size: 13px; color: var(--re-muted); margin: 0; line-height: 1.5; }
.quick-prompts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 4px; }
.quick-chip {
  font-size: 12px; padding: 6px 12px; border-radius: 100px;
  border: 1.5px solid var(--re-primary); color: var(--re-primary);
  background: var(--re-primary-light); cursor: pointer;
  transition: all 0.15s; font-weight: 500;
}
.quick-chip:hover { background: var(--re-primary); color: white; }

/* ── Message rows ───────────────────────────────────────────────────────────── */
.message-row { display: flex; align-items: flex-end; gap: 8px; }
.message-row.user { flex-direction: row-reverse; }

.msg-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, #1a6cff, #0047cc);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.msg-avatar-inner { width: 10px; height: 10px; border-radius: 50%; background: white; }

/* ── Bubbles ────────────────────────────────────────────────────────────────── */
.bubble {
  max-width: 76%; padding: 10px 14px; border-radius: 18px;
  font-size: 13.5px; line-height: 1.55; position: relative;
}
.bubble.user {
  background: linear-gradient(135deg, #1a6cff, #0047cc);
  color: white; border-bottom-right-radius: 4px;
}
.bubble.model {
  background: white; color: var(--re-text); border-bottom-left-radius: 4px;
  border: 1px solid var(--re-border); box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.msg-time { display: block; font-size: 10px; opacity: 0.55; margin-top: 4px; text-align: right; }

/* ── Typing ─────────────────────────────────────────────────────────────────── */
.typing-bubble { display: flex; align-items: center; gap: 4px; padding: 12px 16px; }
.dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #94a3b8; animation: bounce 1.2s infinite ease-in-out;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)} }

.message-enter-active { transition: all 0.25s ease; }
.message-enter-from { opacity: 0; transform: translateY(10px); }

/* ── Error ──────────────────────────────────────────────────────────────────── */
.error-banner {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; background: #fef2f2;
  border: 1px solid #fecaca; border-radius: 10px;
  font-size: 12px; color: #dc2626; gap: 8px;
}
.error-banner button { background: none; border: none; color: #dc2626; cursor: pointer; font-size: 14px; }

/* ── Input ──────────────────────────────────────────────────────────────────── */
.chat-input-area {
  display: flex; align-items: flex-end; gap: 10px;
  padding: 12px 14px; border-top: 1px solid var(--re-border); background: white;
}
.chat-input {
  flex: 1; border: 1.5px solid var(--re-border); border-radius: 14px;
  padding: 9px 14px; font-size: 13.5px; font-family: inherit;
  resize: none; outline: none; background: var(--re-bg); color: var(--re-text);
  transition: border-color 0.15s; line-height: 1.5; max-height: 120px; overflow-y: auto;
}
.chat-input:focus { border-color: var(--re-primary); background: white; }
.chat-input::placeholder { color: #94a3b8; }
.send-btn {
  width: 38px; height: 38px; border-radius: 50%; border: none;
  background: linear-gradient(135deg, #1a6cff, #0047cc); color: white;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all 0.15s; box-shadow: 0 2px 10px rgba(26,108,255,0.3);
}
.send-btn:hover:not(:disabled) { transform: scale(1.1); box-shadow: 0 4px 16px rgba(26,108,255,0.45); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
.send-btn svg { width: 17px; height: 17px; }

@media (max-width: 420px) {
  .chatbot-wrapper { bottom: 16px; right: 16px; }
  .chat-panel { width: calc(100vw - 32px); right: 0; }
}
</style>