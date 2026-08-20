import { useState, useEffect } from "react";
import client from "../../api/client";

/**
 * Generic filter-form + results-table panel. Reused across PYQs, study
 * material, assignments, announcements, notifications, bookmarks, and the
 * student's own results view - only the endpoint/fields/columns differ.
 *
 * @param {string} endpoint
 * @param {"get"} method
 * @param {Array<{key: string, label: string, type?: string}>} fields  filter inputs; [] for feeds with no filters
 * @param {(row: object) => JSX.Element} renderRow
 * @param {string[]} headers
 * @param {string|null} responseKey  key in the response holding the array; null if response IS the array
 * @param {boolean} autoLoad  fetch immediately on mount (for feeds with no filters)
 */
export default function FilterListPanel({ endpoint, fields, renderRow, headers, responseKey, autoLoad }) {
  const [filters, setFilters] = useState(() => Object.fromEntries(fields.map((f) => [f.key, ""])));
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data } = await client.get(endpoint, { params });
      setRows(responseKey ? data[responseKey] : data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad) search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-surface border border-slate/10 rounded-sm p-6 transition-shadow hover:shadow-md">
      {fields.length > 0 && (
        <form onSubmit={search} className={`grid gap-3 mb-4`} style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr)` }}>
          {fields.map((f) => (
            <input
              key={f.key}
              type={f.type || "text"}
              placeholder={f.label}
              value={filters[f.key]}
              onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
              className="px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm"
            />
          ))}
          <button
            type="submit"
            disabled={loading}
            className="col-span-full sm:col-span-1 bg-indigo text-cream px-4 py-2 rounded text-sm font-medium disabled:opacity-50 w-fit"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      )}

      {error && <p className="text-rust text-sm mb-4 bg-rust/10 px-3 py-2 rounded">{error}</p>}

      {rows === null ? (
        !autoLoad && <p className="text-slate text-sm">Use the filters above to search.</p>
      ) : rows.length === 0 ? (
        <p className="text-slate text-sm">No results found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate border-b border-brass/40">
              {headers.map((h) => (
                <th key={h} className="py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{rows.map(renderRow)}</tbody>
        </table>
      )}
    </div>
  );
}
