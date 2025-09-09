import sys
import os
import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
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
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
