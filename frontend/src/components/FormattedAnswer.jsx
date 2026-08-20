/**
 * Renders an LLM answer as a proper bullet list when it contains "- " lines
 * (used for multi-record results), or as plain wrapped text otherwise.
 * Shared by guest/student result lookup and the chat panel.
 */
export default function FormattedAnswer({ text, className = "" }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
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

  return <p className={className}>{text}</p>;
}
