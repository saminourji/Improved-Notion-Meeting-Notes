import asyncio
from collections import deque
from typing import Awaitable, Callable, Deque, Dict, Optional

from structlog import get_logger

_logger = get_logger(__name__)


class BackgroundTaskManager:
    """Minimal async task manager; swap with Redis-backed workers later."""

    def __init__(self, max_concurrent_tasks: int = 1) -> None:
        self._max_concurrent_tasks = max_concurrent_tasks
        self._active_tasks: Dict[str, asyncio.Task] = {}
        self._pending: Deque[tuple[str, Callable[[], Awaitable[None]]]] = deque()
        self._lock = asyncio.Lock()

    async def submit(self, job_id: str, task_factory: Callable[[], Awaitable[None]]) -> None:
        async with self._lock:
            if len(self._active_tasks) >= self._max_concurrent_tasks:
                self._pending.append((job_id, task_factory))
                _logger.info("task_queued", job_id=job_id)
                return

            self._start_task(job_id, task_factory)

    def _start_task(self, job_id: str, task_factory: Callable[[], Awaitable[None]]) -> None:
        task = asyncio.create_task(self._run_task(job_id, task_factory))
        self._active_tasks[job_id] = task
        _logger.info("task_started", job_id=job_id)

    async def _run_task(self, job_id: str, task_factory: Callable[[], Awaitable[None]]) -> None:
        try:
            await task_factory()
        except Exception as exc:  # noqa: BLE001
            _logger.exception("task_failed", job_id=job_id, error=str(exc))
        finally:
            async with self._lock:
                self._active_tasks.pop(job_id, None)
                if self._pending:
                    next_job_id, next_factory = self._pending.popleft()
                    self._start_task(next_job_id, next_factory)

    async def cancel(self, job_id: str) -> bool:
        async with self._lock:
            task = self._active_tasks.get(job_id)
            if task:
                task.cancel()
                _logger.info("task_cancelled", job_id=job_id)
                return True
        return False

    def get_task(self, job_id: str) -> Optional[asyncio.Task]:
        return self._active_tasks.get(job_id)

    def set_max_concurrent_tasks(self, value: int) -> None:
        self._max_concurrent_tasks = value


_background_task_manager: Optional[BackgroundTaskManager] = None


def init_background_tasks(max_concurrent_tasks: int) -> BackgroundTaskManager:
    global _background_task_manager
    if _background_task_manager is None:
        _background_task_manager = BackgroundTaskManager(max_concurrent_tasks=max_concurrent_tasks)
    else:
        _background_task_manager.set_max_concurrent_tasks(max_concurrent_tasks)
    return _background_task_manager


def get_background_tasks() -> BackgroundTaskManager:
    if _background_task_manager is None:
        raise RuntimeError("BackgroundTaskManager not initialized")
    return _background_task_manager
