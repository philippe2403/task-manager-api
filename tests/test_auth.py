def test_signup_and_login(client):
    # signup
    r = client.post("/auth/signup", json={"email": "a@test.com", "password": "test123"})
    assert r.status_code == 201
    data = r.json()
    assert data["email"] == "a@test.com"
    assert "id" in data

    # login
    r = client.post(
        "/auth/login",
        data={"username": "a@test.com", "password": "test123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert token
