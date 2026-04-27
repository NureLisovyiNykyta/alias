import uuid

import pytest
from httpx import AsyncClient

from app.core.messages import ErrorMessage
from app.models.map import MapTemplate
from tests.conftest import MAP_FIELD_0, MAP_FIELD_1

_FIELD_0 = MAP_FIELD_0
_FIELD_1 = MAP_FIELD_1


class TestMapFields:
    async def test_list_fields_owner(
        self,
        client: AsyncClient,
        small_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        """Owner can read fields of their own DRAFT private map."""
        map_id = small_map["id"]
        response = await client.get(f"/api/maps/{map_id}/fields", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    async def test_list_fields_forbidden(
        self,
        client: AsyncClient,
        small_map: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        """Another user cannot read fields of a DRAFT private map."""
        map_id = small_map["id"]
        response = await client.get(f"/api/maps/{map_id}/fields", headers=second_user_auth_headers)
        assert response.status_code == 403

    async def test_list_fields_public(
        self,
        client: AsyncClient,
        small_map_template: MapTemplate,
        auth_headers: dict[str, str],
    ) -> None:
        """Guest can read fields of a public ACTIVE map."""
        response = await client.post(
            "/api/maps/",
            json={"name": "Public Map", "is_public": True, "template_id": str(small_map_template.id)},
            headers=auth_headers,
        )
        assert response.status_code == 200
        map_id = response.json()["id"]

        sync_resp = await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [_FIELD_0, _FIELD_1]},
            headers=auth_headers,
        )
        assert sync_resp.status_code == 200

        activate_resp = await client.post(f"/api/maps/{map_id}/activate", headers=auth_headers)
        assert activate_resp.status_code == 200

        response = await client.get(f"/api/maps/{map_id}/fields")
        assert response.status_code == 200
        assert len(response.json()) == 2

    async def test_sync_fields_create_and_update(
        self,
        client: AsyncClient,
        small_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        """Create 2 fields, then update one and delete the other."""
        map_id = small_map["id"]

        create_resp = await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [_FIELD_0, _FIELD_1]},
            headers=auth_headers,
        )
        assert create_resp.status_code == 200
        fields = create_resp.json()
        assert len(fields) == 2
        assert fields[0]["position_index"] == 0
        assert fields[1]["position_index"] == 1

        field0_id = fields[0]["id"]
        update_resp = await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [{"id": field0_id, **_FIELD_0, "award": 5}]},
            headers=auth_headers,
        )
        assert update_resp.status_code == 200
        result = update_resp.json()
        assert len(result) == 1
        assert result[0]["id"] == field0_id
        assert result[0]["award"] == 5

    async def test_sync_fields_duplicate_positions(
        self,
        client: AsyncClient,
        small_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        """Two fields with the same position_index returns 400."""
        map_id = small_map["id"]
        response = await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [_FIELD_0, _FIELD_0]},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_FIELD_DUPLICATE_POSITIONS

    async def test_sync_fields_out_of_bounds(
        self,
        client: AsyncClient,
        small_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        """position_index >= max_fields_count returns 400."""
        map_id = small_map["id"]
        response = await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [{"position_index": 2, "time_limit": 60, "award": 1, "penalty": 1}]},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_FIELD_INDEX_OUT_OF_BOUNDS

    async def test_sync_fields_invalid_card_pack(
        self,
        client: AsyncClient,
        small_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        """A non-existent card_pack_id triggers IntegrityError → 400."""
        map_id = small_map["id"]
        response = await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [{**_FIELD_0, "card_pack_id": str(uuid.uuid4())}]},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_FIELD_INVALID_CARD_PACK

    async def test_sync_fields_forbidden(
        self,
        client: AsyncClient,
        small_map: dict,
        second_user_auth_headers: dict[str, str],
    ) -> None:
        """Another user cannot sync fields of someone else's map."""
        map_id = small_map["id"]
        response = await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [_FIELD_0, _FIELD_1]},
            headers=second_user_auth_headers,
        )
        assert response.status_code == 403

    async def test_sync_fields_active_limit(
        self,
        client: AsyncClient,
        small_map: dict,
        auth_headers: dict[str, str],
    ) -> None:
        """Syncing an ACTIVE map with wrong number of fields returns 400."""
        map_id = small_map["id"]

        await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [_FIELD_0, _FIELD_1]},
            headers=auth_headers,
        )
        activate_resp = await client.post(f"/api/maps/{map_id}/activate", headers=auth_headers)
        assert activate_resp.status_code == 200

        response = await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [_FIELD_0]},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_READY_FIELDS_COUNT.format(max_count=2)
