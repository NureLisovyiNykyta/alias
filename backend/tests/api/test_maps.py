import pytest
from httpx import AsyncClient

from app.core.messages import ErrorMessage
from app.models.map import MapTemplate
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
        small_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        map_id = small_map["id"]

        await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [MAP_FIELD_0, MAP_FIELD_1]},
            headers=auth_headers,
        )
        activate_resp = await client.post(f"/api/maps/{map_id}/activate", headers=auth_headers)
        assert activate_resp.status_code == 200

        response = await client.get("/api/maps/public")
        assert response.status_code == 200
        data = response.json()
        assert map_id in [item["id"] for item in data["items"]]
