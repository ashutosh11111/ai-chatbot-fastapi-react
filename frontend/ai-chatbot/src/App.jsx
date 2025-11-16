import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Constants
const API_BASE_URL = "https://ai-chatbot-fastapi-react.onrender.com";
const MAX_INPUT_LENGTH = 1000;
const STORAGE_KEY = 'throttlebot_messages';

// Unique ID generator
const generateUniqueId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Typing indicators with different motorcycle sounds
const TYPING_INDICATORS = [
  "Revving up the engine... 🏍️",
  "Shifting gears... ⚙️",
  "Checking the road ahead... 🛣️",
  "Fueling up ideas... ⛽",
  "Tuning the response... 🎛️"
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [typingIndicator, setTypingIndicator] = useState(TYPING_INDICATORS[0]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Generate or retrieve session ID
  const [sessionId] = useState(() => {
    const storedSessionId = localStorage.getItem('throttlebot_session_id');
    if (storedSessionId) return storedSessionId;
    
    const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('throttlebot_session_id', newSessionId);
    return newSessionId;
  });

  // Initialize with welcome message after component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEY);
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          const messagesWithUniqueIds = parsedMessages.map(msg => ({
            ...msg,
            id: msg.id || generateUniqueId()
          }));
          setMessages(messagesWithUniqueIds);
          return;
        }
      } catch (err) {
        console.error("Error loading saved messages:", err);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    
    // Only set welcome message if no saved messages
    setMessages([
      { 
        id: generateUniqueId(),
        sender: "bot", 
        text: "Hey rider! 🏍️ I'm ThrottleBot, your motorized companion! Ready to rev up some conversation?",
        timestamp: new Date().toISOString()
      },
    ]);
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addSystemMessage("Connection restored! You're back online. 🌐");
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      addSystemMessage("You're offline. Some features may be limited. 📵");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Improved Auto scroll to bottom - scroll on every message update
  useEffect(() => {
    const scrollToBottom = () => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ 
          behavior: "smooth",
          block: "end"
        });
      }
    };

    // Scroll immediately when messages change
    scrollToBottom();
    
    // Also set a timeout to catch any DOM updates
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages]);

  // Track if user is near bottom to decide whether to auto-scroll
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (chatContainer) {
      const handleScroll = () => {
        const scrollTop = chatContainer.scrollTop;
        const scrollHeight = chatContainer.scrollHeight;
        const clientHeight = chatContainer.clientHeight;
        
        // User is near bottom if within 100px of bottom
        const nearBottom = scrollHeight - scrollTop - clientHeight <= 100;
        setIsNearBottom(nearBottom);
        
        if (nearBottom) {
          setUnreadCount(0);
        }
      };

      chatContainer.addEventListener('scroll', handleScroll);
      return () => chatContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Rotate typing indicators
  useEffect(() => {
    if (isThinking) {
      const interval = setInterval(() => {
        setTypingIndicator(prev => {
          const currentIndex = TYPING_INDICATORS.indexOf(prev);
          const nextIndex = (currentIndex + 1) % TYPING_INDICATORS.length;
          return TYPING_INDICATORS[nextIndex];
        });
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isThinking]);

  const addSystemMessage = (text) => {
    const systemMessage = {
      id: generateUniqueId(),
      sender: "system",
      text: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const clearChat = () => {
    setMessages([
      { 
        id: generateUniqueId(),
        sender: "bot", 
        text: "Hey rider! 🏍️ I'm ThrottleBot, your motorized companion! Ready to rev up some conversation?",
        timestamp: new Date().toISOString()
      },
    ]);
    localStorage.removeItem(STORAGE_KEY);
    
    const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('throttlebot_session_id', newSessionId);
    addSystemMessage("Chat history cleared. New session started. 🔄");
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "end"
    });
    setUnreadCount(0);
    setIsNearBottom(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const sanitizedInput = input.trim().slice(0, MAX_INPUT_LENGTH);
    if (!sanitizedInput || loading) return;

    const userMessage = { 
      id: generateUniqueId(),
      sender: "user", 
      text: sanitizedInput,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsThinking(true);

    // Check if user is near bottom to show new message indicator
    if (!isNearBottom) {
      setUnreadCount(prev => prev + 1);
    }

    const thinkingMessage = { 
      id: generateUniqueId(),
      sender: "bot", 
      text: "", 
      isThinking: true,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, thinkingMessage]);

    let reader;
    try {
      const response = await fetch(`${API_BASE_URL}/chat-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: sanitizedInput,
          session_id: sessionId
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      setIsThinking(false);
      
      const botMessageId = generateUniqueId();
      setMessages((prev) => {
        const newMsgs = prev.slice(0, -1);
        return [
          ...newMsgs,
          { 
            id: botMessageId,
            sender: "bot", 
            text: "",
            timestamp: new Date().toISOString()
          }
        ];
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
            const lastMessageIndex = newMsgs.length - 1;
            
            if (newMsgs[lastMessageIndex]?.sender === "bot") {
              newMsgs[lastMessageIndex] = { 
                ...newMsgs[lastMessageIndex],
                text: accumulatedText 
              };
            }
            return newMsgs;
          });

          // Auto-scroll during streaming if user is near bottom
          if (isNearBottom) {
            setTimeout(() => {
              chatEndRef.current?.scrollIntoView({ 
                behavior: "smooth",
                block: "end"
              });
            }, 50);
          }
        }
      }
    } catch (err) {
      console.error("API Error:", err);
      setIsThinking(false);
      
      setMessages((prev) => {
        const newMsgs = prev.slice(0, -1);
        return [
          ...newMsgs,
          { 
            id: generateUniqueId(),
            sender: "bot", 
            text: "🛑 Engine trouble! Connection lost. Try revving it up again! 🔧",
            timestamp: new Date().toISOString()
          }
        ];
      });
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Thinking animation component
  const ThinkingAnimation = () => (
    <div className="flex flex-col space-y-2">
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
      </div>
      <span className="text-red-300 text-xs font-medium">{typingIndicator}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-red-900/10 to-gray-800 text-white font-sans relative overflow-hidden">
      {/* Enhanced background with moving elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ 
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 20,
            ease: "linear" 
          }}
          className="absolute top-1/4 -left-20 w-40 h-40 bg-red-600/10 rounded-full mix-blend-overlay filter blur-xl"
        />
        <motion.div
          animate={{ 
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 25,
            ease: "linear",
            delay: 5
          }}
          className="absolute bottom-1/4 -right-20 w-60 h-60 bg-orange-500/10 rounded-full mix-blend-overlay filter blur-xl"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 to-transparent" />
      </div>

      {/* Enhanced Header */}
      <header className="relative bg-gradient-to-r from-red-600 via-orange-500 to-yellow-400 py-3 sm:py-4 shadow-2xl z-20 border-b-2 border-red-400/30">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-md"></div>
        
        <div className="relative max-w-6xl mx-auto px-3 sm:px-4 flex items-center justify-between">
          {/* Mobile menu button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-black/20 backdrop-blur-sm border border-white/20"
          >
            <div className="w-5 h-5 flex flex-col justify-center space-y-1">
              <motion.div 
                animate={{ rotate: isMobileMenuOpen ? 45 : 0, y: isMobileMenuOpen ? 5 : 0 }}
                className="w-full h-0.5 bg-white rounded"
              />
              <motion.div 
                animate={{ opacity: isMobileMenuOpen ? 0 : 1 }}
                className="w-full h-0.5 bg-white rounded"
              />
              <motion.div 
                animate={{ rotate: isMobileMenuOpen ? -45 : 0, y: isMobileMenuOpen ? -5 : 0 }}
                className="w-full h-0.5 bg-white rounded"
              />
            </div>
          </motion.button>

          {/* Logo and Title */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center space-x-2 sm:space-x-3"
          >
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="text-2xl sm:text-3xl"
            >
              🏍️
            </motion.div>
            <div className="text-center">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-yellow-200 tracking-tight font-mono">
                THROTTLEBOT
              </h1>
              <motion.p 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-white/90 font-light tracking-wide hidden sm:block"
              >
                AI-Powered Motorcycle Assistant
              </motion.p>
            </div>
          </motion.div>

          {/* Desktop Controls */}
          <div className="hidden lg:flex items-center space-x-3">
            {!isOnline && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center space-x-2 bg-red-500/90 px-3 py-1.5 rounded-full text-sm backdrop-blur-sm border border-red-400/50"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span>Offline</span>
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearChat}
              className="bg-black/30 hover:bg-red-600/80 px-3 py-2 rounded-xl text-sm font-medium backdrop-blur-sm border border-white/20 transition-all duration-300"
            >
              New Chat
            </motion.button>
          </div>

          {/* Mobile connection status */}
          <div className="lg:hidden">
            {!isOnline && (
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-black/30 backdrop-blur-xl border-t border-white/10"
            >
              <div className="px-3 py-2 space-y-2">
                <button
                  onClick={clearChat}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
                >
                  🆕 New Chat
                </button>
                <div className="px-3 py-1 text-xs text-white/70">
                  Status: {isOnline ? "Online 🌐" : "Offline 📵"}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10 min-h-0">
        {/* Unread messages indicator */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onClick={scrollToBottom}
              className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30 bg-gradient-to-r from-red-600 to-orange-500 px-3 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm border border-red-400/50 hover:scale-105 transition-transform"
            >
              📨 {unreadCount} new message{unreadCount > 1 ? 's' : ''}
            </motion.button>
          )}
        </AnimatePresence>

        {/* Chat Messages */}
        <main 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-red-600/50 scrollbar-track-transparent"
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center text-gray-400"
              >
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🏍️</div>
                <p className="text-base sm:text-lg">Start a conversation with ThrottleBot!</p>
              </motion.div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} ${msg.sender === "system" ? "justify-center" : ""}`}
                >
                  {msg.sender === "system" ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-gray-800/50 text-gray-400 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm border border-gray-600/30 max-w-xs text-center"
                    >
                      {msg.text}
                    </motion.div>
                  ) : (
                    <div className={`flex items-start space-x-2 sm:space-x-3 max-w-[90%] xs:max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl ${msg.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>
                      {/* Avatar */}
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-lg border backdrop-blur-sm ${
                          msg.sender === "user" 
                            ? "bg-gradient-to-br from-red-500 to-orange-500 border-red-400" 
                            : "bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600"
                        }`}
                      >
                        {msg.sender === "user" ? "👤" : "🤖"}
                      </motion.div>
                      
                      {/* Message Bubble */}
                      <div className="flex flex-col space-y-1 flex-1 min-w-0">
                        <motion.div
                          whileHover={{ scale: 1.01 }}
                          className={`px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-xl backdrop-blur-sm border-2 break-words ${
                            msg.sender === "user"
                              ? "bg-gradient-to-br from-red-600 to-orange-500 text-white rounded-br-none border-red-400/50"
                              : "bg-gray-800/80 border-gray-600/50 text-gray-100 rounded-bl-none"
                          }`}
                        >
                          {msg.sender === "bot" && !msg.text && isThinking ? (
                            <ThinkingAnimation />
                          ) : msg.text ? (
                            <div className="text-sm sm:text-base">{msg.text}</div>
                          ) : (
                            <ThinkingAnimation />
                          )}
                        </motion.div>
                        
                        {/* Improved Timestamp - More visible */}
                        {msg.timestamp && (
                          <div className={`text-xs font-medium px-2 mt-1 ${
                            msg.sender === "user" 
                              ? "text-right text-yellow-200/90" 
                              : "text-left text-gray-200/90"
                          }`}>
                            {formatTime(msg.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          <div ref={chatEndRef} className="h-2 sm:h-4" />
        </main>

        {/* Input Area - Clean without suggestions */}
        <div className="bg-gray-900/50 backdrop-blur-xl border-t border-gray-600/30 z-10 safe-area-padding-bottom">
          <div className="max-w-4xl mx-auto p-3 sm:p-4">
            <form onSubmit={handleSend} className="flex gap-2 sm:gap-3 items-center">
              {/* Input Container */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full h-12 sm:h-14 px-3 sm:px-4 bg-gray-800/80 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 placeholder-gray-400 transition-all duration-300 border-2 border-gray-600/50 backdrop-blur-sm font-sans text-sm sm:text-base"
                    placeholder="Ask me anything about motorcycles... 🏍️"
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LENGTH))}
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    aria-label="Type your message to ThrottleBot"
                  />
                  {!input && (
                    <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                      ⚡
                    </div>
                  )}
                </div>
                
                {/* Character count */}
                {input.length > 0 && (
                  <div className={`text-right mt-1 text-xs ${
                    input.length > MAX_INPUT_LENGTH * 0.9 ? 'text-red-400' : 
                    input.length > MAX_INPUT_LENGTH * 0.8 ? 'text-orange-300' : 'text-gray-500'
                  }`}>
                    {input.length}/{MAX_INPUT_LENGTH}
                  </div>
                )}
              </div>
              
              {/* Send Button */}
              <motion.button
                type="submit"
                disabled={loading || !input.trim()}
                whileHover={{ scale: loading || !input.trim() ? 1 : 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 px-4 sm:px-6 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/25 flex items-center space-x-2 min-w-[80px] sm:min-w-[100px] justify-center border-2 border-red-400/30 disabled:border-gray-600/30 font-mono tracking-wide text-sm sm:text-base h-12 sm:h-14"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    <span className="hidden xs:inline">SEND</span>
                    <span className="xs:hidden">▶</span>
                    <motion.span
                      animate={{ x: [0, 2, 0] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="hidden sm:inline"
                    >
                      🏍️
                    </motion.span>
                  </>
                )}
              </motion.button>
            </form>

            {/* Feature tips - Minimal version */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <span>⏎</span>
                <span className="hidden sm:inline">Enter to send</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🔄</span>
                <span className="hidden sm:inline">Remembers context</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
