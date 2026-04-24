export interface RunResult {
  ok: true;
  text: string;
  outputTokens: number;
  latencyMs: number;
}

export interface RunError {
  ok: false;
  message: string;
  latencyMs: number;
}

export type RunOutcome = RunResult | RunError;

type ChunkCb = (chunk: string) => void;

export async function runAnthropic(
  system: string,
  user: string,
  model: string,
  apiKey: string,
  onChunk: ChunkCb
): Promise<RunOutcome> {
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        stream: true,
        system: system || undefined,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return { ok: false, message: err?.error?.message ?? `HTTP ${res.status}`, latencyMs: Date.now() - t0 };
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let outputTokens = 0;
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const ev = JSON.parse(line.slice(6)) as {
            type: string;
            delta?: { type: string; text?: string };
            usage?: { output_tokens: number };
          };
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && ev.delta.text) {
            fullText += ev.delta.text;
            onChunk(ev.delta.text);
          }
          if (ev.type === "message_delta" && ev.usage) {
            outputTokens = ev.usage.output_tokens;
          }
        } catch {}
      }
    }

    return { ok: true, text: fullText, outputTokens, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unknown error", latencyMs: Date.now() - t0 };
  }
}

export async function runOpenAI(
  system: string,
  user: string,
  model: string,
  apiKey: string,
  onChunk: ChunkCb
): Promise<RunOutcome> {
  const t0 = Date.now();
  try {
    const messages: Array<{ role: string; content: string }> = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: user });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, max_tokens: 1024, stream: true, messages }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return { ok: false, message: err?.error?.message ?? `HTTP ${res.status}`, latencyMs: Date.now() - t0 };
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let outputTokens = 0;
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
        try {
          const ev = JSON.parse(line.slice(6)) as {
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: { completion_tokens: number };
          };
          const chunk = ev.choices?.[0]?.delta?.content;
          if (chunk) { fullText += chunk; onChunk(chunk); }
          if (ev.usage?.completion_tokens) outputTokens = ev.usage.completion_tokens;
        } catch {}
      }
    }

    return { ok: true, text: fullText, outputTokens, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unknown error", latencyMs: Date.now() - t0 };
  }
}

export async function runGoogle(
  system: string,
  user: string,
  model: string,
  apiKey: string,
  onChunk: ChunkCb
): Promise<RunOutcome> {
  const t0 = Date.now();
  try {
    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: 1024 },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return { ok: false, message: err?.error?.message ?? `HTTP ${res.status}`, latencyMs: Date.now() - t0 };
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    let outputTokens = 0;
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const ev = JSON.parse(line.slice(6)) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            usageMetadata?: { candidatesTokenCount?: number };
          };
          const chunk = ev.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunk) { fullText += chunk; onChunk(chunk); }
          if (ev.usageMetadata?.candidatesTokenCount) {
            outputTokens = ev.usageMetadata.candidatesTokenCount;
          }
        } catch {}
      }
    }

    return { ok: true, text: fullText, outputTokens, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Unknown error", latencyMs: Date.now() - t0 };
  }
}
