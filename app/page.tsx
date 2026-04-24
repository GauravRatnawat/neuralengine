"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ModelPicker from "@/components/ModelPicker";
import { MODELS } from "@/lib/models";
import { estimateTokens, costFor, fmtCost, type Cost } from "@/lib/tokens";
import { wordDiff } from "@/lib/diff";
import { parseMarkdown } from "@/lib/markdown";
import { readShareParam, writeShareHash } from "@/lib/share";
import { runAnthropic, runOpenAI, runGoogle } from "@/lib/api";

// ─── Seed content ─────────────────────────────────────────────────────────────

const SEED_SYSTEM = `You are a senior technical writer. Explain concepts with precision, brevity, and concrete examples. Prefer lists when appropriate. Never hedge.`;

const SEED_USER_A = `Explain vector embeddings to a backend engineer who knows databases but not ML.

Use at most 3 paragraphs and include one SQL-style analogy.`;

const SEED_USER_B = `Explain vector embeddings to a backend engineer who knows databases but not ML.

Use at most 3 paragraphs, include one SQL-style analogy, and end with a one-line tl;dr.`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Meta {
  latency: number;
  outTok: number;
  actualCost: number;
}

type RunStatus = "idle" | "running" | "done";

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadKey(k: string): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(k) ?? "";
}
function saveKey(k: string, v: string): void {
  localStorage.setItem(k, v);
}

// ─── Markdown output (no dangerouslySetInnerHTML) ─────────────────────────────

function MarkdownOutput({ text, streaming }: { text: string; streaming: boolean }) {
  const paras = parseMarkdown(text);
  if (!text && !streaming) return null;
  if (text.length === 0 && streaming) {
    return <span className="caret" />;
  }
  return (
    <>
      {paras.map((para, i) => {
        const isLast = i === paras.length - 1;
        return (
          <p key={i}>
            {para.nodes}
            {streaming && isLast ? <span className="caret" /> : null}
          </p>
        );
      })}
    </>
  );
}

// ─── Prompt diff overlay ──────────────────────────────────────────────────────

function PromptOverlay({ a, b }: { a: string; b: string }) {
  if (!a || !b || a === b) return null;
  const diff = wordDiff(a, b);
  return (
    <div className="prompt-overlay" aria-hidden="true">
      {diff.map((d, i) => {
        if (d.t === "same") return <span key={i}>{d.s}</span>;
        if (d.t === "add") return <span key={i} className="add">{d.s}</span>;
        return null;
      })}
    </div>
  );
}

// ─── Variant column ───────────────────────────────────────────────────────────

interface VariantProps {
  side: "A" | "B";
  system: string;
  user: string;
  onSystem: (v: string) => void;
  onUser: (v: string) => void;
  model: string;
  onModel: (v: string) => void;
  tokens: number;
  cost: Cost;
  compareUser?: string;
  output: string;
  streaming: boolean;
  done: boolean;
  meta: Partial<Meta>;
  diffMode: boolean;
  otherFinal: string;
  onBack: () => void;
}

function Variant({
  side, system, user, onSystem, onUser, model, onModel,
  tokens, cost, compareUser, output, streaming, done,
  meta, diffMode, otherFinal, onBack,
}: VariantProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const showOutput = streaming || (!!output && !diffMode);
  const showDiff = diffMode && !!output;
  const isLeft = side === "A";
  const estOutTok = Math.max(80, Math.round(tokens * 0.8));

  useEffect(() => {
    if (bodyRef.current && streaming) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [output, streaming]);

  let diffStats: { adds: number; rms: number } | null = null;
  if (side === "B" && compareUser && compareUser !== user) {
    const diff = wordDiff(compareUser, user);
    diffStats = {
      adds: diff.filter(d => d.t === "add").length,
      rms: diff.filter(d => d.t === "rm").length,
    };
  }

  const outputDiff = showDiff && otherFinal ? wordDiff(
    isLeft ? output : otherFinal,
    isLeft ? otherFinal : output
  ) : null;

  const modelName = MODELS.find(m => m.id === model)?.name ?? model;

  return (
    <div className={`variant ${isLeft ? "left" : "right"}`}>
      {/* Header */}
      <div className="var-head">
        <div className="var-mark">{side}.</div>
        <div className="var-model">
          <span className="var-model-label">via</span>
          <ModelPicker value={model} onChange={onModel} side={side} />
        </div>
        <div className="var-tokens">
          <b>{tokens.toLocaleString()}</b>
          input tokens
        </div>
      </div>

      {/* Prompts */}
      <div className="prompt-body">
        <div>
          <div className="prompt-label"><span>system</span></div>
          <div className="prompt-sys-wrap">
            <textarea
              className="prompt-sys"
              value={system}
              onChange={e => onSystem(e.target.value)}
              placeholder="Set the tone, the persona, the constraints…"
              spellCheck={false}
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div className="prompt-label">
            <span>prompt</span>
            {diffStats && (
              <span className="diff-chip">
                <span className="add">+{diffStats.adds}</span>
                {" "}
                <span className="rm">−{diffStats.rms}</span>
                {" "}
                <span style={{ color: "var(--ink-4)" }}>vs A</span>
              </span>
            )}
          </div>
          <div className="prompt-user-wrap">
            <textarea
              className="prompt-user"
              value={user}
              onChange={e => onUser(e.target.value)}
              placeholder="Ask your question…"
              spellCheck={false}
              style={{ position: "relative", zIndex: 1 }}
            />
            {side === "B" && compareUser && <PromptOverlay a={compareUser} b={user} />}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="var-foot">
        <div>
          <div className="f-label">cost, est.</div>
          <div className="f-val">{fmtCost(cost.total)}<span className="u">per run</span></div>
        </div>
        <div>
          <div className="f-label">{done && meta.latency ? "latency" : "output tokens, est."}</div>
          <div className="f-val" style={{ textAlign: "right" }}>
            {done && meta.latency
              ? <>{(meta.latency / 1000).toFixed(2)}<span className="u">sec</span></>
              : <>{estOutTok.toLocaleString()}<span className="u">tok</span></>
            }
          </div>
        </div>
      </div>

      {/* Output overlay */}
      <div className={`output-scroll${showOutput || showDiff ? " shown" : ""}`}>
        <div className="output-top">
          <span className="eyebrow">{side}. response</span>
          <span className="meta">
            {meta.latency ? <><span className="serif">{(meta.latency / 1000).toFixed(2)}</span>s · </> : null}
            {meta.outTok ? <><span className="serif">{meta.outTok}</span> tok · </> : null}
            {meta.actualCost ? fmtCost(meta.actualCost) : ""}
          </span>
          <button className="back-link" onClick={onBack}>edit prompt →</button>
        </div>
        <div className="output-title">{modelName} says:</div>
        <div ref={bodyRef} className="output-body">
          {outputDiff ? (
            outputDiff.map((d, i) => {
              if (d.t === "same") return <span key={i} className="diff-same">{d.s}</span>;
              if (isLeft) return d.t === "rm" ? <span key={i} className="diff-rm">{d.s}</span> : null;
              return d.t === "add" ? <span key={i} className="diff-add">{d.s}</span> : null;
            })
          ) : (
            <MarkdownOutput text={output} streaming={streaming} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Receipt ──────────────────────────────────────────────────────────────────

interface ReceiptProps {
  status: RunStatus;
  tokA: number; tokB: number;
  costA: Cost; costB: Cost;
  latA: number; latB: number;
  finalA: string; finalB: string;
  modelA: string; modelB: string;
}

function Receipt({ status, tokA, tokB, costA, costB, latA, latB, finalA, finalB, modelA, modelB }: ReceiptProps) {
  const mA = MODELS.find(m => m.id === modelA);
  const mB = MODELS.find(m => m.id === modelB);

  if (status === "idle") {
    const same = tokA === tokB;
    return (
      <div className="receipt idle">
        {same
          ? "Tweak one side and the ledger will come alive."
          : <><span className="num" style={{ color: "var(--ink-2)" }}>{Math.abs(tokB - tokA)}</span>-token delta detected. <span className="dim">Ready when you are.</span></>
        }
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="receipt" style={{ fontStyle: "italic", color: "var(--ink-3)" }}>
        Sending to <span className="hi-a">{mA?.short}</span> and <span className="hi-b">{mB?.short}</span>…
      </div>
    );
  }

  const costDelta = costB.total - costA.total;
  const costPct = costA.total > 0 ? (costDelta / costA.total) * 100 : 0;
  const latDelta = latB - latA;
  const latPct = latA > 0 ? (latDelta / latA) * 100 : 0;
  const aWords = (finalA || "").trim().split(/\s+/).filter(Boolean).length;
  const bWords = (finalB || "").trim().split(/\s+/).filter(Boolean).length;

  const cheaperSide = costDelta < -1e-9 ? "B" : costDelta > 1e-9 ? "A" : null;
  const fasterSide = latDelta < 0 ? "B" : latDelta > 0 ? "A" : null;
  const shorterSide = bWords < aWords ? "B" : aWords < bWords ? "A" : null;

  return (
    <div className="receipt">
      {cheaperSide ? (
        <>
          <span className={cheaperSide === "A" ? "hi-a" : "hi-b"}>{cheaperSide}</span> comes in{" "}
          <span className="num pos">{Math.abs(costPct).toFixed(0)}% cheaper</span>{" "}
          — <span className="num">{fmtCost(Math.abs(costDelta))}</span> less per run.{" "}
        </>
      ) : "Cost is a wash. "}
      {fasterSide && Math.abs(latPct) > 5 && (
        <>
          It lands in <span className="num">{(Math.min(latA, latB) / 1000).toFixed(2)}s</span>,{" "}
          <span className="num pos">{Math.abs(latPct).toFixed(0)}% faster</span> than{" "}
          <span className={fasterSide === "A" ? "hi-b" : "hi-a"}>{fasterSide === "A" ? "B" : "A"}</span>.{" "}
        </>
      )}
      {shorterSide
        ? <><span className={shorterSide === "A" ? "hi-a" : "hi-b"}>{shorterSide}</span>{`'s reply is `}<span className="num">{Math.abs(aWords - bWords)} words shorter</span>.</>
        : "Both replies are similar length."
      }
    </div>
  );
}

// ─── Rail ─────────────────────────────────────────────────────────────────────

interface RailProps {
  status: RunStatus;
  tokA: number; tokB: number;
  costA: Cost; costB: Cost;
  latA: number; latB: number;
  outTokA: number; outTokB: number;
}

function Rail({ status, tokA, tokB, costA, costB, latA, latB, outTokA, outTokB }: RailProps) {
  if (status !== "done") {
    return (
      <div className="rail">
        <div className="rail-empty">A ledger will appear here once both sides have replied.</div>
      </div>
    );
  }

  const rows = [
    { label: "input tokens",  a: tokA,       b: tokB,       fmt: (v: number) => v.toLocaleString() },
    { label: "output tokens", a: outTokA,    b: outTokB,    fmt: (v: number) => v.toLocaleString() },
    { label: "total cost",    a: costA.total, b: costB.total, fmt: (v: number) => fmtCost(v) },
    { label: "latency",       a: latA,       b: latB,       fmt: (v: number) => (v / 1000).toFixed(2) + "s" },
  ];

  return (
    <div className="rail">
      {rows.map(r => {
        const max = Math.max(r.a, r.b, 1e-9);
        const aPct = (r.a / max) * 100;
        const bPct = (r.b / max) * 100;
        const winner = r.b < r.a ? "b" : r.a < r.b ? "a" : null;
        return (
          <div className="rail-row" key={r.label}>
            <div className="r-label">
              <span>{r.label}</span>
              {winner && <span className={`winner ${winner}`}>{winner.toUpperCase()} lower</span>}
            </div>
            <div className="rail-bars">
              <span className="side a">A</span>
              <div className="bar"><div className="fill a" style={{ width: aPct + "%" }} /></div>
              <span className="num">{r.fmt(r.a)}</span>
            </div>
            <div className="rail-bars" style={{ marginTop: 4 }}>
              <span className="side b">B</span>
              <div className="bar"><div className="fill b" style={{ width: bPct + "%" }} /></div>
              <span className="num">{r.fmt(r.b)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const urlState = typeof window !== "undefined" ? readShareParam() : null;

  const [system, setSystem] = useState(urlState?.sys ?? SEED_SYSTEM);
  const [userA, setUserA] = useState(urlState?.a ?? SEED_USER_A);
  const [userB, setUserB] = useState(urlState?.b ?? SEED_USER_B);
  const [modelA, setModelA] = useState(urlState?.ma || "claude-sonnet-4-6");
  const [modelB, setModelB] = useState(urlState?.mb || "claude-sonnet-4-6");

  const [anthropicKey, setAnthropicKeyState] = useState(() => loadKey("ne_ant_key"));
  const [openaiKey, setOpenaiKeyState] = useState(() => loadKey("ne_oai_key"));
  const [googleKey, setGoogleKeyState] = useState(() => loadKey("ne_goog_key"));
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [keyInputA, setKeyInputA] = useState("");
  const [keyInputO, setKeyInputO] = useState("");
  const [keyInputG, setKeyInputG] = useState("");

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [diffMode, setDiffMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [status, setStatus] = useState<RunStatus>("idle");
  const [outA, setOutA] = useState("");
  const [outB, setOutB] = useState("");
  const [finalA, setFinalA] = useState("");
  const [finalB, setFinalB] = useState("");
  const [streamingA, setStreamingA] = useState(false);
  const [streamingB, setStreamingB] = useState(false);
  const [metaA, setMetaA] = useState<Partial<Meta>>({});
  const [metaB, setMetaB] = useState<Partial<Meta>>({});

  const promptAText = (system ? system + "\n\n" : "") + userA;
  const promptBText = (system ? system + "\n\n" : "") + userB;
  const tokA = estimateTokens(promptAText);
  const tokB = estimateTokens(promptBText);
  const costA = costFor(modelA, tokA, Math.max(80, Math.round(tokA * 0.8)));
  const costB = costFor(modelB, tokB, Math.max(80, Math.round(tokB * 0.8)));
  const apiKeySet = !!anthropicKey || !!openaiKey || !!googleKey;
  const done = status === "done";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    writeShareHash({ sys: system, a: userA, b: userB, ma: modelA, mb: modelB });
  }, [system, userA, userB, modelA, modelB]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function clearOutputs() {
    setOutA(""); setOutB(""); setFinalA(""); setFinalB("");
    setMetaA({}); setMetaB({});
    setStatus("idle");
    setStreamingA(false); setStreamingB(false);
    setDiffMode(false);
  }

  const getKey = useCallback((provider: "anthropic" | "openai" | "google") => {
    if (provider === "anthropic") return anthropicKey;
    if (provider === "openai") return openaiKey;
    return googleKey;
  }, [anthropicKey, openaiKey, googleKey]);

  const doRun = useCallback(async () => {
    if (status === "running") return;
    setStatus("running");
    setOutA(""); setOutB(""); setFinalA(""); setFinalB("");
    setMetaA({}); setMetaB({});
    setStreamingA(true); setStreamingB(true);

    const mA = MODELS.find(m => m.id === modelA)!;
    const mB = MODELS.find(m => m.id === modelB)!;

    async function runSide(
      mdl: typeof mA,
      sys: string,
      usr: string,
      appendOut: (chunk: string) => void,
      setStreaming: (v: boolean) => void,
      setFinal: (v: string) => void,
      setMeta: (v: Partial<Meta>) => void,
      inTok: number,
    ) {
      const key = getKey(mdl.provider);
      const runner = mdl.provider === "anthropic" ? runAnthropic : mdl.provider === "google" ? runGoogle : runOpenAI;
      const outcome = await runner(sys, usr, mdl.id, key, appendOut);
      setStreaming(false);
      if (outcome.ok) {
        setFinal(outcome.text);
        setMeta({
          latency: outcome.latencyMs,
          outTok: outcome.outputTokens,
          actualCost: costFor(mdl.id, inTok, outcome.outputTokens).total,
        });
      } else {
        setFinal(`Error: ${outcome.message}`);
        setMeta({ latency: outcome.latencyMs });
      }
    }

    await Promise.all([
      runSide(mA, system, userA, c => setOutA(p => p + c), setStreamingA, setFinalA, setMetaA, tokA),
      runSide(mB, system, userB, c => setOutB(p => p + c), setStreamingB, setFinalB, setMetaB, tokB),
    ]);

    setStatus("done");
  }, [status, modelA, modelB, system, userA, userB, tokA, tokB, getKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); doRun(); }
      if (e.key === "Escape" && done) clearOutputs();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doRun, done]);

  function saveKeys() {
    saveKey("ne_ant_key", keyInputA);
    saveKey("ne_oai_key", keyInputO);
    saveKey("ne_goog_key", keyInputG);
    setAnthropicKeyState(keyInputA);
    setOpenaiKeyState(keyInputO);
    setGoogleKeyState(keyInputG);
    setKeyModalOpen(false);
    showToast("keys saved locally");
  }

  return (
    <div className="app">
      {/* Masthead */}
      <div className="masthead">
        <div className="mast-left">
          <div className="mast-title">neural<em>engine</em></div>
          <div className="mast-sub">prompt diff · v2</div>
        </div>
        <div className="mast-center">
          <em>two prompts walk into a bar — let&apos;s see what they cost.</em>
        </div>
        <div className="mast-right">
          {done && (
            <button
              style={{
                background: diffMode ? "var(--ink)" : "var(--paper-2)",
                color: diffMode ? "var(--paper)" : "var(--ink-2)",
                borderColor: diffMode ? "var(--ink)" : "var(--rule-2)",
              }}
              onClick={() => setDiffMode(v => !v)}
            >
              <span>⇌</span>
              <span>{diffMode ? "showing diff" : "show diff"}</span>
            </button>
          )}
          <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
            <span>{theme === "light" ? "◐" : "●"}</span>
            <span>{theme}</span>
          </button>
          <button onClick={() => {
            navigator.clipboard?.writeText(window.location.href);
            showToast("link copied");
          }}>
            <span>share</span>
            <span className="kbd">↗</span>
          </button>
          <button onClick={() => { setKeyInputA(anthropicKey); setKeyInputO(openaiKey); setKeyInputG(googleKey); setKeyModalOpen(true); }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", background: apiKeySet ? "var(--mark-b)" : "var(--ink-4)" }} />
            <span>{apiKeySet ? "BYOK" : "add api key"}</span>
          </button>
          <button className="primary" onClick={doRun} disabled={status === "running"}>
            <span>{status === "running" ? "running…" : done ? "run again" : "run both"}</span>
            <span className="kbd">⌘↵</span>
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="stage">
        <Variant
          side="A"
          system={system} user={userA}
          onSystem={setSystem} onUser={setUserA}
          model={modelA} onModel={setModelA}
          tokens={tokA} cost={costA}
          output={outA} streaming={streamingA}
          done={done} meta={metaA}
          diffMode={diffMode && done} otherFinal={finalB}
          onBack={clearOutputs}
        />

        <div className="spine">
          <div className="spine-crown">
            <div className="spine-eyebrow">
            the press
            <button
              className="info-btn"
              onClick={() => setInfoOpen(true)}
              title="How are estimates calculated?"
            >?</button>
          </div>
            <button
              className={`spine-play${status === "running" ? " running" : ""}${done ? " done" : ""}`}
              onClick={doRun}
              disabled={status === "running"}
            >
              <span className="spine-play-glyph">
                {status === "running" ? "●" : done ? "↻" : "▶"}
              </span>
            </button>
            <div className="spine-hint">
              {status === "idle" && <>Press <span className="kbd">⌘</span><span className="kbd">↵</span> to run both</>}
              {status === "running" && <em>weighing both sides…</em>}
              {done && <><span className="kbd">esc</span> to edit · <span className="kbd">⌘</span><span className="kbd">↵</span> to rerun</>}
            </div>
          </div>

          <Receipt
            status={status}
            tokA={tokA} tokB={tokB}
            costA={costA} costB={costB}
            latA={metaA.latency ?? 0} latB={metaB.latency ?? 0}
            finalA={finalA} finalB={finalB}
            modelA={modelA} modelB={modelB}
          />

          <Rail
            status={status}
            tokA={tokA} tokB={tokB}
            costA={costA} costB={costB}
            latA={metaA.latency ?? 0} latB={metaB.latency ?? 0}
            outTokA={metaA.outTok ?? 0} outTokB={metaB.outTok ?? 0}
          />
        </div>

        <Variant
          side="B"
          system={system} user={userB}
          onSystem={setSystem} onUser={setUserB}
          model={modelB} onModel={setModelB}
          tokens={tokB} cost={costB}
          compareUser={userA}
          output={outB} streaming={streamingB}
          done={done} meta={metaB}
          diffMode={diffMode && done} otherFinal={finalA}
          onBack={clearOutputs}
        />
      </div>

      {toast && <div className="toast">{toast}</div>}

      {keyModalOpen && (
        <div className="modal-back" onClick={() => setKeyModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Bring your own key</h3>
            <p>
              Keys stay on this device. Requests fire from your browser straight to the
              provider — we never proxy, log, or store them.
            </p>
            <label>Anthropic</label>
            <input
              type="password"
              placeholder="sk-ant-•••"
              value={keyInputA}
              onChange={e => setKeyInputA(e.target.value)}
            />
            <label>OpenAI</label>
            <input
              type="password"
              placeholder="sk-•••"
              value={keyInputO}
              onChange={e => setKeyInputO(e.target.value)}
            />
            <label>Google AI</label>
            <input
              type="password"
              placeholder="AIza•••"
              value={keyInputG}
              onChange={e => setKeyInputG(e.target.value)}
            />
            <div className="notice">
              Keys are stored only in this browser&apos;s localStorage and never leave your device.
              Get a Google AI key at <span style={{ fontFamily: "var(--mono)", fontSize: "0.85em" }}>aistudio.google.com/apikey</span>
            </div>
            <div className="row">
              <button className="btn" onClick={() => setKeyModalOpen(false)}>cancel</button>
              <button className="btn primary" onClick={saveKeys}>save</button>
            </div>
          </div>
        </div>
      )}

      {infoOpen && (
        <div className="modal-back" onClick={() => setInfoOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>How estimates work</h3>
            <p style={{ marginBottom: "1rem" }}>
              Token counts and costs shown before you press <em>run both</em> are local estimates —
              no API call is made and no key is needed.
            </p>

            <div className="info-row">
              <div className="info-label">Input tokens</div>
              <div className="info-body">
                Estimated as <code>max(word_count, chars ÷ 3.8)</code>.
                Real providers use byte-pair encoding; this approximation is typically within 5–10%.
              </div>
            </div>

            <div className="info-row">
              <div className="info-label">Output tokens (est.)</div>
              <div className="info-body">
                Pre-run estimate = <code>max(80, input_tokens × 0.8)</code>.
                After a run, the actual token count reported by the provider replaces this.
              </div>
            </div>

            <div className="info-row">
              <div className="info-label">Cost</div>
              <div className="info-body">
                <code>(input_tok ÷ 1M) × in_price + (output_tok ÷ 1M) × out_price</code>.
                Prices shown are list prices per million tokens and may lag provider changes by a few days.
              </div>
            </div>

            <div className="info-row">
              <div className="info-label">Latency</div>
              <div className="info-body">
                Wall-clock time from the moment the request is sent to when the last streaming chunk
                arrives. Includes network round-trip and model generation time.
              </div>
            </div>

            <div className="info-row">
              <div className="info-label">Actual cost</div>
              <div className="info-body">
                Shown in the output header after a run, calculated from the real token counts
                returned by the provider.
              </div>
            </div>

            <div className="row" style={{ marginTop: "1.5rem" }}>
              <button className="btn primary" onClick={() => setInfoOpen(false)}>got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
