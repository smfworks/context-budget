interface TrimPreviewProps {
  text: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  tokens: number;
}

export function TrimPreview({ text, open, onToggle, tokens }: TrimPreviewProps) {
  if (!text) return null;
  return (
    <section className="preview-card">
      <button
        type="button"
        className="preview-toolbar as-button"
        aria-expanded={open}
        onClick={() => onToggle(!open)}
      >
        <div>
          <p className="eyebrow">Conservative draft</p>
          <strong>Trimmed paste</strong>
        </div>
        <span className="preview-file">{open ? "Hide" : `~${tokens.toLocaleString("en-US")} tok`}</span>
      </button>
      {open ? (
        <pre className="trim-preview" tabIndex={0}>
          {text}
        </pre>
      ) : null}
    </section>
  );
}
