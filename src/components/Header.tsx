export function Header() {
  return (
    <header className="mast">
      <div className="mast-brand">
        <span className="mark" aria-hidden="true" />
        <div>
          <p className="eyebrow">SMF Works · Human-AI lab</p>
          <h1>Context Budget</h1>
        </div>
      </div>
      <p className="lede">
        Paste a prompt, log, or dump. See the approximate token bar. Cut what
        does not earn its keep — then share the card, not the secrets.
      </p>
    </header>
  );
}
