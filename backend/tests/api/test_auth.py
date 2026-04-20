from httpx import AsyncClient

from app.core.messages import ErrorMessage
from app.models.user import User


class TestCheckEmail:
    async def test_available(self, client: AsyncClient) -> None:
        response = await client.post("/api/auth/check-email", json={"email": "new@example.com"})
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_taken(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post("/api/auth/check-email", json={"email": test_user.email})
        assert response.status_code == 409
        assert response.json()["detail"] == ErrorMessage.EMAIL_TAKEN


class TestCheckUsername:
    async def test_available(self, client: AsyncClient) -> None:
        response = await client.post("/api/auth/check-username", json={"username": "newuser"})
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_taken(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post("/api/auth/check-username", json={"username": test_user.username})
        assert response.status_code == 409
        assert response.json()["detail"] == ErrorMessage.USERNAME_TAKEN


class TestRegister:
    async def test_success(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/auth/register",
            json={"email": "new@example.com", "username": "newuser", "password": "newpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_duplicate_email(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post(
            "/api/auth/register",
            json={"email": test_user.email, "username": "otherusername", "password": "somepassword"},
        )
        assert response.status_code == 409
        assert response.json()["detail"] == ErrorMessage.EMAIL_TAKEN

    async def test_duplicate_username(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post(
            "/api/auth/register",
            json={"email": "other@example.com", "username": test_user.username, "password": "somepassword"},
        )
        assert response.status_code == 409
        assert response.json()["detail"] == ErrorMessage.USERNAME_TAKEN

    async def test_invalid_email_format(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/auth/register",
            json={"email": "not-an-email", "username": "someuser", "password": "somepassword"},
        )
        assert response.status_code == 422


class TestLogin:
    async def test_success(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post(
            "/api/auth/login",
            json={"email": test_user.email, "password": "testpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_wrong_password(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post(
            "/api/auth/login",
            json={"email": test_user.email, "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == ErrorMessage.INVALID_CREDENTIALS

    async def test_user_not_found(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "somepassword"},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == ErrorMessage.INVALID_CREDENTIALS


class TestGetMe:
    async def test_success(
        self, client: AsyncClient, test_user: User, auth_headers: dict[str, str]
    ) -> None:
        response = await client.get("/api/users/me", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["email"] == test_user.email

    async def test_unauthorized(self, client: AsyncClient) -> None:
        response = await client.get("/api/users/me")
        assert response.status_code == 401


class TestRefreshToken:
    async def test_success(self, client: AsyncClient, tokens: dict[str, str]) -> None:
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert response.status_code == 200
        new_tokens = response.json()
        assert "access_token" in new_tokens
        assert "refresh_token" in new_tokens

    async def test_invalid_token(self, client: AsyncClient) -> None:
        response = await client.post("/api/auth/refresh", json={"refresh_token": "invalid.token.here"})
        assert response.status_code == 401
        assert response.json()["detail"] == ErrorMessage.TOKEN_INVALID

    async def test_access_token_rejected(self, client: AsyncClient, tokens: dict[str, str]) -> None:
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": tokens["access_token"]},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == ErrorMessage.TOKEN_INVALID_TYPE
