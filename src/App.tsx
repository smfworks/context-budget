import { sampleById } from "./data/samples";
import {
  analyzeContext,
  DEFAULT_PRESET,
  parseBudgetInput,
  presetById,
} from "./lib/budget";
import { copyText, downloadBlob, cardToPngBlob } from "./lib/exportImage";
import { formatCompactStats, formatShareText } from "./lib/share";
import { slugify } from "./lib/tokens";
import type { PresetId } from "./types";
import { Actions } from "./components/Actions";
import { BudgetCard } from "./components/BudgetCard";
import { Composer } from "./components/Composer";
import { Header } from "./components/Header";
import { SisterStrip } from "./components/SisterStrip";
import { Toast } from "./components/Toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";

export default function App() {
  const [raw, setRaw] = useState("");
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<PresetId>(DEFAULT_PRESET.id);
  const [customRaw, setCustomRaw] = useState("64k");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<"png" | "share" | null>(null);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(id);
  }, [toast]);

  const customTokens = useMemo(() => parseBudgetInput(customRaw), [customRaw]);
  const customError =
    presetId === "custom" && customTokens == null ? "Enter a budget like 64k or 50000." : null;

  const budgetTokens = useMemo(() => {
    if (presetId === "custom") return customTokens ?? DEFAULT_PRESET.tokens;
    return presetById(presetId)?.tokens ?? DEFAULT_PRESET.tokens;
  }, [customTokens, presetId]);

  const report = useMemo(
    () => analyzeContext(raw, budgetTokens, presetId),
    [budgetTokens, presetId, raw],
  );

  const loadSample = useCallback((id: string) => {
    const sample = sampleById(id);
    if (!sample) return;
    setRaw(sample.text);
    setSampleId(sample.id);
    setPresetId(sample.budgetId);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sample = params.get("sample");
    const shot = params.get("shot");
    const budget = params.get("budget");
    if (shot === "card" || shot === "og") {
      document.body.classList.add(`shot-${shot}`);
    }
    if (budget) {
      const preset = presetById(budget);
      if (preset) {
        setPresetId(preset.id);
      } else {
        const tokens = parseBudgetInput(budget);
        if (tokens != null) {
          setPresetId("custom");
          setCustomRaw(budget);
        }
      }
    }
    if (sample) loadSample(sample);
  }, [loadSample]);

  const onFile = useCallback(async (file: File) => {
    const text = await file.text();
    setSampleId(null);
    setRaw(text);
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files[0];
      if (!file) return;
      const name = file.name.toLowerCase();
      if (
        !name.endsWith(".md") &&
        !name.endsWith(".markdown") &&
        !name.endsWith(".txt") &&
        !name.endsWith(".json") &&
        !file.type.startsWith("text/")
      ) {
        showToast("Drop a .txt, .md, or .json file.");
        return;
      }
      void onFile(file);
    },
    [onFile, showToast],
  );

  const reset = useCallback(() => {
    setRaw("");
    setSampleId(null);
    setPresetId(DEFAULT_PRESET.id);
    setCustomRaw("64k");
    showToast("Cleared.");
  }, [showToast]);

  const withFrame = useCallback(async () => {
    const node = frameRef.current;
    if (!node || report.empty) throw new Error("Nothing to print yet.");
    node.classList.add("is-exporting");
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    try {
      return await cardToPngBlob(node);
    } finally {
      node.classList.remove("is-exporting");
    }
  }, [report.empty]);

  const downloadPng = useCallback(async () => {
    if (report.empty) return;
    setBusy("png");
    try {
      const blob = await withFrame();
      downloadBlob(blob, `context-budget-${slugify(report.budgetLabel)}.png`);
      showToast("PNG downloaded.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "PNG export failed.");
    } finally {
      setBusy(null);
    }
  }, [report.budgetLabel, report.empty, showToast, withFrame]);

  const copyShare = useCallback(async () => {
    if (report.empty) return;
    setBusy("share");
    try {
      await copyText(formatShareText(report));
      showToast("Share text copied.");
    } catch {
      showToast("Could not copy share text.");
    } finally {
      setBusy(null);
    }
  }, [report, showToast]);

  const live = report.empty ? "Waiting for a paste" : formatCompactStats(report);

  return (
    <div className="page">
      <div className="ambient" aria-hidden="true" />
      <Header />
      <SisterStrip />
      <main className="layout">
        <Composer
          raw={raw}
          sampleId={sampleId}
          presetId={presetId}
          customRaw={customRaw}
          customError={customError}
          dragging={dragging}
          liveLine={live}
          onRawChange={(value) => {
            setSampleId(null);
            setRaw(value);
          }}
          onSample={loadSample}
          onPreset={setPresetId}
          onCustomRaw={setCustomRaw}
          onPickFile={() => fileRef.current?.click()}
          onDragState={setDragging}
          onDrop={onDrop}
        />
        <section className="stage" aria-label="Context Budget card">
          <p className="sr-only" aria-live="polite">
            {live}
          </p>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
            accept=".md,.markdown,.txt,.json,text/markdown,text/plain,application/json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
              event.target.value = "";
            }}
          />
          <div className="stage-scroll">
            <div ref={frameRef} className="export-frame">
              <BudgetCard report={report} />
            </div>
          </div>
          <p className="stage-stats">{report.empty ? null : formatCompactStats(report)}</p>
          <Actions
            disabled={report.empty}
            busy={busy}
            onDownloadPng={() => void downloadPng()}
            onCopyShare={() => void copyShare()}
            onReset={reset}
          />
        </section>
      </main>
      <footer className="site-foot">
        <p>Context Budget · SMF Works</p>
        <p>
          Sister apps:{" "}
          <a href="https://github.com/smfworks/paste-to-skill" rel="noreferrer" target="_blank">
            Paste → Skill
          </a>
          {" — create · "}
          <a href="https://github.com/smfworks/skill-lint" rel="noreferrer" target="_blank">
            Skill Lint
          </a>
          {" — grade · "}
          <a href="https://github.com/smfworks/refuse-card" rel="noreferrer" target="_blank">
            Refuse Card
          </a>
          {" — the gate · "}
          <a href="https://github.com/smfworks/agent-receipt" rel="noreferrer" target="_blank">
            Agent Receipt
          </a>
          {" — what ran · "}
          <a href="https://github.com/smfworks/prompt-diff" rel="noreferrer" target="_blank">
            Prompt Diff
          </a>
          {" — what changed."}
        </p>
        <p>Intelligence is abundant. Judgment is the product.</p>
        <p>
          MIT · Built by{" "}
          <a href="https://smfworks.com" rel="noreferrer" target="_blank">
            SMF Works
          </a>
          {" · "}
          <a href="https://github.com/smfworks/context-budget" rel="noreferrer" target="_blank">
            GitHub
          </a>
          {" · "}
          <a href="https://x.com/MichaelGannotti" rel="noreferrer" target="_blank">
            @MichaelGannotti
          </a>
        </p>
        <p className="fineprint">
          No secrets, no monetization, no medical or legal advice. Approximate
          tokens (chars ÷ 4) are not a billing meter, not a tokenizer, and not a
          substitute for human review.
        </p>
      </footer>
      <Toast message={toast} />
    </div>
  );
}
