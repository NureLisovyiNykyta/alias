import datetime
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages import ErrorMessage
from app.models.card import CardPack, CardType
from app.models.enums import StatusEnum
from app.models.map import Map, MapField, MapRating, SavedMap
from app.models.user import User
from tests.conftest import MAP_FIELD_0, MAP_FIELD_1


class TestMaps:
    async def test_create_map(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
        test_user: User,
    ) -> None:
        response = await client.post(
            "/api/maps/",
            json={
                "name": "My Map",
                "size": "LARGE",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "My Map"
        assert data["status"] == "DRAFT"
        assert data["author_id"] == str(test_user.id)

    async def test_update_map_success(
        self,
        client: AsyncClient,
        created_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        map_id = created_map["id"]
        response = await client.patch(
            f"/api/maps/{map_id}",
            json={"name": "Updated Map Name"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Map Name"

    async def test_update_map_forbidden(
        self,
        client: AsyncClient,
        created_map: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        map_id = created_map["id"]
        response = await client.patch(
            f"/api/maps/{map_id}",
            json={"name": "Stolen Name"},
            headers=second_user_auth_headers,
        )
        assert response.status_code == 403

    async def test_activate_map(
        self,
        client: AsyncClient,
        small_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        map_id = small_map["id"]

        sync_resp = await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [MAP_FIELD_0, MAP_FIELD_1]},
            headers=auth_headers,
        )
        assert sync_resp.status_code == 200

        response = await client.post(f"/api/maps/{map_id}/activate", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["status"] == "ACTIVE"

    async def test_activate_map_not_enough_fields(
        self,
        client: AsyncClient,
        small_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        map_id = small_map["id"]
        response = await client.post(f"/api/maps/{map_id}/activate", headers=auth_headers)
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_READY_FIELDS_COUNT.format(max_count=2)

    async def test_toggle_save_map(
        self,
        client: AsyncClient,
        created_map: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        map_id = created_map["id"]

        response = await client.post(f"/api/maps/{map_id}/save", headers=second_user_auth_headers)
        assert response.status_code == 200
        assert response.json() == {"saved": True}

        response = await client.post(f"/api/maps/{map_id}/save", headers=second_user_auth_headers)
        assert response.status_code == 200
        assert response.json() == {"saved": False}

    async def test_save_own_map_forbidden(
        self,
        client: AsyncClient,
        created_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        map_id = created_map["id"]
        response = await client.post(f"/api/maps/{map_id}/save", headers=auth_headers)
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_SAVE_OWN

    async def test_rate_own_map_forbidden(
        self,
        client: AsyncClient,
        created_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        map_id = created_map["id"]
        response = await client.post(
            f"/api/maps/{map_id}/rate",
            json={"score": 5},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_RATE_OWN

    async def test_rate_map_success(
        self,
        client: AsyncClient,
        created_map: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        map_id = created_map["id"]
        response = await client.post(
            f"/api/maps/{map_id}/rate",
            json={"score": 5},
            headers=second_user_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["rating_average"] == 5.0
        assert data["rating_count"] == 1

    async def test_list_my_maps(
        self,
        client: AsyncClient,
        created_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        response = await client.get("/api/maps/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert created_map["id"] in [item["id"] for item in data["items"]]

    async def test_list_public_maps(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Listed Public Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.get("/api/maps/public")
        assert response.status_code == 200
        assert str(map_obj.id) in [item["id"] for item in response.json()["items"]]

    async def test_public_maps_exclude_own_when_authenticated(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        own_map = Map(
            id=uuid.uuid4(),
            name="Own Public Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        other_map = Map(
            id=uuid.uuid4(),
            name="Other Public Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=second_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(own_map)
        test_db.add(other_map)
        await test_db.flush()

        response = await client.get("/api/maps/public", headers=auth_headers)
        assert response.status_code == 200
        ids = [item["id"] for item in response.json()["items"]]
        assert str(own_map.id) not in ids
        assert str(other_map.id) in ids

    async def test_public_maps_show_all_when_guest(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user: User,
    ) -> None:
        own_map = Map(
            id=uuid.uuid4(),
            name="Guest View Own Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        other_map = Map(
            id=uuid.uuid4(),
            name="Guest View Other Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=second_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(own_map)
        test_db.add(other_map)
        await test_db.flush()

        response = await client.get("/api/maps/public")
        assert response.status_code == 200
        ids = [item["id"] for item in response.json()["items"]]
        assert str(own_map.id) in ids
        assert str(other_map.id) in ids


class TestPublishMap:
    async def test_publish_map_success(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """ACTIVE private map with only public packs in fields publishes successfully."""
        public_pack = CardPack(
            id=uuid.uuid4(),
            name="Public Pack For Map",
            description="desc",
            is_public=True,
            type_id=test_card_type.id,
            author_id=second_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(public_pack)

        map_obj = Map(
            id=uuid.uuid4(),
            name="Map To Publish",
            is_public=False,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(map_obj)
        test_db.add(MapField(map_id=map_obj.id, position_index=0, time_limit=60, award=1, penalty=1, card_pack_id=public_pack.id))
        await test_db.flush()

        response = await client.post(f"/api/maps/{map_obj.id}/publish", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["is_public"] is True
        assert "author" in data

    async def test_publish_map_with_private_packs_fail(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_card_type: CardType,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """ACTIVE private map with a private pack in fields cannot be published."""
        private_pack = CardPack(
            id=uuid.uuid4(),
            name="Private Pack In Map",
            description="desc",
            is_public=False,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(private_pack)

        map_obj = Map(
            id=uuid.uuid4(),
            name="Map With Private Pack",
            is_public=False,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(map_obj)
        test_db.add(MapField(map_id=map_obj.id, position_index=0, time_limit=60, award=1, penalty=1, card_pack_id=private_pack.id))
        await test_db.flush()

        response = await client.post(f"/api/maps/{map_obj.id}/publish", headers=auth_headers)
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_PUBLISH_PRIVATE_PACKS

    async def test_publish_map_draft_fail(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """DRAFT map cannot be published."""
        map_obj = Map(
            id=uuid.uuid4(),
            name="Draft Map",
            is_public=False,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.post(f"/api/maps/{map_obj.id}/publish", headers=auth_headers)
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_NOT_ACTIVE_FOR_PUBLISH


class TestSavedMaps:
    async def test_save_and_list_saved(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        second_user: User,
        auth_headers: dict[str, str],
        second_user_auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Saveable Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=second_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(map_obj)
        await test_db.flush()

        save_resp = await client.post(f"/api/maps/{map_obj.id}/save", headers=auth_headers)
        assert save_resp.status_code == 200
        assert save_resp.json() == {"saved": True}

        response = await client.get("/api/maps/saved", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert str(map_obj.id) in [item["id"] for item in data["items"]]

    async def test_unsave_removes_from_saved(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Unsaveable Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=second_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(map_obj)
        await test_db.flush()

        await client.post(f"/api/maps/{map_obj.id}/save", headers=auth_headers)
        await client.post(f"/api/maps/{map_obj.id}/save", headers=auth_headers)

        response = await client.get("/api/maps/saved", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["total"] == 0


class TestSoftDeleteMap:
    async def test_soft_delete_map(
        self,
        client: AsyncClient,
        created_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        response = await client.delete(f"/api/maps/{created_map['id']}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["deleted_at"] is not None

    async def test_delete_someone_elses_map_forbidden(
        self,
        client: AsyncClient,
        created_map: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        response = await client.delete(f"/api/maps/{created_map['id']}", headers=second_user_auth_headers)
        assert response.status_code == 403

    async def test_restore_map(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Trashed Map",
            is_public=False,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
            deleted_at=datetime.datetime.now(datetime.timezone.utc),
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.post(f"/api/maps/{map_obj.id}/restore", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["deleted_at"] is None

    async def test_double_delete_map_returns_400(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Already Trashed",
            is_public=False,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
            deleted_at=datetime.datetime.now(datetime.timezone.utc),
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.delete(f"/api/maps/{map_obj.id}", headers=auth_headers)
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_ALREADY_DELETED

    async def test_restore_non_deleted_map_returns_400(
        self,
        client: AsyncClient,
        created_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        response = await client.post(f"/api/maps/{created_map['id']}/restore", headers=auth_headers)
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_NOT_IN_TRASH

    async def test_get_trash_maps(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
        created_map: dict,
    ) -> None:
        deleted_map = Map(
            id=uuid.uuid4(),
            name="In Trash",
            is_public=False,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
            deleted_at=datetime.datetime.now(datetime.timezone.utc),
        )
        test_db.add(deleted_map)
        await test_db.flush()

        response = await client.get("/api/maps/trash", headers=auth_headers)
        assert response.status_code == 200
        ids = [item["id"] for item in response.json()["items"]]
        assert str(deleted_map.id) in ids
        assert created_map["id"] not in ids


class TestDetailedMapView:
    async def test_get_map_detailed_public_guest(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Public Active Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.get(f"/api/maps/{map_obj.id}")
        assert response.status_code == 200
        data = response.json()
        assert "author" in data
        assert "nickname" in data["author"]
        assert data["size"] == "LARGE"

    async def test_get_map_detailed_private_owner(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Private Map",
            is_public=False,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.get(f"/api/maps/{map_obj.id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == str(map_obj.id)

    async def test_get_map_detailed_private_forbidden(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Private Map Forbidden",
            is_public=False,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.get(f"/api/maps/{map_obj.id}", headers=second_user_auth_headers)
        assert response.status_code == 403

    async def test_get_map_detailed_public_draft_forbidden(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        """Public map that is not yet ACTIVE is not visible to non-owners."""
        map_obj = Map(
            id=uuid.uuid4(),
            name="Public Draft",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.get(f"/api/maps/{map_obj.id}", headers=second_user_auth_headers)
        assert response.status_code == 403

    async def test_get_map_detailed_deleted_not_found(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Deleted Map",
            is_public=True,
            size="LARGE",
            max_fields_count=50,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
            deleted_at=datetime.datetime.now(datetime.timezone.utc),
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.get(f"/api/maps/{map_obj.id}", headers=auth_headers)
        assert response.status_code == 404
        assert response.json()["detail"] == ErrorMessage.MAP_NOT_FOUND


class TestMapsSearch:
    def _make_map(self, name: str, author_id: uuid.UUID, is_public: bool = False, status: str = StatusEnum.DRAFT.value) -> Map:
        return Map(
            id=uuid.uuid4(),
            name=name,
            is_public=is_public,
            size="LARGE",
            max_fields_count=64,
            author_id=author_id,
            status=status,
        )

    async def test_search_available_returns_my_public_and_saved(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """scope=available returns own maps, public maps from others, and saved maps."""
        my_map = self._make_map("My Draft Map Search", test_user.id)
        public_map = self._make_map("Shared Public Map Search", second_user.id, is_public=True, status=StatusEnum.ACTIVE.value)
        saved_private = self._make_map("Saved Private Map Search", second_user.id)
        test_db.add_all([my_map, public_map, saved_private])
        test_db.add(SavedMap(user_id=test_user.id, map_id=saved_private.id))
        await test_db.flush()

        response = await client.get("/api/maps/search?scope=available", headers=auth_headers)
        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(my_map.id) in ids
        assert str(public_map.id) in ids
        assert str(saved_private.id) in ids

    async def test_search_available_excludes_others_private_maps(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """scope=available does NOT return other users' private maps that are not saved."""
        other_private = self._make_map("Other Private Map", second_user.id)
        test_db.add(other_private)
        await test_db.flush()

        response = await client.get("/api/maps/search?scope=available", headers=auth_headers)
        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(other_private.id) not in ids

    async def test_search_my_returns_only_own_maps(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """scope=my returns only maps authored by the current user."""
        own_map = self._make_map("Own Map My Scope", test_user.id)
        other_map = self._make_map("Other Map My Scope", second_user.id, is_public=True, status=StatusEnum.ACTIVE.value)
        test_db.add_all([own_map, other_map])
        await test_db.flush()

        response = await client.get("/api/maps/search?scope=my", headers=auth_headers)
        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(own_map.id) in ids
        assert str(other_map.id) not in ids

    async def test_search_saved_returns_only_saved_maps(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """scope=saved returns only maps the user explicitly saved."""
        saved_map = self._make_map("Saved Map Scope", second_user.id, is_public=True, status=StatusEnum.ACTIVE.value)
        unsaved_map = self._make_map("Unsaved Map Scope", second_user.id, is_public=True, status=StatusEnum.ACTIVE.value)
        test_db.add_all([saved_map, unsaved_map])
        test_db.add(SavedMap(user_id=test_user.id, map_id=saved_map.id))
        await test_db.flush()

        response = await client.get("/api/maps/search?scope=saved", headers=auth_headers)
        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(saved_map.id) in ids
        assert str(unsaved_map.id) not in ids

    async def test_search_public_includes_own_published_map(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """scope=public includes the user's own public/active maps."""
        own_public = self._make_map("Own Public Search Map", test_user.id, is_public=True, status=StatusEnum.ACTIVE.value)
        test_db.add(own_public)
        await test_db.flush()

        response = await client.get("/api/maps/search?scope=public", headers=auth_headers)
        assert response.status_code == 200
        ids = [item["id"] for item in response.json()["items"]]
        assert str(own_public.id) in ids

    async def test_search_public_excludes_draft_maps(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """scope=public does NOT return non-active maps."""
        draft_map = self._make_map("Public Draft Excluded Map", test_user.id, is_public=True)
        test_db.add(draft_map)
        await test_db.flush()

        response = await client.get("/api/maps/search?scope=public", headers=auth_headers)
        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(draft_map.id) not in ids

    async def test_search_filters_by_q(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """q parameter filters results by name substring (case-insensitive)."""
        matched = self._make_map("Arctic Tundra Map", test_user.id)
        not_matched = self._make_map("Desert Sands Map", test_user.id)
        test_db.add_all([matched, not_matched])
        await test_db.flush()

        response = await client.get("/api/maps/search?scope=my&q=arctic", headers=auth_headers)
        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(matched.id) in ids
        assert str(not_matched.id) not in ids

    async def test_search_filters_by_size(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """size parameter filters maps by board size."""
        large_map = self._make_map("Large Map Filter", test_user.id)
        small_map = Map(
            id=uuid.uuid4(),
            name="Small Map Filter",
            is_public=False,
            size="SMALL",
            max_fields_count=32,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        test_db.add_all([large_map, small_map])
        await test_db.flush()

        response = await client.get("/api/maps/search?scope=my&size=LARGE", headers=auth_headers)
        assert response.status_code == 200
        ids = {item["id"] for item in response.json()["items"]}
        assert str(large_map.id) in ids
        assert str(small_map.id) not in ids

    async def test_search_returns_user_meta_saved_and_rated(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """is_saved=True and my_rating are populated when user saved and rated the map."""
        map_obj = self._make_map("Rated Saved Meta Map", second_user.id, is_public=True, status=StatusEnum.ACTIVE.value)
        test_db.add(map_obj)
        test_db.add(SavedMap(user_id=test_user.id, map_id=map_obj.id))
        test_db.add(MapRating(user_id=test_user.id, map_id=map_obj.id, score=3))
        await test_db.flush()

        response = await client.get(
            "/api/maps/search?scope=public&q=Rated+Saved+Meta", headers=auth_headers
        )
        assert response.status_code == 200
        item = next(i for i in response.json()["items"] if i["id"] == str(map_obj.id))
        assert item["is_saved"] is True
        assert item["my_rating"] == 3

    async def test_search_returns_user_meta_defaults(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """is_saved=False and my_rating=None when user has not interacted with the map."""
        map_obj = self._make_map("Uninteracted Meta Map", second_user.id, is_public=True, status=StatusEnum.ACTIVE.value)
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.get(
            "/api/maps/search?scope=public&q=Uninteracted+Meta", headers=auth_headers
        )
        assert response.status_code == 200
        item = next(i for i in response.json()["items"] if i["id"] == str(map_obj.id))
        assert item["is_saved"] is False
        assert item["my_rating"] is None


class TestMapsUserMeta:
    async def test_saved_list_always_has_is_saved_true(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """All items returned by /saved always have is_saved=True."""
        map_obj = Map(
            id=uuid.uuid4(),
            name="Saved Meta List Map",
            is_public=True,
            size="LARGE",
            max_fields_count=64,
            author_id=second_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(map_obj)
        test_db.add(SavedMap(user_id=test_user.id, map_id=map_obj.id))
        await test_db.flush()

        response = await client.get("/api/maps/saved", headers=auth_headers)
        assert response.status_code == 200
        items = response.json()["items"]
        assert all(item["is_saved"] is True for item in items)

    async def test_public_list_returns_is_saved_and_rating_for_auth_user(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """Authenticated users get is_saved and my_rating in /public responses."""
        map_obj = Map(
            id=uuid.uuid4(),
            name="Public Meta List Map",
            is_public=True,
            size="LARGE",
            max_fields_count=64,
            author_id=second_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(map_obj)
        test_db.add(SavedMap(user_id=test_user.id, map_id=map_obj.id))
        test_db.add(MapRating(user_id=test_user.id, map_id=map_obj.id, score=5))
        await test_db.flush()

        response = await client.get(
            "/api/maps/public?q=Public+Meta+List", headers=auth_headers
        )
        assert response.status_code == 200
        item = next(i for i in response.json()["items"] if i["id"] == str(map_obj.id))
        assert item["is_saved"] is True
        assert item["my_rating"] == 5

