import { useState, useEffect } from "react";
import { SearchX, Search } from "lucide-react";
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
    <div className="bg-surface border border-slate/10 rounded-sm p-6 hover:shadow-md transition-shadow">
      {fields.length > 0 && (
        <form onSubmit={search} className={`grid gap-3 mb-4`} style={{ gridTemplateColumns: `repeat(${fields.length}, 1fr)` }}>
          {fields.map((f) => (
            <input
              key={f.key}
              type={f.type || "text"}
              placeholder={f.label}
              value={filters[f.key]}
              onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })}
              className="field"
            />
          ))}
          <button type="submit" disabled={loading} className="btn-primary col-span-full sm:col-span-1 w-fit">
            <Search size={14} />
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      )}

      {error && <p className="text-rust text-sm mb-4 bg-rust/10 px-3 py-2 rounded">{error}</p>}

      {loading && rows === null ? (
        // Skeleton rows instead of a bare "Loading..." line - keeps the
        // panel's height stable so the page doesn't jump when data lands.
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 bg-parchment2/70 rounded" />
          ))}
        </div>
      ) : rows === null ? (
        !autoLoad && (
          <div className="flex flex-col items-center text-center py-10 text-slate">
            <Search size={28} className="mb-3 opacity-40" />
            <p className="text-sm">Use the filters above to search.</p>
          </div>
        )
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center text-center py-10 text-slate">
          <SearchX size={28} className="mb-3 opacity-40" />
          <p className="text-sm">No results found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
