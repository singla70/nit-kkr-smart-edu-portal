import { useState, useEffect } from "react";
import { Plus, Trash2, ListTodo } from "lucide-react";
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
          className="field flex-1"
        />
        <button type="submit" className="btn-primary">
          <Plus size={14} />
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-slate text-sm">Loading...</p>
      ) : todos.length === 0 ? (
        <div className="flex flex-col items-center text-center py-8 text-slate">
          <ListTodo size={24} className="mb-2 opacity-40" />
          <p className="text-sm">Nothing here yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {todos.map((t) => (
            <li key={t._id} className="flex items-center gap-3 group">
              <input type="checkbox" checked={t.done} onChange={() => toggle(t)} className="accent-brass" />
              <span className={`flex-1 text-sm ${t.done ? "line-through text-slate" : "text-ink"}`}>{t.text}</span>
              <button
                onClick={() => remove(t._id)}
                className="text-rust opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove task"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
