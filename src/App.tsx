const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Você é a Sofia, recepcionista virtual da Clínica Odontológica Sorriso Premium — clínica de alto padrão especializada em estética dental, implantes, ortodontia invisível (Invisalign), facetas e harmonização orofacial.

PERSONALIDADE:
- Acolhedora, calorosa, profissional e humanizada. Fala como uma pessoa real, não como robô.
- Use o primeiro nome do paciente sempre que possível.
- Use emojis com moderação (😊, ✨, 🦷) para humanizar.
- Mensagens curtas, no estilo WhatsApp. Quebre informações longas em várias bolhas mentais (separe com \\n\\n).
- Nunca diga que é uma IA. Você é a Sofia da recepção.

INFORMAÇÕES DA CLÍNICA:
- Endereço: Av. Brigadeiro Faria Lima, 2000, Jardim Paulistano, São Paulo
- Horário: Seg a Sex 8h-19h, Sáb 9h-14h
- Convênios: NÃO atendemos convênio. Trabalhamos com particular e parcelamos em até 12x no cartão.
- Avaliação inicial: R$ 250 (deduzidos do tratamento se fechar)
- Especialidades: Implantes (R$ 4.500-7.000 por elemento), Invisalign (R$ 18.000-35.000), Facetas em porcelana (R$ 2.800-3.500 por dente), Clareamento (R$ 1.800), Harmonização (a partir de R$ 1.500).

PROCESSO DE ATENDIMENTO (siga nesta ordem, UMA pergunta por vez):
1. Cumprimente e pergunte o nome do paciente.
2. Pergunte qual procedimento ou queixa principal o trouxe à clínica.
3. QUALIFICAÇÃO — descubra de forma natural e gentil:
   - Há quanto tempo está pensando em fazer o tratamento (urgência).
   - Se já fez avaliação em outro lugar (consciência do problema).
   - Informe transparentemente que somos particular (sem convênio) e confirme se tudo bem prosseguir.
   - Pergunte como ouviu falar da clínica.
4. Se o paciente NÃO aceitar particular ou claramente não tem fit (ex: só quer convênio, busca preço muito abaixo), seja gentil, ofereça materiais informativos e encerre educadamente sem agendar.
5. Se QUALIFICADO: ofereça agendamento de avaliação. Use a ferramenta get_available_slots para mostrar horários reais.
6. Quando o paciente escolher um horário, peça telefone e e-mail para confirmar.
7. Use a ferramenta book_appointment para confirmar. Depois envie mensagem de confirmação carinhosa com todos os detalhes.

REGRAS CRÍTICAS:
- NUNCA invente horários — sempre chame get_available_slots antes de oferecer datas.
- NUNCA confirme agendamento sem chamar book_appointment.
- Uma pergunta por mensagem. Não despeje formulário.
- Se perguntarem preço, dê a faixa real e explique que o valor exato depende da avaliação.`;

// Mock available slots — generates next 5 business days
function getSlots() {
  const slots: { id: string; date: string; time: string; label: string }[] = [];
  const times = ["09:00", "10:30", "14:00", "15:30", "17:00"];
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const now = new Date();
  let added = 0;
  for (let i = 1; added < 5 && i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    if (d.getDay() === 0) continue; // skip Sunday
    const t = times[added % times.length];
    slots.push({
      id: `${d.toISOString().slice(0, 10)}_${t}`,
      date: d.toISOString().slice(0, 10),
      time: t,
      label: `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} às ${t}`,
    });
    added++;
  }
  return slots;
}

function runTool(name: string, _args: Record<string, unknown>) {
  if (name === "get_available_slots") {
    return { slots: getSlots() };
  }
  if (name === "book_appointment") {
    const code = "AG-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    return {
      success: true,
      confirmation_code: code,
      message: `Agendamento confirmado com código ${code}. Endereço: Av. Brigadeiro Faria Lima, 2000 - Jardim Paulistano, São Paulo. Avaliação inicial: R$ 250 (deduzidos do tratamento). Chegue 10 minutos antes. Em caso de imprevisto, avise com 24h de antecedência.`,
    };
  }
  return { error: "unknown tool" };
}

// ---------- Gemini tool declarations ----------
const geminiTools = [
  {
    functionDeclarations: [
      {
        name: "get_available_slots",
        description: "Retorna os próximos horários disponíveis para avaliação inicial na clínica.",
        parameters: { type: "OBJECT", properties: {}, required: [] },
      },
      {
        name: "book_appointment",
        description: "Confirma o agendamento da avaliação inicial do paciente.",
        parameters: {
          type: "OBJECT",
          properties: {
            patient_name: { type: "STRING", description: "Nome completo do paciente" },
            phone: { type: "STRING", description: "Telefone do paciente" },
            email: { type: "STRING", description: "E-mail do paciente (opcional)" },
            slot_id: { type: "STRING", description: "ID do horário retornado por get_available_slots" },
            procedure_interest: { type: "STRING", description: "Procedimento de interesse do paciente" },
          },
          required: ["patient_name", "phone", "slot_id", "procedure_interest"],
        },
      },
    ],
  },
];

// ---------- Convert OpenAI-style messages → Gemini contents ----------
function toGeminiContents(messages: { role: string; content: string }[]) {
  // Filter out system messages (handled separately) and tool messages
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada no Supabase.");

    const model = "gemini-2.0-flash";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    // Build Gemini conversation history
    let contents = toGeminiContents(messages);

    // Tool loop (max 4 iterations)
    for (let i = 0; i < 4; i++) {
      const body = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        tools: geminiTools,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      };

      const resp = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("Gemini error", resp.status, errText);

        if (resp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Muitas mensagens simultâneas. Aguarde um instante e tente novamente 😊" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ error: "Erro interno. Por favor, tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await resp.json();
      const candidate = data.candidates?.[0];
      if (!candidate) throw new Error("Nenhuma resposta do Gemini.");

      const parts = candidate.content?.parts ?? [];

      // Check for function calls
      const funcCalls = parts.filter((p: { functionCall?: unknown }) => p.functionCall);

      if (funcCalls.length > 0) {
        // Add model turn with function call
        contents.push({ role: "model", parts });

        // Execute tools and add results
        const toolResultParts = funcCalls.map((p: { functionCall: { name: string; args: Record<string, unknown> } }) => {
          const result = runTool(p.functionCall.name, p.functionCall.args ?? {});
          return {
            functionResponse: {
              name: p.functionCall.name,
              response: result,
            },
          };
        });

        contents.push({ role: "user", parts: toolResultParts });
        continue;
      }

      // Text response
      const text = parts
        .filter((p: { text?: string }) => p.text)
        .map((p: { text: string }) => p.text)
        .join("");

      return new Response(
        JSON.stringify({ reply: text || "Desculpe, não consegui processar sua mensagem." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ reply: "Desculpe, vou te encaminhar para um atendente humano. 😊" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
