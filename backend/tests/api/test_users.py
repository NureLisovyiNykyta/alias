import datetime
import uuid
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages import ErrorMessage
from app.core.security import generate_token_pair
from app.models.card import CardPack, CardType
from app.models.enums import StatusEnum
from app.models.map import Map
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


class TestDeleteAccount:
    async def test_delete_my_account(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
    ) -> None:
        user = User(
            id=uuid.uuid4(),
            email="ghost@example.com",
            username="ghostuser",
            nickname="Ghost User",
            password_hash="some_hash",
            avatar_url="https://pub-xxx.r2.dev/avatars/ghost.webp",
        )
        test_db.add(user)

        private_map = Map(
            id=uuid.uuid4(),
            name="Private Map",
            is_public=False,
            size="LARGE",
            max_fields_count=50,
            author_id=user.id,
            status=StatusEnum.DRAFT.value,
        )
        public_map = Map(
            id=uuid.uuid4(),
            name="Public Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=user.id,
            status=StatusEnum.ACTIVE.value,
        )
        private_pack = CardPack(
            id=uuid.uuid4(),
            name="Private Pack",
            description="desc",
            is_public=False,
            type_id=test_card_type.id,
            author_id=user.id,
            status=StatusEnum.DRAFT.value,
        )
        test_db.add(private_map)
        test_db.add(public_map)
        test_db.add(private_pack)
        await test_db.flush()

        token = generate_token_pair(str(user.id)).access_token
        headers = {"Authorization": f"Bearer {token}"}

        with patch("app.services.user.image_service.delete_avatar", new_callable=AsyncMock) as mock_delete:
            response = await client.delete("/api/users/me", headers=headers)
            mock_delete.assert_called_once_with(user.id)

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

        # Anonymisation applied on the in-memory object (same session)
        assert user.deleted_at is not None
        assert user.email.startswith("deleted_")
        assert user.username.startswith("deleted_")
        assert user.nickname == "Deleted account"
        assert user.password_hash is None

        # Private content cascaded to trash (bulk UPDATE – need refresh)
        await test_db.refresh(private_map)
        assert private_map.deleted_at is not None

        await test_db.refresh(private_pack)
        assert private_pack.deleted_at is not None

        # Public content untouched
        await test_db.refresh(public_map)
        assert public_map.deleted_at is None

        # Subsequent request with the same token is rejected
        response = await client.get("/api/users/me", headers=headers)
        assert response.status_code == 401
        assert response.json()["detail"] == ErrorMessage.ACCOUNT_DELETED
