from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages import ErrorMessage
from app.models.user import User


class TestGetMe:
    async def test_success(
        self, client: AsyncClient, test_user: User, auth_headers: dict[str, str]
    ) -> None:
        response = await client.get("/api/users/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert "is_email_verified" in data

    async def test_unauthorized(self, client: AsyncClient) -> None:
        response = await client.get("/api/users/me")
        assert response.status_code == 401


class TestUpdateMe:
    async def test_success(self, client: AsyncClient, test_user: User, auth_headers: dict[str, str]) -> None:
        response = await client.patch(
            "/api/users/me",
            json={"nickname": "new_nickname", "avatar_url": "https://example.com/avatar.png"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["nickname"] == "new_nickname"
        assert data["avatar_url"] == "https://example.com/avatar.png"

    async def test_partial_update(self, client: AsyncClient, test_user: User, auth_headers: dict[str, str]) -> None:
        response = await client.patch(
            "/api/users/me",
            json={"nickname": "only_nickname"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["nickname"] == "only_nickname"

    async def test_unauthorized(self, client: AsyncClient) -> None:
        response = await client.patch("/api/users/me", json={"nickname": "x"})
        assert response.status_code == 401


class TestChangePassword:
    async def test_success(self, client: AsyncClient, auth_headers: dict[str, str]) -> None:
        response = await client.post(
            "/api/users/me/password",
            json={"old_password": "testpassword123", "new_password": "newpassword456"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_wrong_old_password(self, client: AsyncClient, auth_headers: dict[str, str]) -> None:
        response = await client.post(
            "/api/users/me/password",
            json={"old_password": "wrongpassword", "new_password": "newpassword456"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.INVALID_OLD_PASSWORD

    async def test_google_user_no_password(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        auth_headers: dict[str, str],
        test_user: User,
    ) -> None:
        test_user.password_hash = None
        await test_db.commit()

        response = await client.post(
            "/api/users/me/password",
            json={"old_password": "testpassword123", "new_password": "newpassword456"},
            headers=auth_headers,
        )
        assert response.status_code == 422
        assert response.json()["detail"] == ErrorMessage.GOOGLE_USER_NO_PASSWORD

    async def test_unauthorized(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/users/me/password",
            json={"old_password": "testpassword123", "new_password": "newpassword456"},
        )
        assert response.status_code == 401


class TestGetUserByUsername:
    async def test_success(
        self, client: AsyncClient, test_user: User, auth_headers: dict[str, str]
    ) -> None:
        response = await client.get(f"/api/users/{test_user.username}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user.username
        assert "nickname" in data
        assert "email" not in data

    async def test_not_found(self, client: AsyncClient, auth_headers: dict[str, str]) -> None:
        response = await client.get("/api/users/nonexistentuser", headers=auth_headers)
        assert response.status_code == 404
        assert response.json()["detail"] == ErrorMessage.USER_NOT_FOUND

    async def test_unauthorized(self, client: AsyncClient) -> None:
        response = await client.get("/api/users/someuser")
        assert response.status_code == 401
