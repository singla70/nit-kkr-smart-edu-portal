/**
 * Renders an LLM answer as a proper bullet list when it contains "- " lines
 * (used for multi-record results), or as plain wrapped text otherwise.
 * Shared by guest/student result lookup and the chat panel.
 *
 * `clean()` is a safety net, not the primary fix: the backend already
 * instructs every model to skip markdown - this just strips anything that
 * slips through (bold/header symbols, stray special tokens) so a prompt
 * that isn't followed perfectly still renders readably.
 */
const clean = (s) =>
  s
    .replace(/<\|[^|]*\|>/g, "") // stray model-internal tokens, if any leak through
    .replace(/\*\*/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .trim();

export default function FormattedAnswer({ text, className = "" }) {
  const cleaned = clean(text);
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const isList = lines.length > 1 && lines.every((l) => l.startsWith("-") || l.startsWith("*"));

  if (isList) {
    return (
      <ul className={`list-disc pl-5 space-y-1 ${className}`}>
        {lines.map((line, i) => (
          <li key={i}>{line.replace(/^[-*]\s*/, "")}</li>
        ))}
      </ul>
    );
  }

  return <p className={className}>{cleaned}</p>;
}