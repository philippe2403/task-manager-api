const API_BASE = "/api";

export function setToken(token) {
  localStorage.setItem("token", token);
}

export function getToken() {
  return localStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function signup(email, password) {
  return request("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

// OAuth2PasswordRequestForm expects x-www-form-urlencoded
export async function login(email, password) {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(`/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function listProjects() {
  return request("/projects");
}

export function createProject(name) {
  // if your backend uses query param: /projects?name=...
  return request(`/projects?name=${encodeURIComponent(name)}`, { method: "POST" });
}

export function deleteProject(projectId) {
  return request(`/projects/${projectId}`, { method: "DELETE" });
}

export function listTasks(projectId) {
  const q = projectId ? `?project_id=${projectId}` : "";
  return request(`/tasks${q}`);
}

export function createTask(projectId, title) {
  return request(
    `/tasks?project_id=${projectId}&title=${encodeURIComponent(title)}`,
    { method: "POST" }
  );
}

export function toggleTask(taskId, isDone) {
  const qs = new URLSearchParams();
  qs.set("is_done", isDone ? "true" : "false");

  return request(`/tasks/${taskId}?${qs.toString()}`, {
    method: "PATCH",
  });
}


export function deleteTask(taskId) {
  return request(`/tasks/${taskId}`, { method: "DELETE" });
}

export function renameTask(taskId, title) {
  const qs = new URLSearchParams();
  qs.set("title", title);

  return request(`/tasks/${taskId}?${qs.toString()}`, {
    method: "PATCH",
  });
}

