import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function App() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hey rider! 🏍️ I'm ThrottleBot, your motorized companion! Ready to rev up some conversation?" },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto scroll bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
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
      let text = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          text += decoder.decode(value);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].text = text;
            return updated;
          });
        }
      }
    } catch (err) {
      setMessages((prev) => [...prev, { sender: "bot", text: "🛑 Engine trouble! Try again 🔧" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen text-white font-sans relative overflow-hidden">

      {/* Dark Blur Background (NEW) */}
      <div className="absolute inset-0 bg-[url('/motorcycle.jpg')] bg-cover bg-center opacity-40"></div>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

      {/* Accent glowing circles (kept but toned down) */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-red-700 opacity-20 blur-3xl rounded-full"></div>
      <div className="absolute -bottom-32 -left-20 w-72 h-72 bg-orange-600 opacity-20 blur-3xl rounded-full"></div>

      {/* Header */}
      <header className="relative py-6 bg-gradient-to-r from-red-600/80 via-orange-500/80 to-yellow-400/80 shadow-xl border-b border-red-500/40 text-center z-10">
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative flex items-center justify-center gap-3"
        >
          <span className="text-3xl">🏍️</span>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-yellow-200 tracking-wide">
            THROTTLEBOT
          </h1>
          <span className="text-3xl">🔧</span>
        </motion.div>

        <p className="text-sm text-white/80 mt-1">
          Your High-Octane AI Companion
        </p>
      </header>

      {/* Chat Area */}
      <main className="relative flex-1 overflow-y-auto p-6 space-y-6 z-10 scrollbar-thin scrollbar-thumb-red-500 scrollbar-track-transparent">

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-start max-w-lg space-x-3 ${msg.sender === "user" ? "flex-row-reverse space-x-reverse" : ""}`}>

                {/* Avatar */}
                <div className={`w-9 h-9 flex items-center justify-center rounded-full shadow-lg border
                  ${msg.sender === "user" ? "bg-gradient-to-br from-red-500 to-orange-600 border-red-400" :
                  "bg-gray-800 border-gray-600"}`}
                >
                  {msg.sender === "user" ? "👤" : "🤖"}
                </div>

                {/* Bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl border backdrop-blur-md shadow-md ${
                    msg.sender === "user"
                      ? "bg-red-600/80 border-red-400/40 text-white rounded-br-none"
                      : "bg-gray-900/70 border-gray-700/40 text-gray-100 rounded-bl-none"
                  }`}
                >
                  {msg.text || (
                    <div className="flex items-center gap-2">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-2 h-2 bg-red-400 rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-2 h-2 bg-orange-400 rounded-full" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-2 h-2 bg-yellow-400 rounded-full" />
                      <span className="text-sm text-red-300">Revving...</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={chatEndRef} />
      </main>

      {/* Input */}
      <form onSubmit={handleSend} className="relative p-4 bg-gray-900/80 backdrop-blur-xl border-t border-gray-700/50 z-10">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">

          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Type your message… 🏍️"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="w-full p-4 text-white bg-gray-800/80 border border-gray-600/50 rounded-xl focus:ring-2 focus:ring-red-500/60 outline-none transition-all pr-12 backdrop-blur-sm"
            />
            {!input && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                ⚡
              </span>
            )}
          </div>

          <motion.button
            type="submit"
            disabled={loading || !input.trim()}
            whileHover={{ scale: loading ? 1 : 1.05 }}
            className="px-6 py-4 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl shadow-md border border-red-400/40 disabled:opacity-40 font-mono tracking-wide flex items-center gap-2"
          >
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>REV 🏍️</>
            )}
          </motion.button>
        </div>

        {/* Quick Suggestions */}
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {["Best bike routes", "Maintenance tips", "Gear recommendations", "Road trip ideas"].map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setInput(s)}
              className="px-3 py-1.5 text-xs bg-gray-800/70 border border-gray-600/40 rounded-md hover:bg-red-600/40 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
