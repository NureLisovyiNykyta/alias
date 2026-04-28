import datetime
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages import ErrorMessage
from app.models.enums import StatusEnum
from app.models.map import Map, MapTemplate
from app.models.user import User
from tests.conftest import MAP_FIELD_0, MAP_FIELD_1


class TestMaps:
    async def test_create_map(
        self,
        client: AsyncClient,
        test_map_template: MapTemplate,
        auth_headers: dict[str, str],
        test_user: User,
    ) -> None:
        response = await client.post(
            "/api/maps/",
            json={
                "name": "My Map",
                "is_public": True,
                "template_id": str(test_map_template.id),
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
        test_map_template: MapTemplate,
        test_user: User,
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Listed Public Map",
            is_public=True,
            template_id=test_map_template.id,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.get("/api/maps/public")
        assert response.status_code == 200
        assert str(map_obj.id) in [item["id"] for item in response.json()["items"]]


class TestSavedMaps:
    async def test_save_and_list_saved(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_map_template: MapTemplate,
        second_user: User,
        auth_headers: dict[str, str],
        second_user_auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Saveable Map",
            is_public=True,
            template_id=test_map_template.id,
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
        test_map_template: MapTemplate,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Unsaveable Map",
            is_public=True,
            template_id=test_map_template.id,
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
        test_map_template: MapTemplate,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Trashed Map",
            is_public=False,
            template_id=test_map_template.id,
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
        test_map_template: MapTemplate,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Already Trashed",
            is_public=False,
            template_id=test_map_template.id,
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
        test_map_template: MapTemplate,
        test_user: User,
        auth_headers: dict[str, str],
        created_map: dict,
    ) -> None:
        deleted_map = Map(
            id=uuid.uuid4(),
            name="In Trash",
            is_public=False,
            template_id=test_map_template.id,
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
        test_map_template: MapTemplate,
        test_user: User,
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Public Active Map",
            is_public=True,
            template_id=test_map_template.id,
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
        assert "template" in data
        assert data["template"]["code"] == test_map_template.code

    async def test_get_map_detailed_private_owner(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        test_map_template: MapTemplate,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Private Map",
            is_public=False,
            template_id=test_map_template.id,
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
        test_map_template: MapTemplate,
        test_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Private Map Forbidden",
            is_public=False,
            template_id=test_map_template.id,
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
        test_map_template: MapTemplate,
        test_user: User,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        """Public map that is not yet ACTIVE is not visible to non-owners."""
        map_obj = Map(
            id=uuid.uuid4(),
            name="Public Draft",
            is_public=True,
            template_id=test_map_template.id,
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
        test_map_template: MapTemplate,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        map_obj = Map(
            id=uuid.uuid4(),
            name="Deleted Map",
            is_public=True,
            template_id=test_map_template.id,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
            deleted_at=datetime.datetime.now(datetime.timezone.utc),
        )
        test_db.add(map_obj)
        await test_db.flush()

        response = await client.get(f"/api/maps/{map_obj.id}", headers=auth_headers)
        assert response.status_code == 404
        assert response.json()["detail"] == ErrorMessage.MAP_NOT_FOUND
