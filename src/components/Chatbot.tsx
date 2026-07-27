"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import "./Chatbot.css";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setShowBubble(false);
    }
  };

  return (
    <div className="chatbot-container">
      {/* Tooltip Bubble */}
      {showBubble && !isOpen && (
        <div className="chatbot-bubble">
          Hey! How can I help you?
          <div className="chatbot-bubble-arrow"></div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div>
              <h3>Support Assistant</h3>
              <p>Powered by AI</p>
            </div>
            <button onClick={toggleChat} className="chatbot-close-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="chatbot-messages custom-scrollbar">
            {messages.length === 0 ? (
              <div className="chatbot-msg-row bot">
                <div className="chatbot-msg-bubble">
                  <div className="text-sm">
                    👋 <strong>Hi there!</strong> I'm your AI Support Assistant.<br/><br/>
                    I can help you:
                    <ul style={{ paddingLeft: '20px', marginTop: '8px', marginBottom: '8px' }}>
                      <li>Find discounts for your bank card (e.g. "HBL fast food deals")</li>
                      <li>Calculate your final bill after applying a discount cap</li>
                      <li>Filter restaurants by city or food category</li>
                    </ul>
                    How can I assist you today? 😊
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} className={`chatbot-msg-row ${m.role === 'user' ? 'user' : 'bot'}`}>
                  <div className="chatbot-msg-bubble markdown-body">
                     <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="chatbot-msg-row bot">
                 <div className="chatbot-loading-dots">
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                    <div className="loading-dot"></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="chatbot-input-area">
            <div className="chatbot-input-wrapper">
              <input
                className="chatbot-input"
                value={input || ""}
                placeholder="Ask about card deals..."
                onChange={handleInputChange}
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={isLoading || !(input || "").trim()}
                className="chatbot-submit-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button onClick={toggleChat} className="chatbot-fab">
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
      </button>
    </div>
  );
}
