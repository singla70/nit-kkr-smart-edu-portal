import { useState, useEffect } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import client from "../../api/client";

const SECTION_LABELS = {
  pyq: "PYQs",
  study_material: "Study Material",
  announcement: "Announcements",
  notification: "Notifications",
};

const getItemLabel = (b) => {
  if (!b.item) return "(no longer available)";
  return b.item.title || b.item.subject || "Untitled";
};

export default function BookmarksPanel() {
  const [bookmarks, setBookmarks] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await client.get("/student/bookmarks");
    setBookmarks(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (bookmarkId) => {
    await client.delete(`/student/bookmarks/${bookmarkId}`);
    load();
  };

  if (loading) return <p className="text-slate text-sm">Loading...</p>;
  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div className="bg-surface border border-slate/10 rounded-sm p-10 flex flex-col items-center text-center text-slate">
        <Bookmark size={28} className="mb-3 opacity-40" />
        <p className="text-sm">
          Nothing saved yet. Look for the bookmark icon on PYQs, study material, announcements, and
          notifications.
        </p>
      </div>
    );
  }

  const grouped = bookmarks.reduce((acc, b) => {
    (acc[b.itemType] = acc[b.itemType] || []).push(b);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type} className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
          <h3 className="font-display text-lg text-ink mb-1">{SECTION_LABELS[type] || type}</h3>
          <p className="ledger-rule mb-4" />
          <ul className="space-y-2 text-sm">
            {items.map((b) => (
              <li key={b.bookmarkId} className="flex items-center justify-between border-b border-slate/10 pb-2 gap-3">
                <span className={!b.item ? "text-slate italic" : "text-ink"}>{getItemLabel(b)}</span>
                <div className="flex items-center gap-3 shrink-0">
                  {b.item?.fileUrl && (
                    <a
                      href={b.item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-link text-xs hover:underline transition-colors"
                    >
                      View
                    </a>
                  )}
                  <button onClick={() => remove(b.bookmarkId)} className="text-rust hover:opacity-70 transition-opacity" aria-label="Remove bookmark">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
