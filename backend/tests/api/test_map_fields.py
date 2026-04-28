import datetime
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages import ErrorMessage
from app.models.card import CardPack, CardType
from app.models.enums import StatusEnum
from app.models.map import Map, MapField, MapTemplate
from app.models.user import User
from tests.conftest import MAP_FIELD_0 as _FIELD_0, MAP_FIELD_1 as _FIELD_1


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
        test_db: AsyncSession,
        small_map_template: MapTemplate,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """Guest can read fields of a public ACTIVE map."""
        map_obj = Map(
            id=uuid.uuid4(),
            name="Public Map",
            is_public=True,
            template_id=small_map_template.id,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        test_db.add(map_obj)
        field_0 = MapField(map_id=map_obj.id, **_FIELD_0)
        field_1 = MapField(map_id=map_obj.id, **_FIELD_1)
        test_db.add(field_0)
        test_db.add(field_1)
        await test_db.flush()

        response = await client.get(f"/api/maps/{map_obj.id}/fields")
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
        """A non-existent card_pack_id is caught by the accessibility check → 400."""
        map_id = small_map["id"]
        response = await client.put(
            f"/api/maps/{map_id}/fields",
            json={"fields": [{**_FIELD_0, "card_pack_id": str(uuid.uuid4())}]},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_FIELD_INACCESSIBLE_CARD_PACK

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


class TestMapFieldsIDOR:
    async def test_sync_map_fields_with_deleted_pack(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        small_map: dict,
        test_card_type: CardType,
        test_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """Attaching a soft-deleted pack returns 400."""
        deleted_pack = CardPack(
            id=uuid.uuid4(),
            name="Deleted Pack",
            description="desc",
            is_public=True,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.ACTIVE.value,
            deleted_at=datetime.datetime.now(datetime.timezone.utc),
        )
        test_db.add(deleted_pack)
        await test_db.flush()

        response = await client.put(
            f"/api/maps/{small_map['id']}/fields",
            json={"fields": [{**_FIELD_0, "card_pack_id": str(deleted_pack.id)}]},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_FIELD_INACCESSIBLE_CARD_PACK

    async def test_sync_map_fields_with_others_private_pack(
        self,
        client: AsyncClient,
        small_map: dict,
        test_pack_second_user: dict,
        auth_headers: dict[str, str],
    ) -> None:
        """Attaching another user's private pack returns 400."""
        response = await client.put(
            f"/api/maps/{small_map['id']}/fields",
            json={"fields": [{**_FIELD_0, "card_pack_id": test_pack_second_user["id"]}]},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.MAP_FIELD_INACCESSIBLE_CARD_PACK

    async def test_sync_map_fields_success(
        self,
        client: AsyncClient,
        test_db: AsyncSession,
        small_map: dict,
        test_card_type: CardType,
        test_user: User,
        second_user: User,
        auth_headers: dict[str, str],
    ) -> None:
        """Public foreign pack and own private pack can both be attached."""
        public_foreign_pack = CardPack(
            id=uuid.uuid4(),
            name="Public Pack from Second User",
            description="desc",
            is_public=True,
            type_id=test_card_type.id,
            author_id=second_user.id,
            status=StatusEnum.ACTIVE.value,
        )
        own_pack = CardPack(
            id=uuid.uuid4(),
            name="Own Private Pack",
            description="desc",
            is_public=False,
            type_id=test_card_type.id,
            author_id=test_user.id,
            status=StatusEnum.DRAFT.value,
        )
        test_db.add(public_foreign_pack)
        test_db.add(own_pack)
        await test_db.flush()

        response = await client.put(
            f"/api/maps/{small_map['id']}/fields",
            json={
                "fields": [
                    {**_FIELD_0, "card_pack_id": str(public_foreign_pack.id)},
                    {**_FIELD_1, "card_pack_id": str(own_pack.id)},
                ]
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        fields = response.json()
        assert len(fields) == 2
        pack_ids = {f["card_pack_id"] for f in fields}
        assert str(public_foreign_pack.id) in pack_ids
        assert str(own_pack.id) in pack_ids
