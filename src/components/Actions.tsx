interface ActionsProps {
  disabled: boolean;
  trimDisabled: boolean;
  busy: "png" | "share" | "copy-md" | "download-md" | null;
  onDownloadPng: () => void;
  onCopyShare: () => void;
  onCopyTrimmed: () => void;
  onDownloadTrimmed: () => void;
  onReset: () => void;
}

export function Actions({
  disabled,
  trimDisabled,
  busy,
  onDownloadPng,
  onCopyShare,
  onCopyTrimmed,
  onDownloadTrimmed,
  onReset,
}: ActionsProps) {
  return (
    <div className="actions">
      <button
        type="button"
        className="btn btn-ember"
        disabled={disabled || busy !== null}
        onClick={onDownloadPng}
      >
        {busy === "png" ? "Printing…" : "Download PNG"}
      </button>
      <button type="button" className="btn" disabled={disabled || busy !== null} onClick={onCopyShare}>
        {busy === "share" ? "Copying…" : "Copy share text"}
      </button>
      <button
        type="button"
        className="btn"
        disabled={trimDisabled || busy !== null}
        onClick={onCopyTrimmed}
      >
        {busy === "copy-md" ? "Copying…" : "Copy trimmed draft"}
      </button>
      <button
        type="button"
        className="btn"
        disabled={trimDisabled || busy !== null}
        onClick={onDownloadTrimmed}
      >
        {busy === "download-md" ? "Saving…" : "Download trimmed .txt"}
      </button>
      <button type="button" className="btn btn-ghost" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}
