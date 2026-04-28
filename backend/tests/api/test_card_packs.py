import datetime
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.messages import ErrorMessage
from app.models.card import CardPack, CardType
from app.models.enums import StatusEnum
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
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
    ) -> None:
        pack = CardPack(
            id=uuid.uuid4(),
            name="Listed Public Pack",
            description="desc",
            is_public=True,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(pack)
        await test_db.flush()

        response = await client.get("/api/card-packs/public")
        assert response.status_code == 200
        assert str(pack.id) in [item["id"] for item in response.json()["items"]]


class TestSavedCardPacks:
    async def test_save_and_list_saved(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        pack = CardPack(
            id=uuid.uuid4(),
            name="Saveable Pack",
            description="desc",
            is_public=True,
            type_id=test_card_type.id,
            author_id=second_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(pack)
        await test_db.flush()

        save_resp = await client.post(f"/api/card-packs/{pack.id}/save", headers=auth_headers)
        assert save_resp.status_code == 200
        assert save_resp.json() == {"saved": True}

        response = await client.get("/api/card-packs/saved", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert str(pack.id) in [item["id"] for item in data["items"]]

    async def test_unsave_removes_from_saved(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        pack = CardPack(
            id=uuid.uuid4(),
            name="Unsaveable Pack",
            description="desc",
            is_public=True,
            type_id=test_card_type.id,
            author_id=second_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(pack)
        await test_db.flush()

        await client.post(f"/api/card-packs/{pack.id}/save", headers=auth_headers)
        await client.post(f"/api/card-packs/{pack.id}/save", headers=auth_headers)

        response = await client.get("/api/card-packs/saved", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["total"] == 0


class TestSoftDeleteCardPack:
    async def test_soft_delete_pack(
        self,
        client: AsyncClient,
        created_pack: dict,
        auth_headers: dict[str, str],
    ) -> None:
        response = await client.delete(f"/api/card-packs/{created_pack['id']}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["deleted_at"] is not None

    async def test_delete_someone_elses_pack_forbidden(
        self,
        client: AsyncClient,
        created_pack: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        response = await client.delete(f"/api/card-packs/{created_pack['id']}", headers=second_user_auth_headers)
        assert response.status_code == 403

    async def test_restore_pack(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        pack = CardPack(
            id=uuid.uuid4(),
            name="Trashed Pack",
            description="desc",
            is_public=False,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
            deleted_at=datetime.datetime.now(datetime.timezone.utc),
        )
        test_db.add(pack)
        await test_db.flush()

        response = await client.post(f"/api/card-packs/{pack.id}/restore", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["deleted_at"] is None

    async def test_double_delete_pack_returns_400(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        pack = CardPack(
            id=uuid.uuid4(),
            name="Already Trashed",
            description="desc",
            is_public=False,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
            deleted_at=datetime.datetime.now(datetime.timezone.utc),
        )
        test_db.add(pack)
        await test_db.flush()

        response = await client.delete(f"/api/card-packs/{pack.id}", headers=auth_headers)
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.CARD_PACK_ALREADY_DELETED

    async def test_restore_non_deleted_pack_returns_400(
        self,
        client: AsyncClient,
        created_pack: dict,
        auth_headers: dict[str, str],
    ) -> None:
        response = await client.post(f"/api/card-packs/{created_pack['id']}/restore", headers=auth_headers)
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.CARD_PACK_NOT_IN_TRASH

    async def test_get_trash_packs(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
        auth_headers: dict[str, str],
        created_pack: dict,
    ) -> None:
        deleted_pack = CardPack(
            id=uuid.uuid4(),
            name="In Trash",
            description="desc",
            is_public=False,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
            deleted_at=datetime.datetime.now(datetime.timezone.utc),
        )
        test_db.add(deleted_pack)
        await test_db.flush()

        response = await client.get("/api/card-packs/trash", headers=auth_headers)
        assert response.status_code == 200
        ids = [item["id"] for item in response.json()["items"]]
        assert str(deleted_pack.id) in ids
        assert created_pack["id"] not in ids


class TestDetailedCardPackView:
    async def test_get_pack_detailed_public_guest(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
    ) -> None:
        pack = CardPack(
            id=uuid.uuid4(),
            name="Public Active Pack",
            description="desc",
            is_public=True,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(pack)
        await test_db.flush()

        response = await client.get(f"/api/card-packs/{pack.id}")
        assert response.status_code == 200
        data = response.json()
        assert "author" in data
        assert "nickname" in data["author"]
        assert "card_type" in data
        assert data["card_type"]["code"] == test_card_type.code

    async def test_get_pack_detailed_private_owner(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        pack = CardPack(
            id=uuid.uuid4(),
            name="Private Pack Owner",
            description="desc",
            is_public=False,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        test_db.add(pack)
        await test_db.flush()

        response = await client.get(f"/api/card-packs/{pack.id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == str(pack.id)

    async def test_get_pack_detailed_private_forbidden(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        pack = CardPack(
            id=uuid.uuid4(),
            name="Private Pack Forbidden",
            description="desc",
            is_public=False,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        test_db.add(pack)
        await test_db.flush()

        response = await client.get(f"/api/card-packs/{pack.id}", headers=second_user_auth_headers)
        assert response.status_code == 403

    async def test_get_pack_detailed_public_draft_forbidden(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        """Public pack that is not yet ACTIVE is not visible to non-owners."""
        pack = CardPack(
            id=uuid.uuid4(),
            name="Public Draft Pack",
            description="desc",
            is_public=True,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        test_db.add(pack)
        await test_db.flush()

        response = await client.get(f"/api/card-packs/{pack.id}", headers=second_user_auth_headers)
        assert response.status_code == 403

    async def test_get_pack_detailed_deleted_not_found(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        pack = CardPack(
            id=uuid.uuid4(),
            name="Deleted Pack",
            description="desc",
            is_public=True,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
            deleted_at=datetime.datetime.now(datetime.timezone.utc),
        )
        test_db.add(pack)
        await test_db.flush()

        response = await client.get(f"/api/card-packs/{pack.id}", headers=auth_headers)
        assert response.status_code == 404
        assert response.json()["detail"] == ErrorMessage.CARD_PACK_NOT_FOUND
