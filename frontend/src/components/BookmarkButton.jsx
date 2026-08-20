import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import client from "../api/client";

/**
 * "Save" action used across PYQs/study material/announcements/notifications
 * lists. Once saved it becomes a checkmark (removing happens from the
 * dedicated Bookmarks tab, not here - keeps this button a simple one-way
 * action instead of needing a bulk "is this already bookmarked" check on
 * every list load).
 */
export default function BookmarkButton({ itemType, itemId, className = "" }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const save = async (e) => {
    e.stopPropagation();
    if (saved || loading) return;
    setLoading(true);
    try {
      await client.post("/student/bookmarks", { itemType, itemId });
      setSaved(true);
    } catch {
      // silent - bookmarking is a minor action, not worth a disruptive error state
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={save}
      disabled={loading}
      title={saved ? "Saved" : "Save to bookmarks"}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
        saved ? "text-brass" : "text-slate hover:text-brass hover:bg-brass/10"
      } ${className}`}
    >
      {saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
    </button>
  );
}
