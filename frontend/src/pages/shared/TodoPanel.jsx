import { useState, useEffect } from "react";
import client from "../../api/client";

/** Identical for student and teacher - only the endpoint prop differs. */
export default function TodoPanel({ endpoint }) {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await client.get(endpoint);
    setTodos(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const add = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    await client.post(endpoint, { text });
    setText("");
    load();
  };

  const toggle = async (todo) => {
    await client.put(`${endpoint}/${todo._id}`, { done: !todo.done });
    load();
  };

  const remove = async (id) => {
    await client.delete(`${endpoint}/${id}`);
    load();
  };

  return (
    <div className="bg-surface border border-slate/10 rounded-sm p-6 max-w-xl">
      <form onSubmit={add} className="flex gap-2 mb-6">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 px-3 py-2 border border-slate/20 rounded bg-surface text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brass"
        />
        <button type="submit" className="bg-indigo text-cream px-4 py-2 rounded text-sm font-medium">
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-slate text-sm">Loading...</p>
      ) : todos.length === 0 ? (
        <p className="text-slate text-sm">Nothing here yet.</p>
      ) : (
        <ul className="space-y-2">
          {todos.map((t) => (
            <li key={t._id} className="flex items-center gap-3 group">
              <input type="checkbox" checked={t.done} onChange={() => toggle(t)} className="accent-brass" />
              <span className={`flex-1 text-sm ${t.done ? "line-through text-slate" : "text-ink"}`}>{t.text}</span>
              <button
                onClick={() => remove(t._id)}
                className="text-rust text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
