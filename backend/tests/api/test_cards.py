import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.core.messages import ErrorMessage
from app.models.card import CardType
from tests.conftest import VALID_CARD_CONTENT

VALID_CARD = VALID_CARD_CONTENT
INVALID_CARD = {"wrong_key": "Apple"}


class TestCards:
    async def test_list_cards_owner(
        self,
        client: AsyncClient,
        test_pack: dict,
        auth_headers: dict[str, str],
    ) -> None:
        """Owner can read cards of their own DRAFT private pack."""
        pack_id = test_pack["id"]
        response = await client.get(f"/api/card-packs/{pack_id}/cards", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    async def test_list_cards_forbidden(
        self,
        client: AsyncClient,
        test_pack: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        """Another user cannot read cards of a DRAFT private pack."""
        pack_id = test_pack["id"]
        response = await client.get(f"/api/card-packs/{pack_id}/cards", headers=second_user_auth_headers)
        assert response.status_code == 403

    async def test_list_cards_public_guest(
        self,
        client: AsyncClient,
        test_card_type: CardType,
        auth_headers: dict[str, str],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Guest can read cards of a public ACTIVE pack."""
        monkeypatch.setattr(settings, "MIN_ACTIVE_CARDS", 2)

        response = await client.post(
            "/api/card-packs/",
            json={
                "name": "Public Pack",
                "description": "Public test pack",
                "is_public": True,
                "type_id": str(test_card_type.id),
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        pack_id = response.json()["id"]

        sync_resp = await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={"cards": [{"content": VALID_CARD}, {"content": VALID_CARD}]},
            headers=auth_headers,
        )
        assert sync_resp.status_code == 200

        activate_resp = await client.post(f"/api/card-packs/{pack_id}/activate", headers=auth_headers)
        assert activate_resp.status_code == 200

        response = await client.get(f"/api/card-packs/{pack_id}/cards")
        assert response.status_code == 200
        assert len(response.json()) == 2

    async def test_sync_cards_create(
        self,
        client: AsyncClient,
        test_pack: dict,
        auth_headers: dict[str, str],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Creating 2 new cards returns them with assigned UUIDs."""
        monkeypatch.setattr(settings, "MIN_ACTIVE_CARDS", 2)
        pack_id = test_pack["id"]

        response = await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={"cards": [{"content": VALID_CARD}, {"content": VALID_CARD}]},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        for card in data:
            assert "id" in card
            assert card["content"] == VALID_CARD
            assert card["card_pack_id"] == pack_id

    async def test_sync_cards_update_and_delete(
        self,
        client: AsyncClient,
        test_pack: dict,
        auth_headers: dict[str, str],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """PUT replaces the full set: one card updated, one deleted, one created."""
        monkeypatch.setattr(settings, "MIN_ACTIVE_CARDS", 2)
        pack_id = test_pack["id"]

        initial = await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={"cards": [{"content": {"word": "One"}}, {"content": {"word": "Two"}}]},
            headers=auth_headers,
        )
        assert initial.status_code == 200
        cards = initial.json()
        card1_id = cards[0]["id"]

        response = await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={
                "cards": [
                    {"id": card1_id, "content": {"word": "Updated"}},
                    {"content": {"word": "New"}},
                ]
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        result = response.json()
        assert len(result) == 2

        contents = {c["content"]["word"] for c in result}
        assert contents == {"Updated", "New"}

    async def test_sync_cards_invalid_schema(
        self,
        client: AsyncClient,
        test_pack: dict,
        auth_headers: dict[str, str],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Card content not matching the JSON Schema returns 400."""
        monkeypatch.setattr(settings, "MIN_ACTIVE_CARDS", 2)
        pack_id = test_pack["id"]

        response = await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={"cards": [{"content": INVALID_CARD}, {"content": INVALID_CARD}]},
            headers=auth_headers,
        )
        assert response.status_code == 400

    async def test_sync_cards_wrong_id(
        self,
        client: AsyncClient,
        test_pack: dict,
        auth_headers: dict[str, str],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """A card with a made-up UUID in `id` returns 400."""
        monkeypatch.setattr(settings, "MIN_ACTIVE_CARDS", 2)
        pack_id = test_pack["id"]

        import uuid
        fake_id = str(uuid.uuid4())

        response = await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={
                "cards": [
                    {"id": fake_id, "content": VALID_CARD},
                    {"content": VALID_CARD},
                ]
            },
            headers=auth_headers,
        )
        assert response.status_code == 400

    async def test_sync_cards_forbidden(
        self,
        client: AsyncClient,
        test_pack: dict,
        second_user_auth_headers: dict[str, str],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Another user cannot sync cards of someone else's pack."""
        monkeypatch.setattr(settings, "MIN_ACTIVE_CARDS", 2)
        pack_id = test_pack["id"]

        response = await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={"cards": [{"content": VALID_CARD}, {"content": VALID_CARD}]},
            headers=second_user_auth_headers,
        )
        assert response.status_code == 403

    async def test_sync_cards_active_limit(
        self,
        client: AsyncClient,
        test_pack: dict,
        auth_headers: dict[str, str],
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        """Syncing an ACTIVE pack with fewer than MIN_ACTIVE_CARDS returns 400."""
        monkeypatch.setattr(settings, "MIN_ACTIVE_CARDS", 2)
        pack_id = test_pack["id"]

        await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={"cards": [{"content": VALID_CARD}, {"content": VALID_CARD}]},
            headers=auth_headers,
        )
        activate_resp = await client.post(f"/api/card-packs/{pack_id}/activate", headers=auth_headers)
        assert activate_resp.status_code == 200

        response = await client.put(
            f"/api/card-packs/{pack_id}/cards",
            json={"cards": [{"content": VALID_CARD}]},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.CARD_PACK_ACTIVE_MIN_CARDS.format(
            min_cards=settings.MIN_ACTIVE_CARDS
        )
