"use client";

import { useState, useEffect, useRef } from "react";
import { MODELS, PROVIDERS } from "@/lib/models";

interface Props {
  value: string;
  onChange: (id: string) => void;
  side: "A" | "B";
}

export default function ModelPicker({ value, onChange, side }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const model = MODELS.find(m => m.id === value) ?? MODELS[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const grouped = MODELS.reduce<Record<string, typeof MODELS>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button className="var-model-picker" onClick={() => setOpen(v => !v)}>
        {model.name}
        <span className="chev">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="picker-pop" onClick={e => e.stopPropagation()}>
          {Object.entries(grouped).map(([pid, models]) => {
            const p = PROVIDERS[pid as keyof typeof PROVIDERS];
            return (
              <div key={pid}>
                <div className="pg-label">
                  <span className="pg-dot" style={{ background: p.dot }} />
                  {p.label}
                </div>
                {models.map(m => (
                  <button
                    key={m.id}
                    className={`pg-item ${m.id === value ? (side === "A" ? "sel-a" : "sel-b") : ""}`}
                    onClick={() => { onChange(m.id); setOpen(false); }}
                  >
                    <div>
                      <div className="m-name">{m.name}</div>
                      <div className="m-meta">{m.ctx} context · {m.id}</div>
                    </div>
                    <div className="m-price">
                      ${m.inPrice.toFixed(2)} / ${m.outPrice.toFixed(2)}
                      <span className="u">in / out per M</span>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
