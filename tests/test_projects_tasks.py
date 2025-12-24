def signup_and_token(client, email):
    client.post("/auth/signup", json={"email": email, "password": "test123"})
    r = client.post(
        "/auth/login",
        data={"username": email, "password": "test123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    return r.json()["access_token"]

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

def test_protected_requires_token(client):
    r = client.get("/projects")
    assert r.status_code in (401, 403)

def test_user_can_create_project_and_task(client):
    token = signup_and_token(client, "u1@test.com")

    # create project
    r = client.post("/projects", params={"name": "My Project"}, headers=auth_headers(token))
    assert r.status_code == 201
    project_id = r.json()["id"]

    # create task
    r = client.post(
        "/tasks",
        params={"project_id": project_id, "title": "Task 1"},
        headers=auth_headers(token),
    )
    assert r.status_code == 201

    # list tasks
    r = client.get("/tasks", headers=auth_headers(token))
    assert r.status_code == 200
    assert len(r.json()) == 1

def test_ownership_is_enforced(client):
    t1 = signup_and_token(client, "owner@test.com")
    t2 = signup_and_token(client, "intruder@test.com")

    # owner creates project + task
    p = client.post("/projects", params={"name": "Private"}, headers=auth_headers(t1)).json()
    pid = p["id"]
    client.post("/tasks", params={"project_id": pid, "title": "Secret"}, headers=auth_headers(t1))

    # intruder should not see tasks
    r = client.get("/tasks", headers=auth_headers(t2))
    assert r.status_code == 200
    assert r.json() == []
