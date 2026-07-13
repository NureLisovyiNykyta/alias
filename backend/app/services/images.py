import asyncio
import io
import uuid

from fastapi import UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.exceptions import BadRequestError
from app.core.messages import ErrorMessage
from app.core import storage

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP"}

MAX_AVATAR_BYTES = 5 * 1024 * 1024   # 5 MB
MAX_COVER_BYTES = 10 * 1024 * 1024   # 10 MB

AVATAR_SIZE = (256, 256)
COVER_SIZE = (1200, 800)


def _validate_mime(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise BadRequestError(ErrorMessage.IMAGE_INVALID_FORMAT)


def _validate_size(data: bytes, max_bytes: int) -> None:
    if len(data) > max_bytes:
        max_mb = max_bytes // (1024 * 1024)
        raise BadRequestError(ErrorMessage.IMAGE_TOO_LARGE.format(max_mb=max_mb))


def _open_image(data: bytes) -> Image.Image:
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()
        img = Image.open(io.BytesIO(data))
    except (UnidentifiedImageError, Exception):
        raise BadRequestError(ErrorMessage.IMAGE_CORRUPTED)

    if img.format not in ALLOWED_PIL_FORMATS:
        raise BadRequestError(ErrorMessage.IMAGE_INVALID_FORMAT)

    return img


def _process_avatar(data: bytes) -> bytes:
    img = _open_image(data).convert("RGB")
    side = min(img.width, img.height)
    left = (img.width - side) // 2
    top = (img.height - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize(AVATAR_SIZE, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=85)
    return buf.getvalue()


def _process_cover(data: bytes) -> bytes:
    img = _open_image(data).convert("RGB")
    img = img.resize(COVER_SIZE, Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="WEBP", quality=85)
    return buf.getvalue()


async def upload_avatar(file: UploadFile, user_id: uuid.UUID) -> str:
    _validate_mime(file)
    data = await file.read()
    _validate_size(data, MAX_AVATAR_BYTES)

    processed = await asyncio.to_thread(_process_avatar, data)
    key = f"avatars/{user_id}.webp"
    return await storage.upload_file(key, processed, "image/webp")


async def upload_cover(file: UploadFile, folder: str, entity_id: uuid.UUID) -> str:
    _validate_mime(file)
    data = await file.read()
    _validate_size(data, MAX_COVER_BYTES)

    processed = await asyncio.to_thread(_process_cover, data)
    key = f"{folder}/{entity_id}.webp"
    return await storage.upload_file(key, processed, "image/webp")


async def delete_avatar(user_id: uuid.UUID) -> None:
    await storage.delete_file(f"avatars/{user_id}.webp")


async def delete_cover(folder: str, entity_id: uuid.UUID) -> None:
    await storage.delete_file(f"{folder}/{entity_id}.webp")
