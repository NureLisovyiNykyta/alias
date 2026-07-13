"""Server-side timer management for game rooms.

Encapsulates the global ``_timer_tasks`` dict and the background
``_timer_guard`` coroutine so that ``GameService`` doesn't manage raw
asyncio tasks directly.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Callable, Coroutine

logger = logging.getLogger(__name__)

# room_code → asyncio.Task
_timer_tasks: dict[str, asyncio.Task] = {}


OnTimerExpired = Callable[[str], Coroutine]
"""Signature: async def callback(room_code: str) -> None"""


def schedule(room_code: str, delay: float, callback: OnTimerExpired) -> None:
    """Schedule a background task that fires *callback* after *delay* seconds.

    Any previously scheduled timer for this room is cancelled first.
    """
    cancel(room_code)
    task = asyncio.create_task(_guard(room_code, delay, callback))
    _timer_tasks[room_code] = task


def cancel(room_code: str) -> None:
    """Cancel a pending timer for *room_code* (if any)."""
    task = _timer_tasks.pop(room_code, None)
    if task is not None and not task.done():
        if task != asyncio.current_task():
            task.cancel()


async def _guard(room_code: str, delay: float, callback: OnTimerExpired) -> None:
    """Sleep, then invoke *callback*."""
    try:
        await asyncio.sleep(delay)
    except asyncio.CancelledError:
        return

    # Remove ourselves so cancel() won't try to self-cancel.
    _timer_tasks.pop(room_code, None)

    try:
        await callback(room_code)
    except Exception:
        logger.exception("Timer guard error for room %s", room_code)
