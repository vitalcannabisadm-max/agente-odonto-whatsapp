import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, CheckCheck, Phone, Video, MoreVertical, ArrowLeft, Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; time: string };

function now() {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const INITIAL: Msg = {
  role: "assistant",
  content:
    "Olá! 😊 Aqui é a Sofia da *Clínica Sorriso Premium*. Que bom ter você por aqui!\n\nPara começarmos seu atendimento, como posso te chamar?",
  time: now(),
};

export default function App() {
  const [messages, setMessages] = useState<Msg[]>([INITIAL]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function send() {
    const text = input.trim();
    if (!text || typing) return;
    const userMsg: Msg = { role: "user", content: text, time: now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke("dental-agent", {
        body: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      const reply =
        (data as any)?.reply || (data as any)?.error || "Desculpe, tive um problema. Pode repetir?";
      setMessages((prev) => [...prev, { role: "assistant", content: reply, time: now() }]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Tive um problema de conexão. Pode tentar novamente?", time: now() },
      ]);
    } finally {
      setTyping(false);
    }
  }

  function renderText(t: string) {
    const parts = t.split(/(\*[^*]+\*)/g);
    return parts.map((p, i) =>
      p.startsWith("*") && p.endsWith("*") ? (
        <strong key={i}>{p.slice(1, -1)}</strong>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black flex flex-col items-center justify-center p-4 gap-6">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-violet-600/25 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-violet-700/15 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <header className="text-center max-w-md relative z-10">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-sm">
          <span className="text-base font-extrabold tracking-tight">
            <span className="text-white">Ninja</span>
            <span className="text-violet-400">Sites</span>
          </span>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-violet-300 text-xs font-medium mb-3">
          <Sparkles className="w-3 h-3" /> Demo · Agente de IA para WhatsApp
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Clínica <span className="text-violet-400">Sorriso Premium</span>
        </h1>
        <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
          Converse com a Sofia, recepcionista virtual. Ela qualifica, tira dúvidas e agenda sua avaliação.
        </p>
      </header>

      {/* Phone frame */}
      <div className="relative z-10">
        <div className="absolute -inset-4 bg-violet-600/30 rounded-[3rem] blur-2xl" />
        <div className="relative w-full max-w-[400px] h-[680px] bg-black rounded-[2.5rem] p-3 shadow-2xl ring-1 ring-white/10">
        <div className="w-full h-full bg-[#0b141a] rounded-[2rem] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-[#202c33] text-white px-3 py-2.5 flex items-center gap-3 shrink-0">
            <ArrowLeft className="w-5 h-5" />
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-semibold">
              S
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">Sorriso Premium</div>
              <div className="text-xs text-emerald-300 truncate">{typing ? "digitando…" : "online"}</div>
            </div>
            <Video className="w-5 h-5" />
            <Phone className="w-5 h-5" />
            <MoreVertical className="w-5 h-5" />
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 py-4 space-y-2"
            style={{
              backgroundColor: "#0b141a",
              backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm shadow whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-[#005c4b] text-white rounded-tr-none"
                      : "bg-[#202c33] text-slate-100 rounded-tl-none"
                  }`}
                >
                  <div className="leading-relaxed">{renderText(m.content)}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] text-slate-400">
                    {m.time}
                    {m.role === "user" && <CheckCheck className="w-3 h-3 text-sky-400" />}
                  </div>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-[#202c33] rounded-lg rounded-tl-none px-4 py-3 flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <span
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="bg-[#202c33] px-2 py-2 flex items-center gap-2 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Mensagem"
              className="flex-1 bg-[#2a3942] text-white text-sm rounded-full px-4 py-2.5 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={send}
              disabled={!input.trim() || typing}
              className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center transition"
              aria-label="Enviar"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
        </div>
      </div>

      <footer className="text-xs text-neutral-400 text-center max-w-md space-y-2 relative z-10">
        <p className="leading-relaxed">
          Demonstração interativa. A Sofia consegue qualificar pacientes, informar valores, oferecer horários reais e
          confirmar agendamentos.
        </p>
        <p className="flex items-center justify-center gap-1.5 text-neutral-500">
          Feito por{" "}
          <span className="font-extrabold tracking-tight">
            <span className="text-white">Ninja</span>
            <span className="text-violet-400">Sites</span>
          </span>
        </p>
      </footer>
    </div>
  );
}
