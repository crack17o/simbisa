"""
Compat Celery.

Objectif : permettre au backend de fonctionner même si Celery n'est pas installé
ou si l'on veut exécuter les tâches en mode synchrone (sans worker/beat).
"""

from __future__ import annotations

from functools import wraps
from typing import Any, Callable, TypeVar

T = TypeVar("T")


def _attach_sync_helpers(fn: Callable[..., T]) -> Callable[..., T]:
    """
    Ajoute .delay() et .apply_async() pour compat avec l'usage Celery.
    En mode sans Celery, ces méthodes exécutent la fonction immédiatement.
    """

    @wraps(fn)
    def delay(*args: Any, **kwargs: Any) -> T:
        return fn(*args, **kwargs)

    @wraps(fn)
    def apply_async(args: Any = None, kwargs: Any = None, **_opts: Any) -> T:
        return fn(*(args or ()), **(kwargs or {}))

    setattr(fn, "delay", delay)
    setattr(fn, "apply_async", apply_async)
    return fn


def shared_task(*d_args: Any, **d_kwargs: Any):
    """
    Décorateur compatible avec celery.shared_task.
    - Si Celery est dispo : délègue à celery.shared_task
    - Sinon : retourne une fonction normale avec .delay/.apply_async sync
    """
    try:
        from celery import shared_task as celery_shared_task  # type: ignore

        return celery_shared_task(*d_args, **d_kwargs)
    except Exception:
        # Sans Celery : on retourne un décorateur "no-op"
        def decorator(fn: Callable[..., T]) -> Callable[..., T]:
            return _attach_sync_helpers(fn)

        # Supporte @shared_task sans parenthèses
        if d_args and callable(d_args[0]) and len(d_args) == 1 and not d_kwargs:
            return decorator(d_args[0])
        return decorator

