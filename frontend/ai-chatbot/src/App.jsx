import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello 👋 I'm your AI assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("https://ai-chatbot-fastapi-react.onrender.com/chat-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      let botMessage = { sender: "bot", text: "" };
      setMessages((prev) => [...prev, botMessage]);

      const reader = response.body.getReader();
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
            newMsgs[newMsgs.length - 1].text = accumulatedText;
            return newMsgs;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "❌ Error receiving streaming response." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-500 py-5 shadow-lg text-center text-2xl font-bold tracking-wide relative overflow-hidden">
        <motion.div
          animate={{ x: [0, 20, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute left-0 top-0 w-full h-full opacity-10"
        />
        🤖 Asstoast Assistant
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs md:max-w-md px-5 py-3 rounded-2xl shadow-lg whitespace-pre-wrap break-words border ${
                  msg.sender === "user"
                    ? "bg-blue-600/90 border-blue-500 text-white rounded-br-none hover:bg-blue-700 transition"
                    : "bg-gray-800/90 border-gray-700 text-gray-100 rounded-bl-none"
                }`}
              >
                {msg.text || (msg.sender === "bot" && (
                  <div className="flex items-center space-x-2 animate-pulse">
                    <span>Thinking</span>
                    <span className="flex space-x-1">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </main>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-3 p-4 border-t border-gray-800 bg-gray-900/80 backdrop-blur-lg sticky bottom-0 z-10"
      >
        <input
          type="text"
          className="flex-1 p-3 bg-gray-800/90 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 transition"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend(e)}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 shadow-md hover:shadow-blue-500/20"
        >
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
