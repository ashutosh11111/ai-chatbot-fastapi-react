import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Constants
// const API_BASE_URL = process.env.REACT_APP_API_URL || "https://ai-chatbot-fastapi-react.onrender.com";
const API_BASE_URL = "https://ai-chatbot-fastapi-react.onrender.com";
const MAX_INPUT_LENGTH = 1000;
const STORAGE_KEY = 'throttlebot_messages';

export default function App() {
  const [messages, setMessages] = useState([
    { 
      id: Date.now(),
      sender: "bot", 
      text: "Hey rider! 🏍️ I'm ThrottleBot, your motorized companion! Ready to rev up some conversation?" 
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages);
        }
      } catch (err) {
        console.error("Error loading saved messages:", err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 1) { // Don't save if only initial message
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



  const handleSend = async (e) => {
    e.preventDefault();
    const sanitizedInput = input.trim().slice(0, MAX_INPUT_LENGTH);
    if (!sanitizedInput || loading) return;

    const userMessage = { 
      id: Date.now(),
      sender: "user", 
      text: sanitizedInput 
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsThinking(true);

    // Add thinking message
    const thinkingMessage = { 
      id: Date.now() + 1,
      sender: "bot", 
      text: "", 
      isThinking: true 
    };
    setMessages((prev) => [...prev, thinkingMessage]);

    let reader;
    try {
      const response = await fetch(`${API_BASE_URL}/chat-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: sanitizedInput }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      setIsThinking(false);
      
      // Replace thinking message with actual bot message
      setMessages((prev) => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { 
          id: Date.now() + 2,
          sender: "bot", 
          text: "" 
        };
        return newMsgs;
      });

      reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let accumulatedText = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          setMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1] = { 
              sender: "bot", 
              text: accumulatedText 
            };
            return newMsgs;
          });
        }
      }
    } catch (err) {
      console.error("API Error:", err);
      setIsThinking(false);
      
      // Remove thinking message and add error message
      setMessages((prev) => {
        const newMsgs = prev.slice(0, -1);
        return [
          ...newMsgs,
          { 
            id: Date.now() + 3,
            sender: "bot", 
            text: "🛑 Engine trouble! Connection lost. Try revving it up again! 🔧" 
          }
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  // Thinking animation component
  const ThinkingAnimation = () => (
    <div className="flex items-center space-x-2">
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="w-2 h-2 bg-red-400 rounded-full"
      />
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
        className="w-2 h-2 bg-orange-400 rounded-full"
      />
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
        className="w-2 h-2 bg-yellow-400 rounded-full"
      />
      <span className="text-red-300 text-sm">Bot is thinking...</span>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-800 text-white font-sans relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-600 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-5 animate-bounce delay-500"></div>
      </div>

      {/* Header with clear chat button */}
      {/* Header with clear chat button */}
      <header className="relative bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 py-4 shadow-2xl text-center z-10 border-b-2 border-red-400/50">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
        
        {/* Connection status and clear button - more compact */}
        <div className="absolute top-2 right-3 flex items-center space-x-2">
          {!isOnline && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center space-x-1 bg-red-500/80 px-2 py-1 rounded-full text-xs"
            >
              <span>🔴</span>
              <span>Offline</span>
            </motion.div>
          )}
        </div>

        {/* Main title - more compact */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative flex items-center justify-center space-x-2"
        >
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-2xl"
          >
            🏍️
          </motion.div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-yellow-200 tracking-tight font-mono">
            THROTTLEBOT
          </h1>
          <motion.div
            animate={{ 
              rotate: [0, -5, 5, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
            className="text-2xl"
          >
            🔧
          </motion.div>
        </motion.div>
        
        {/* Subtitle - smaller and closer */}
        <motion.p 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-white/80 mt-0.5 font-light tracking-wide"
        >
          Your High-Octane AI Companion
        </motion.p>

      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-red-600 scrollbar-track-transparent relative z-10">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-start space-x-3 max-w-xs md:max-w-md lg:max-w-lg ${msg.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                {/* Avatar */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg border ${
                    msg.sender === "user" 
                      ? "bg-gradient-to-br from-red-500 to-orange-500 border-red-400" 
                      : "bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600"
                  }`}
                >
                  {msg.sender === "user" ? "👤" : "🤖"}
                </motion.div>
                
                {/* Message Bubble */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`px-4 py-3 rounded-2xl shadow-xl backdrop-blur-sm border-2 ${
                    msg.sender === "user"
                      ? "bg-gradient-to-br from-red-600 to-orange-500 text-white rounded-br-none border-red-400/50"
                      : "bg-gray-800/80 border-gray-600/50 text-gray-100 rounded-bl-none"
                  }`}
                >
                  {msg.sender === "bot" && !msg.text && isThinking ? (
                    <ThinkingAnimation />
                  ) : msg.text ? (
                    msg.text
                  ) : (
                    <ThinkingAnimation />
                  )}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </main>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="relative p-4 bg-gray-900/70 backdrop-blur-xl border-t-2 border-gray-600/50 z-10"
      >
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <motion.div
            whileFocus={{ scale: 1.02 }}
            className="flex-1 relative"
          >
            <input
              ref={inputRef}
              type="text"
              className="w-full p-4 bg-gray-800/80 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder-gray-400 transition-all duration-300 border-2 border-gray-600/50 backdrop-blur-sm pr-12 font-mono"
              placeholder="Type your message and hit the throttle... 🏍️ "
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  handleSend(e);
                }
              }}
              aria-label="Type your message to ThrottleBot"
              aria-required="true"
            />
            {!input && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                ⚡
              </div>
            )}
            {/* Character count */}
            {input.length > MAX_INPUT_LENGTH * 0.8 && (
              <div className="absolute -bottom-6 right-0 text-xs text-orange-300">
                {input.length}/{MAX_INPUT_LENGTH}
              </div>
            )}
          </motion.div>
          <motion.button
            type="submit"
            disabled={loading || !input.trim()}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 px-6 py-4 rounded-xl font-medium transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/25 flex items-center space-x-2 min-w-[100px] justify-center border-2 border-red-400/30 font-mono tracking-wide"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <>
                <span>REV</span>
                <motion.span
                  animate={{ x: [0, 3, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  🏍️
                </motion.span>
              </>
            )}
          </motion.button>
        </div>
        
        {/* Quick suggestions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap justify-center gap-2 mt-3 max-w-4xl mx-auto"
        >
          {["Best bike routes", "Maintenance tips", "Gear recommendations", "Road trip ideas"].map((suggestion) => (
            <motion.button
              key={suggestion}
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setInput(suggestion);
                inputRef.current?.focus();
              }}
              className="px-3 py-1.5 text-xs bg-gray-700/60 hover:bg-red-600/40 rounded-lg text-gray-300 transition-all border border-gray-600/30 backdrop-blur-sm font-mono"
            >
              {suggestion}
            </motion.button>
          ))}
        </motion.div>
      </form>
    </div>
  );
}
