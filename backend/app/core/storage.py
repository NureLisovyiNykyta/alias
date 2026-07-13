import asyncio

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings
from app.core.exceptions import AppException


def _make_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID,
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )


async def upload_file(key: str, data: bytes, content_type: str) -> str:
    def _upload() -> None:
        client = _make_client()
        client.put_object(
            Bucket=settings.R2_BUCKET_NAME,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    try:
        await asyncio.to_thread(_upload)
    except (BotoCoreError, ClientError) as e:
        raise AppException(f"Failed to upload file: {e}") from e

    return f"{settings.R2_PUBLIC_URL}/{key}"


async def delete_file(key: str) -> None:
    def _delete() -> None:
        client = _make_client()
        client.delete_object(Bucket=settings.R2_BUCKET_NAME, Key=key)

    try:
        await asyncio.to_thread(_delete)
    except (BotoCoreError, ClientError) as e:
        raise AppException(f"Failed to delete file: {e}") from e
