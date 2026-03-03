import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI

from modai.modules.health.simple_health_module import SimpleHealthModule
from modai.module import ModuleDependencies


@pytest.fixture
def client():
    app = FastAPI()
    dependencies = ModuleDependencies()
    module = SimpleHealthModule(dependencies, config={})
    app.include_router(module.router)
    return TestClient(app)


def test_health_endpoint_returns_healthy_status(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_health_endpoint_requires_no_authentication(client):
    """Health endpoint must be accessible without any session or credentials."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
