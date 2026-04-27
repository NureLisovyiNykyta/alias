import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.messages import ErrorMessage
from app.models.card import CardType
from app.models.user import User
from tests.conftest import VALID_CARD_CONTENT


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
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr(settings, "MIN_ACTIVE_CARDS", 2)
        pack_id = created_pack["id"]

        sync_resp = await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={"cards": [{"content": VALID_CARD_CONTENT}, {"content": VALID_CARD_CONTENT}]},
            headers=auth_headers,
        )
        assert sync_resp.status_code == 200

        response = await client.post(f"/api/card-packs/{pack_id}/activate", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "ACTIVE"

    async def test_activate_pack_not_enough_cards(
        self,
        client: AsyncClient,
        created_pack: dict,
        auth_headers: dict[str, str],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr(settings, "MIN_ACTIVE_CARDS", 2)
        pack_id = created_pack["id"]

        response = await client.post(f"/api/card-packs/{pack_id}/activate", headers=auth_headers)
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.CARD_PACK_MIN_CARDS.format(
            min_cards=settings.MIN_ACTIVE_CARDS
        )

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
        assert data["total"] >= 1
        assert created_pack["id"] in [item["id"] for item in data["items"]]

    async def test_list_public_packs(
        self,
        client: AsyncClient,
        created_pack: dict,
        auth_headers: dict[str, str],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setattr(settings, "MIN_ACTIVE_CARDS", 2)
        pack_id = created_pack["id"]

        await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={"cards": [{"content": VALID_CARD_CONTENT}, {"content": VALID_CARD_CONTENT}]},
            headers=auth_headers,
        )
        activate_resp = await client.post(f"/api/card-packs/{pack_id}/activate", headers=auth_headers)
        assert activate_resp.status_code == 200

        response = await client.get("/api/card-packs/public")
        assert response.status_code == 200
        data = response.json()
        assert pack_id in [item["id"] for item in data["items"]]
