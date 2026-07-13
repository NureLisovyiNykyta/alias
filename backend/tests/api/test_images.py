import uuid
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError
from app.core.messages import ErrorMessage
from app.models.card import CardPack, CardType
from app.models.enums import StatusEnum
from app.models.map import Map
from app.models.user import User

FAKE_IMAGE = b"fake-image-bytes"
FAKE_AVATAR_URL = "https://pub-xxx.r2.dev/avatars/test.webp"
FAKE_COVER_URL = "https://pub-xxx.r2.dev/covers/test.webp"


class TestUploadAvatar:
    async def test_success(
        self, client: AsyncClient, test_user: User, auth_headers: dict[str, str]
    ) -> None:
        with patch("app.api.v1.users.image_service.upload_avatar", new_callable=AsyncMock, return_value=FAKE_AVATAR_URL):
            response = await client.post(
                "/api/users/me/avatar",
                files={"file": ("avatar.png", FAKE_IMAGE, "image/png")},
                headers=auth_headers,
            )
        assert response.status_code == 200
        assert response.json()["avatar_url"] == FAKE_AVATAR_URL

    async def test_unauthorized(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/users/me/avatar",
            files={"file": ("avatar.png", FAKE_IMAGE, "image/png")},
        )
        assert response.status_code == 401

    async def test_invalid_format_raises_400(
        self, client: AsyncClient, auth_headers: dict[str, str]
    ) -> None:
        with patch(
            "app.api.v1.users.image_service.upload_avatar",
            new_callable=AsyncMock,
            side_effect=BadRequestError(ErrorMessage.IMAGE_INVALID_FORMAT),
        ):
            response = await client.post(
                "/api/users/me/avatar",
                files={"file": ("avatar.txt", FAKE_IMAGE, "text/plain")},
                headers=auth_headers,
            )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.IMAGE_INVALID_FORMAT

    async def test_replace_existing_avatar(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        test_user.avatar_url = "https://pub-xxx.r2.dev/avatars/old.webp"
        await test_db.flush()

        new_url = "https://pub-xxx.r2.dev/avatars/new.webp"
        with patch("app.api.v1.users.image_service.upload_avatar", new_callable=AsyncMock, return_value=new_url):
            response = await client.post(
                "/api/users/me/avatar",
                files={"file": ("avatar.png", FAKE_IMAGE, "image/png")},
                headers=auth_headers,
            )
        assert response.status_code == 200
        assert response.json()["avatar_url"] == new_url


class TestDeleteAvatar:
    async def test_success_with_existing_avatar(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        test_user.avatar_url = FAKE_AVATAR_URL
        await test_db.flush()

        with patch("app.api.v1.users.image_service.delete_avatar", new_callable=AsyncMock) as mock_delete:
            response = await client.delete("/api/users/me/avatar", headers=auth_headers)
            mock_delete.assert_called_once_with(test_user.id)

        assert response.status_code == 200
        assert response.json()["avatar_url"] is None

    async def test_success_without_avatar(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        test_user.avatar_url = None
        await test_db.flush()

        with patch("app.api.v1.users.image_service.delete_avatar", new_callable=AsyncMock) as mock_delete:
            response = await client.delete("/api/users/me/avatar", headers=auth_headers)
            mock_delete.assert_not_called()

        assert response.status_code == 200
        assert response.json()["avatar_url"] is None

    async def test_unauthorized(self, client: AsyncClient) -> None:
        response = await client.delete("/api/users/me/avatar")
        assert response.status_code == 401


@pytest.fixture(
    params=[
        pytest.param(
            {
                "api_prefix": "/api/maps",
                "upload_patch": "app.api.v1.maps.image_service.upload_cover",
                "delete_patch": "app.api.v1.maps.image_service.delete_cover",
                "folder": "maps",
                "entity_type": "map",
            },
            id="maps",
        ),
        pytest.param(
            {
                "api_prefix": "/api/card-packs",
                "upload_patch": "app.api.v1.card_packs.image_service.upload_cover",
                "delete_patch": "app.api.v1.card_packs.image_service.delete_cover",
                "folder": "card-packs",
                "entity_type": "card_pack",
            },
            id="card-packs",
        ),
    ]
)
def cover_config(request: pytest.FixtureRequest) -> dict:
    return request.param


@pytest_asyncio.fixture
async def cover_entity(
    cover_config: dict,
    test_db: AsyncSession,
    test_user: User,
    test_card_type: CardType,
) -> dict:
    if cover_config["entity_type"] == "map":
        entity = Map(
            id=uuid.uuid4(),
            name="Cover Test Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        model_class = Map
    else:
        entity = CardPack(
            id=uuid.uuid4(),
            name="Cover Test Pack",
            description="desc",
            is_public=True,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        model_class = CardPack

    test_db.add(entity)
    await test_db.flush()
    return {"id": str(entity.id), "model_class": model_class}


class TestCoverUpload:
    async def test_success(
        self,
        client: AsyncClient,
        cover_config: dict,
        cover_entity: dict,
        auth_headers: dict[str, str],
    ) -> None:
        entity_id = cover_entity["id"]
        with patch(cover_config["upload_patch"], new_callable=AsyncMock, return_value=FAKE_COVER_URL):
            response = await client.post(
                f"{cover_config['api_prefix']}/{entity_id}/cover",
                files={"file": ("cover.png", FAKE_IMAGE, "image/png")},
                headers=auth_headers,
            )
        assert response.status_code == 200
        assert response.json()["cover_url"] == FAKE_COVER_URL

    async def test_unauthorized(
        self,
        client: AsyncClient,
        cover_config: dict,
        cover_entity: dict,
    ) -> None:
        entity_id = cover_entity["id"]
        response = await client.post(
            f"{cover_config['api_prefix']}/{entity_id}/cover",
            files={"file": ("cover.png", FAKE_IMAGE, "image/png")},
        )
        assert response.status_code == 401

    async def test_forbidden(
        self,
        client: AsyncClient,
        cover_config: dict,
        cover_entity: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        entity_id = cover_entity["id"]
        with patch(cover_config["upload_patch"], new_callable=AsyncMock, return_value=FAKE_COVER_URL):
            response = await client.post(
                f"{cover_config['api_prefix']}/{entity_id}/cover",
                files={"file": ("cover.png", FAKE_IMAGE, "image/png")},
                headers=second_user_auth_headers,
            )
        assert response.status_code == 403

    async def test_not_found(
        self,
        client: AsyncClient,
        cover_config: dict,
        auth_headers: dict[str, str],
    ) -> None:
        with patch(cover_config["upload_patch"], new_callable=AsyncMock, return_value=FAKE_COVER_URL):
            response = await client.post(
                f"{cover_config['api_prefix']}/{uuid.uuid4()}/cover",
                files={"file": ("cover.png", FAKE_IMAGE, "image/png")},
                headers=auth_headers,
            )
        assert response.status_code == 404

    async def test_invalid_format(
        self,
        client: AsyncClient,
        cover_config: dict,
        cover_entity: dict,
        auth_headers: dict[str, str],
    ) -> None:
        entity_id = cover_entity["id"]
        with patch(
            cover_config["upload_patch"],
            new_callable=AsyncMock,
            side_effect=BadRequestError(ErrorMessage.IMAGE_INVALID_FORMAT),
        ):
            response = await client.post(
                f"{cover_config['api_prefix']}/{entity_id}/cover",
                files={"file": ("cover.txt", FAKE_IMAGE, "text/plain")},
                headers=auth_headers,
            )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.IMAGE_INVALID_FORMAT

    async def test_replace_existing(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        cover_config: dict,
        cover_entity: dict,
        auth_headers: dict[str, str],
    ) -> None:
        entity_id = cover_entity["id"]
        model_class = cover_entity["model_class"]

        obj = (await test_db.execute(select(model_class).where(model_class.id == uuid.UUID(entity_id)))).scalar_one()
        obj.cover_url = "https://pub-xxx.r2.dev/covers/old.webp"
        await test_db.flush()

        new_url = "https://pub-xxx.r2.dev/covers/new.webp"
        with patch(cover_config["upload_patch"], new_callable=AsyncMock, return_value=new_url):
            response = await client.post(
                f"{cover_config['api_prefix']}/{entity_id}/cover",
                files={"file": ("cover.png", FAKE_IMAGE, "image/png")},
                headers=auth_headers,
            )
        assert response.status_code == 200
        assert response.json()["cover_url"] == new_url


class TestCoverDelete:
    async def test_success(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        cover_config: dict,
        cover_entity: dict,
        auth_headers: dict[str, str],
    ) -> None:
        entity_id = cover_entity["id"]
        model_class = cover_entity["model_class"]

        obj = (await test_db.execute(select(model_class).where(model_class.id == uuid.UUID(entity_id)))).scalar_one()
        obj.cover_url = FAKE_COVER_URL
        await test_db.flush()

        with patch(cover_config["delete_patch"], new_callable=AsyncMock) as mock_delete:
            response = await client.delete(
                f"{cover_config['api_prefix']}/{entity_id}/cover",
                headers=auth_headers,
            )
            mock_delete.assert_called_once_with(cover_config["folder"], uuid.UUID(entity_id))

        assert response.status_code == 200
        assert response.json()["cover_url"] is None

    async def test_unauthorized(
        self,
        client: AsyncClient,
        cover_config: dict,
        cover_entity: dict,
    ) -> None:
        entity_id = cover_entity["id"]
        response = await client.delete(f"{cover_config['api_prefix']}/{entity_id}/cover")
        assert response.status_code == 401

    async def test_forbidden(
        self,
        client: AsyncClient,
        cover_config: dict,
        cover_entity: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        entity_id = cover_entity["id"]
        response = await client.delete(
            f"{cover_config['api_prefix']}/{entity_id}/cover",
            headers=second_user_auth_headers,
        )
        assert response.status_code == 403

    async def test_not_found(
        self,
        client: AsyncClient,
        cover_config: dict,
        auth_headers: dict[str, str],
    ) -> None:
        response = await client.delete(
            f"{cover_config['api_prefix']}/{uuid.uuid4()}/cover",
            headers=auth_headers,
        )
        assert response.status_code == 404
