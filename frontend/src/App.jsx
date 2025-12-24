import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  signup,
  login,
  setToken,
  getToken,
  clearToken,
  listProjects,
  createProject,
  listTasks,
  createTask,
  toggleTask,
  deleteTask,
  deleteProject,
  renameTask,
} from "./api";

export default function App() {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [taskQuery, setTaskQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState("all"); // all | active | done
  const [taskSort, setTaskSort] = useState("newest"); // newest | oldest | title

  const [token, setTokenState] = useState(getToken() || "");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const isAuthed = !!token;

  function startEditTask(t) {
  setEditingTaskId(t.id);
  setEditingTitle(t.title);
}

  function cancelEditTask() {
    setEditingTaskId(null);
    setEditingTitle("");
  }

    function onClearTaskControls() {
    setTaskQuery("");
    setTaskFilter("all");
    setTaskSort("newest");
    setOk("Cleared filters.");
    setError("");
  }

  async function onMarkAllDone() {
    if (!selectedProjectId) return;

    const toMark = tasks.filter((t) => !t.is_done);
    if (!toMark.length) {
      setOk("Nothing to mark — all tasks are already done.");
      return;
    }

    setError("");
    setOk("");
    try {
      await Promise.all(toMark.map((t) => toggleTask(t.id, true)));
      await refreshTasks(selectedProjectId);
      setOk(`Marked ${toMark.length} task(s) done.`);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function onDeleteCompleted() {
    if (!selectedProjectId) return;

    const done = tasks.filter((t) => t.is_done);
    if (!done.length) {
      setOk("No completed tasks to delete.");
      return;
    }

    const ok = window.confirm(`Delete ${done.length} completed task(s)?\n\nThis cannot be undone.`);
    if (!ok) return;

    setError("");
    setOk("");
    try {
      await Promise.all(done.map((t) => deleteTask(t.id)));
      await refreshTasks(selectedProjectId);
      setOk(`Deleted ${done.length} completed task(s).`);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function onRenameTask(t) {
    const title = window.prompt("Rename task:", t.title);
    if (title == null) return;

    const trimmed = title.trim();
    if (!trimmed) return;

    setError("");
    try {
      await renameTask(t.id, trimmed);
      await refreshTasks(selectedProjectId);
      setOk("Task renamed.");
    } catch (e) {
      setError(String(e.message || e));
    }
  }


  async function refreshProjects() {
    const p = await listProjects();
    setProjects(p);
    if (p.length && selectedProjectId == null) setSelectedProjectId(p[0].id);
  }

  async function refreshTasks(pid) {
    if (!pid) {
      setTasks([]);
      return;
    }
    const t = await listTasks(pid);
    setTasks(t);
  }

  async function onDeleteProject(p) {
  if (!window.confirm(`Delete project "${p.name}"?\n\nThis cannot be undone.`)) return;

  setError("");
  try {
    await deleteProject(p.id);
    await refreshProjects();

    // pick a new selected project (or none)
    setSelectedProjectId((prev) => (prev === p.id ? null : prev));


    setOk("Project deleted.");
  } catch (e) {
    setError(String(e.message || e));
  }
}

  useEffect(() => {
    if (!isAuthed) return;
    (async () => {
      try {
        await refreshProjects();
      } catch (e) {
        setError(String(e.message || e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed) return;
    refreshTasks(selectedProjectId).catch((e) => setError(String(e.message || e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, isAuthed]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );
  const doneCount = useMemo(() => tasks.filter((t) => t.is_done).length, [tasks]);
  const totalCount = tasks.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const visibleTasks = useMemo(() => {
  let arr = [...tasks];

  // filter
  if (taskFilter === "active") arr = arr.filter((t) => !t.is_done);
  if (taskFilter === "done") arr = arr.filter((t) => t.is_done);

  // search
  const q = taskQuery.trim().toLowerCase();
  if (q) arr = arr.filter((t) => t.title.toLowerCase().includes(q));

  // sort
  if (taskSort === "title") arr.sort((a, b) => a.title.localeCompare(b.title));
  if (taskSort === "oldest") arr.sort((a, b) => a.id - b.id);
  if (taskSort === "newest") arr.sort((a, b) => b.id - a.id);

  return arr;
}, [tasks, taskQuery, taskFilter, taskSort]);
 
  async function onSignup() {
    setError("");
    setOk("");
    try {
      await signup(email, password);
      setOk("Signup successful. Now login.");
      setMode("login");
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function onLogin() {
    setError("");
    setOk("");
    try {
      const data = await login(email, password);
      setToken(data.access_token);
      setTokenState(data.access_token);
      setOk("Logged in!");
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  function onLogout() {
    clearToken();
    setTokenState("");
    setProjects([]);
    setTasks([]);
    setSelectedProjectId(null);
    setEmail("");
    setPassword("");
    setError("");
    setOk("");
  }

  async function onCreateProject() {
    setError("");
    setOk("");
    const name = newProjectName.trim();
    if (!name) return;
    try {
      const p = await createProject(name);
      setNewProjectName("");
      await refreshProjects();
      setSelectedProjectId(p.id);
      setOk("Project created.");
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function onCreateTask() {
    setError("");
    setOk("");
    const title = newTaskTitle.trim();
    if (!title || !selectedProjectId) return;
    try {
      await createTask(selectedProjectId, title);
      setNewTaskTitle("");
      await refreshTasks(selectedProjectId);
      setOk("Task added.");
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function onToggleTask(t) {
    setError("");
    try {
      await toggleTask(t.id, !t.is_done);
      await refreshTasks(selectedProjectId);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function onDeleteTask(t) {
    setError("");
    try {
      await deleteTask(t.id);
      await refreshTasks(selectedProjectId);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header isAuthed={isAuthed} onLogout={onLogout} />

      <main className="mx-auto max-w-5xl px-4 py-10">
        {!isAuthed ? (
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Task Manager</h1>
                <p className="mt-1 text-slate-300">
                  FastAPI + SQLite + JWT + React UI
                </p>
              </div>

              <div className="inline-flex rounded-xl bg-slate-900 p-1">
                <Tab active={mode === "login"} onClick={() => setMode("login")}>
                  Login
                </Tab>
                <Tab active={mode === "signup"} onClick={() => setMode("signup")}>
                  Signup
                </Tab>
              </div>
            </div>

            <div className="mt-8 grid gap-4">
              <Field
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Field
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <div className="mt-2 flex gap-3">
                {mode === "signup" ? (
                  <Button onClick={onSignup}>Create account</Button>
                ) : (
                  <Button onClick={onLogin}>Login</Button>
                )}
                <Button variant="ghost" onClick={() => { setEmail(""); setPassword(""); setError(""); setOk(""); }}>
                  Clear
                </Button>
              </div>

              <Status error={error} ok={ok} />
              <p className="text-xs text-slate-400">
                Tip: signup once, then login. Token is stored in localStorage.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card>
              <h2 className="text-lg font-semibold">Projects</h2>

              <div className="mt-4 flex gap-2">
                <input
                  className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm outline-none ring-1 ring-slate-800 focus:ring-slate-600"
                  placeholder="New project name…"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onCreateProject()}
                />
                <Button onClick={onCreateProject}>Add</Button>
              </div>

              <div className="mt-4 space-y-2">
                {projects.map((p) => (
                  <div key={p.id} className="flex gap-2">
                    <button
                      onClick={() => setSelectedProjectId(p.id)}
                      className={[
                        "w-full rounded-xl px-3 py-2 text-left text-sm ring-1 transition",
                        p.id === selectedProjectId
                          ? "bg-slate-800 ring-slate-700"
                          : "bg-slate-900 ring-slate-800 hover:bg-slate-800",
                      ].join(" ")}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-slate-400">ID: {p.id}</div>
                    </button>

                    <button
                      onClick={() => onDeleteProject(p)}
                      className="rounded-xl px-3 py-2 text-sm text-slate-300 ring-1 ring-slate-800 hover:bg-slate-800"
                      title="Delete project"
                    >
                      Delete
                    </button>
                  </div>
                ))}

                {!projects.length && (
                  <div className="rounded-xl bg-slate-900 p-3 text-sm text-slate-400 ring-1 ring-slate-800">
                    No projects yet. Create one.
                  </div>
                )}
              </div>

            </Card>

            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Tasks</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {selectedProject ? (
                      <>
                        Project: <span className="text-slate-200">{selectedProject.name}</span>
                      </>
                    ) : (
                      "Select a project"
                    )}
                  </p>
                </div>
                <Status error={error} ok={ok} />
              </div>

              <div className="mt-5 flex gap-2">
                <input
                  className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm outline-none ring-1 ring-slate-800 focus:ring-slate-600"
                  placeholder="New task title…"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onCreateTask()}
                  disabled={!selectedProjectId}
                />
                <Button onClick={onCreateTask} disabled={!selectedProjectId}>
                  Add
                </Button>
              </div>
              {/* Search / Filter / Sort */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <input
                  className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm ring-1 ring-slate-800 outline-none focus:ring-slate-600 sm:max-w-sm"
                  placeholder="Search tasks…"
                  value={taskQuery}
                  onChange={(e) => setTaskQuery(e.target.value)}
                  disabled={!selectedProjectId}
                />

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setTaskFilter("all")} className={btn(taskFilter === "all")}>
                    All
                  </button>
                  <button onClick={() => setTaskFilter("active")} className={btn(taskFilter === "active")}>
                    Active
                  </button>
                  <button onClick={() => setTaskFilter("done")} className={btn(taskFilter === "done")}>
                    Done
                  </button>

                  <select
                    className="rounded-xl bg-slate-900 px-3 py-2 text-sm ring-1 ring-slate-800"
                    value={taskSort}
                    onChange={(e) => setTaskSort(e.target.value)}
                    disabled={!selectedProjectId}
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="title">A → Z</option>
                  </select>
                </div>
              </div>
              
              {/* Bulk actions */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={onMarkAllDone}
                  disabled={!selectedProjectId || !tasks.some((t) => !t.is_done)}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm ring-1 ring-slate-800 hover:bg-slate-800 disabled:opacity-50"
                >
                  Mark all done
                </button>

                <button
                  onClick={onDeleteCompleted}
                  disabled={!selectedProjectId || !tasks.some((t) => t.is_done)}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm ring-1 ring-slate-800 hover:bg-slate-800 disabled:opacity-50"
                >
                  Delete completed
                </button>

                <button
                  onClick={onClearTaskControls}
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm ring-1 ring-slate-800 hover:bg-slate-800"
                >
                  Clear filters
                </button>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {doneCount}/{totalCount} done
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded bg-slate-800">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
              
              <div className="mt-4 divide-y divide-slate-800 rounded-xl bg-slate-900 ring-1 ring-slate-800">
                {visibleTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 p-3">
                    <button
                      onClick={() => onToggleTask(t)}
                      className="flex items-center gap-3 text-left"
                      title="Toggle done"
                    >
                      <span
                        className={[
                          "inline-flex h-5 w-5 items-center justify-center rounded-md ring-1",
                          t.is_done ? "bg-emerald-600/20 ring-emerald-500/40" : "bg-slate-950 ring-slate-700",
                        ].join(" ")}
                      >
                        {t.is_done ? "✓" : ""}
                      </span>
                      <div>
                        <div className={t.is_done ? "line-through text-slate-400" : "text-slate-100"}>
                          {t.title}
                        </div>
                        <div className="text-xs text-slate-500">Task #{t.id}</div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onRenameTask(t)}
                        className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                      >
                        Rename
                      </button>

                      <button
                        onClick={() => {
                          const ok = window.confirm(`Delete this task?\n\n"${t.title}"`);
                          if (ok) onDeleteTask(t);
                        }}
                        className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}

                {!visibleTasks.length && (
                  <div className="p-4 text-sm text-slate-400">
                    No tasks yet. Add one above.
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-slate-500">
        Backend: http://127.0.0.1:8000 • Frontend: http://127.0.0.1:5173
      </footer>
    </div>
  );
}
function btn(active) {
  return [
    "rounded-xl px-3 py-2 text-sm ring-1 transition",
    active
      ? "bg-slate-100 text-slate-950 ring-slate-200"
      : "bg-slate-900 text-slate-200 ring-slate-800 hover:bg-slate-800",
  ].join(" ");
}

function Header({ isAuthed, onLogout }) {
  return (
    <div className="border-b border-slate-800/70 bg-slate-950/60 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 ring-1 ring-slate-800">
            ✅
          </div>
          <div>
            <div className="text-sm font-semibold">Task Manager</div>
            <div className="text-xs text-slate-400">FastAPI + React</div>
          </div>
        </div>

        {isAuthed && (
          <Button variant="ghost" onClick={onLogout}>
            Logout
          </Button>
        )}
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div className="rounded-2xl bg-slate-900/40 p-6 shadow-lg shadow-black/20 ring-1 ring-slate-800">
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "solid", disabled }) {
  const cls =
    variant === "solid"
      ? "bg-slate-100 text-slate-950 hover:bg-white"
      : "bg-transparent text-slate-200 hover:bg-slate-800";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-xl px-4 py-2 text-sm font-medium transition",
        cls,
        disabled ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Tab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-sm font-medium transition",
        active ? "bg-slate-100 text-slate-950" : "text-slate-300 hover:bg-slate-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="grid gap-1">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        className="rounded-xl bg-slate-900 px-3 py-2 text-sm outline-none ring-1 ring-slate-800 focus:ring-slate-600"
        {...props}
      />
    </label>
  );
}

function Status({ error, ok }) {
  if (!error && !ok) return null;

  return (
    <div className="mt-2">
      {error && (
        <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200 ring-1 ring-red-500/30">
          {error}
        </div>
      )}
      {ok && (
        <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 ring-1 ring-emerald-500/30">
          {ok}
        </div>
      )}
    </div>
  );
}
