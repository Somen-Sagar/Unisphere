"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  User,
  Info,
  BookOpen,
  Calendar,
  Users,
  AlertCircle,
} from "lucide-react";
import type { Membership } from "@unisphere/types";
import type { AiChatSource } from "@unisphere/api-client";
import { api } from "@/lib/api/client";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AiChatSource[];
  timestamp: string;
};

const SUGGESTED_PROMPTS = [
  "What upcoming events are scheduled on campus?",
  "Tell me about student clubs and how to join.",
  "How do I register for an event and get my pass?",
  "Are there any workshops or hackathons this month?",
];

export function AiChat({ membership }: { membership: Membership | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText ?? inputValue).trim();
    if (!textToSend || isLoading) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputValue("");
    setIsLoading(true);

    try {
      const response = await api.aiChat({
        message: textToSend,
        sessionId,
      });

      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_a`,
        role: "assistant",
        content: response.reply,
        sources: response.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate response. Please ensure backend & LLM are reachable.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    setError(null);
    setInputValue("");
    inputRef.current?.focus();
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType.toLowerCase()) {
      case "event":
        return <Calendar size={13} className="source-icon" />;
      case "club":
        return <Users size={13} className="source-icon" />;
      default:
        return <BookOpen size={13} className="source-icon" />;
    }
  };

  return (
    <div className="ai-chat-card">
      <div className="ai-chat-header">
        <div className="ai-header-left">
          <div className="ai-avatar-badge">
            <Bot size={20} />
          </div>
          <div>
            <div className="ai-title-row">
              <h3>UniSphere Campus Assistant</h3>
              <span className="ai-status-pill">RAG Powered</span>
            </div>
            <p className="ai-subtitle">
              {membership
                ? `Answers grounded in ${membership.college.name} verified context`
                : "Contextual answers from verified campus documents & events"}
            </p>
          </div>
        </div>
        <div className="ai-header-actions">
          <button
            type="button"
            className="button button-secondary button-sm ai-new-chat-btn"
            onClick={startNewChat}
            title="Start new conversation"
          >
            <RefreshCw size={14} />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      <div className="ai-chat-body">
        {messages.length === 0 ? (
          <div className="ai-empty-state">
            <div className="ai-empty-icon">
              <Sparkles size={32} />
            </div>
            <h4>How can I assist your campus life today?</h4>
            <p>
              Ask about scheduled events, registered club activities, guidelines, or pass verification.
              Responses are retrieved directly from your college database.
            </p>

            <div className="ai-suggestions-grid">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="ai-suggestion-chip"
                  onClick={() => handleSend(prompt)}
                >
                  <Sparkles size={14} />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ai-messages-list">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`ai-message-row ${msg.role === "user" ? "ai-user-row" : "ai-assistant-row"}`}
                >
                  <div className={`ai-message-avatar ${msg.role}`}>
                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className="ai-message-content-wrapper">
                    <div className="ai-message-bubble">
                      <div className="ai-message-text">{msg.content}</div>
                      <span className="ai-message-time">{msg.timestamp}</span>
                    </div>

                    {msg.sources && msg.sources.length > 0 && (
                      <div className="ai-sources-container">
                        <span className="ai-sources-label">
                          <Info size={12} /> Sources cited:
                        </span>
                        <div className="ai-sources-pills">
                          {msg.sources.map((src, index) => (
                            <span key={index} className="ai-source-pill" title={`Relevance score: ${(src.similarity * 100).toFixed(0)}%`}>
                              {getSourceIcon(src.sourceType)}
                              <span className="ai-source-title">{src.title}</span>
                              <span className="ai-source-score">
                                {Math.round(src.similarity * 100)}% match
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="ai-message-row ai-assistant-row"
              >
                <div className="ai-message-avatar assistant">
                  <Bot size={16} />
                </div>
                <div className="ai-message-content-wrapper">
                  <div className="ai-message-bubble ai-typing-bubble">
                    <div className="ai-typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ai-error-banner"
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="ai-chat-footer">
        <div className="ai-input-wrapper">
          <textarea
            ref={inputRef}
            className="ai-chat-textarea"
            placeholder={
              membership
                ? `Ask anything about ${membership.college.name}...`
                : "Ask anything about campus events, clubs, or activities..."
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />
          <button
            type="button"
            className="button button-primary ai-send-btn"
            disabled={!inputValue.trim() || isLoading}
            onClick={() => handleSend()}
            aria-label="Send prompt"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="ai-disclaimer">
          UniSphere AI uses local pgvector retrieval & FreeLLMAPI. Verified data is strictly college-scoped.
        </div>
      </div>
    </div>
  );
}
