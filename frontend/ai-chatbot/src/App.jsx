import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello 👋 I'm your AI assistant. How can I help you today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/chat-stream", {
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
      <header className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 py-4 shadow-lg text-center text-xl font-bold tracking-wide">
        🤖 Asstoast Assistant
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl backdrop-blur-md shadow-md whitespace-pre-wrap border ${
                  msg.sender === "user"
                    ? "bg-blue-600/80 border-blue-500 text-white rounded-br-none"
                    : "bg-gray-800/80 border-gray-700 text-gray-100 rounded-bl-none"
                }`}
              >
                {msg.text || (msg.sender === "bot" && (
                  <div className="flex items-center space-x-2">
                    <span>Thinking</span>
                    <span className="flex space-x-1">
                      <span className="animate-pulse">.</span>
                      <span className="animate-pulse delay-150">.</span>
                      <span className="animate-pulse delay-300">.</span>
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* Input Area */}
      <form
        onSubmit={handleSend}
        className="flex items-center gap-3 p-4 border-t border-gray-800 bg-gray-900/80 backdrop-blur-lg"
      >
        <input
          type="text"
          className="flex-1 p-3 bg-gray-800/90 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
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
