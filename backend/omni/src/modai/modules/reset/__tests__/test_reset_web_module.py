from fastapi import FastAPI
from fastapi.testclient import TestClient

from modai.module import ModuleDependencies
from modai.modules.reset.reset_web_module import ResetWebModule
from modai.modules.reset.resettable import Resettable


class _OkResettable(Resettable):
    def __init__(self):
        self.call_count = 0

    def reset(self) -> None:
        self.call_count += 1


class _FailingResettable(Resettable):
    def reset(self) -> None:
        raise RuntimeError("intentional reset failure")


class _NotResettable:
    """A plain module that does not implement Resettable."""

    pass


def _make_client(*resettables: Resettable) -> tuple[TestClient, list[Resettable]]:
    modules = {f"dep_{i}": r for i, r in enumerate(resettables)}
    app = FastAPI()
    module = ResetWebModule(ModuleDependencies(modules), config={})
    app.include_router(module.router)
    return TestClient(app), list(resettables)


def test_reset_full_returns_200_and_calls_all_resettables():
    a, b = _OkResettable(), _OkResettable()
    client, _ = _make_client(a, b)

    response = client.post("/api/reset/full")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert a.call_count == 1
    assert b.call_count == 1


def test_reset_full_returns_500_when_one_module_fails():
    ok = _OkResettable()
    failing = _FailingResettable()
    client, _ = _make_client(ok, failing)

    response = client.post("/api/reset/full")

    assert response.status_code == 500
    body = response.json()
    assert body["error"] == "One or more resets failed"
    assert "_FailingResettable" in body["failed_modules"]


def test_reset_full_calls_remaining_modules_even_when_one_fails():
    failing = _FailingResettable()
    ok = _OkResettable()
    client, _ = _make_client(failing, ok)

    response = client.post("/api/reset/full")

    assert response.status_code == 500
    # The ok module must still have been called
    assert ok.call_count == 1


def test_reset_full_ignores_non_resettable_dependencies():
    non_resettable = _NotResettable()
    modules = {"plain": non_resettable}
    app = FastAPI()
    module = ResetWebModule(ModuleDependencies(modules), config={})
    app.include_router(module.router)
    client = TestClient(app)

    response = client.post("/api/reset/full")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_reset_full_with_no_registered_modules():
    client, _ = _make_client()

    response = client.post("/api/reset/full")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
