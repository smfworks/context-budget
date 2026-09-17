import type { DragEvent } from "react";
import { PASTE_PLACEHOLDER, SAMPLES } from "../data/samples";
import { BUDGET_PRESETS } from "../lib/budget";
import { formatCount } from "../lib/tokens";
import type { PresetId } from "../types";

interface ComposerProps {
  raw: string;
  sampleId: string | null;
  presetId: PresetId;
  customRaw: string;
  customError: string | null;
  dragging: boolean;
  liveLine: string;
  onRawChange: (value: string) => void;
  onSample: (id: string) => void;
  onPreset: (id: PresetId) => void;
  onCustomRaw: (value: string) => void;
  onPickFile: () => void;
  onDragState: (value: boolean) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export function Composer({
  raw,
  sampleId,
  presetId,
  customRaw,
  customError,
  dragging,
  liveLine,
  onRawChange,
  onSample,
  onPreset,
  onCustomRaw,
  onPickFile,
  onDragState,
  onDrop,
}: ComposerProps) {
  return (
    <section
      className={`composer${dragging ? " is-dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        onDragState(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        onDragState(false);
      }}
      onDrop={onDrop}
    >
      <div className="composer-head">
        <h2>Paste</h2>
        <p>Pick a sample, paste text, or drop a `.txt` / `.md` / `.json`.</p>
      </div>

      <div className="sample-row" role="list">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            role="listitem"
            className={sampleId === sample.id ? "chip is-on" : "chip"}
            onClick={() => onSample(sample.id)}
          >
            <span className="chip-top">
              <i className={`dot is-${sample.expect.toLowerCase()}`} aria-hidden="true" />
              {sample.label}
            </span>
            <small>{sample.blurb}</small>
          </button>
        ))}
      </div>

      <p className="editor-label" id="budget-label">
        Budget
      </p>
      <div className="budget-row" role="group" aria-labelledby="budget-label">
        {BUDGET_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={presetId === preset.id ? "budget-chip is-on" : "budget-chip"}
            onClick={() => onPreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          className={presetId === "custom" ? "budget-chip is-on" : "budget-chip"}
          onClick={() => onPreset("custom")}
        >
          Custom
        </button>
      </div>
      {presetId === "custom" ? (
        <label className="custom-budget">
          <span className="sr-only">Custom budget in tokens</span>
          <input
            type="text"
            inputMode="decimal"
            value={customRaw}
            placeholder="e.g. 64k"
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => onCustomRaw(event.target.value)}
          />
          <small>{customError ?? "Tokens · 256–2M · 8k / 1.5k / 64k ok"}</small>
        </label>
      ) : null}

      <label className="editor-label" htmlFor="context-input">
        Context
      </label>
      <textarea
        id="context-input"
        value={raw}
        onChange={(event) => onRawChange(event.target.value)}
        placeholder={PASTE_PLACEHOLDER}
        spellCheck={false}
        autoComplete="off"
      />
      <div className="composer-foot">
        <button type="button" className="text-btn" onClick={onPickFile}>
          Upload a file
        </button>
        <span>{raw.trim() ? `${formatCount(raw.length)} chars` : "Client-side only · no API"}</span>
      </div>
      <p className="live-line">{liveLine}</p>
      <p className="disclaimer">
        Approximate (chars ÷ 4). Heuristic demo. <strong>Not a billing meter.</strong> Not a
        tokenizer. Judgment stays human.
      </p>
    </section>
  );
}
