import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.core.messages import ErrorMessage
from app.models.card import CardType
from app.models.user import User


@pytest_asyncio.fixture
async def created_pack(client: AsyncClient, test_card_type: CardType, auth_headers: dict[str, str]) -> dict:
    response = await client.post(
        "/api/card-packs/",
        json={
            "name": "Test Pack",
            "description": "A test card pack",
            "is_public": True,
            "type_id": str(test_card_type.id),
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    return response.json()


class TestCardPacks:
    async def test_create_pack(
        self,
        client: AsyncClient,
        test_card_type: CardType,
        auth_headers: dict[str, str],
        test_user: User,
    ) -> None:
        response = await client.post(
            "/api/card-packs/",
            json={
                "name": "My Pack",
                "description": "Pack description",
                "is_public": True,
                "type_id": str(test_card_type.id),
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "My Pack"
        assert data["status"] == "DRAFT"
        assert data["author_id"] == str(test_user.id)

    async def test_update_pack_success(
        self,
        client: AsyncClient,
        created_pack: dict,
        auth_headers: dict[str, str],
    ) -> None:
        pack_id = created_pack["id"]
        response = await client.patch(
            f"/api/card-packs/{pack_id}",
            json={"name": "Updated Pack Name"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Pack Name"

    async def test_update_pack_forbidden(
        self,
        client: AsyncClient,
        created_pack: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        pack_id = created_pack["id"]
        response = await client.patch(
            f"/api/card-packs/{pack_id}",
            json={"name": "Stolen Name"},
            headers=second_user_auth_headers,
        )
        assert response.status_code == 403

    async def test_activate_pack(
        self,
        client: AsyncClient,
        created_pack: dict,
        auth_headers: dict[str, str],
    ) -> None:
        pack_id = created_pack["id"]
        response = await client.post(f"/api/card-packs/{pack_id}/activate", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "ACTIVE"

    async def test_toggle_save_pack(
        self,
        client: AsyncClient,
        created_pack: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        pack_id = created_pack["id"]

        response = await client.post(f"/api/card-packs/{pack_id}/save", headers=second_user_auth_headers)
        assert response.status_code == 200
        assert response.json() == {"saved": True}

        response = await client.post(f"/api/card-packs/{pack_id}/save", headers=second_user_auth_headers)
        assert response.status_code == 200
        assert response.json() == {"saved": False}

    async def test_rate_own_pack_forbidden(
        self,
        client: AsyncClient,
        created_pack: dict,
        auth_headers: dict[str, str],
    ) -> None:
        pack_id = created_pack["id"]
        response = await client.post(
            f"/api/card-packs/{pack_id}/rate",
            json={"score": 5},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.CARD_PACK_RATE_OWN

    async def test_rate_pack_success(
        self,
        client: AsyncClient,
        created_pack: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        pack_id = created_pack["id"]
        response = await client.post(
            f"/api/card-packs/{pack_id}/rate",
            json={"score": 5},
            headers=second_user_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["rating_average"] == 5.0
        assert data["rating_count"] == 1

    async def test_list_my_packs(
        self,
        client: AsyncClient,
        created_pack: dict,
        auth_headers: dict[str, str],
    ) -> None:
        response = await client.get("/api/card-packs/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert data["total"] >= 1
        ids = [item["id"] for item in data["items"]]
        assert created_pack["id"] in ids

    async def test_list_public_packs(
        self,
        client: AsyncClient,
        created_pack: dict,
        auth_headers: dict[str, str],
    ) -> None:
        pack_id = created_pack["id"]
        await client.post(f"/api/card-packs/{pack_id}/activate", headers=auth_headers)

        response = await client.get("/api/card-packs/public")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        ids = [item["id"] for item in data["items"]]
        assert pack_id in ids
