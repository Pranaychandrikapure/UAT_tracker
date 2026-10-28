import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import hash_password, verify_password
from app.db.init_db import init_db
from app.main import app


def test_password_hashing_security():
    pwd = "AdminSecurePassword2026!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert hashed.startswith("pbkdf2:sha256:")
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password("", hashed) is False
    assert verify_password(pwd, None) is False


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    import asyncio
    asyncio.run(init_db())


@pytest.mark.asyncio
async def test_admin_login_with_valid_username_and_password():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/admin/login",
            json={"username": "admin", "password": "admin123"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["login_method"] == "PASSWORD"
        assert data["user"]["role_title"] == "System Administrator"
        assert "token" in data
        assert len(data["token"]) > 10


@pytest.mark.asyncio
async def test_admin_login_with_admin_email():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/admin/login",
            json={"username": "admin@neml.in", "password": "admin123"},
        )
        assert res.status_code == 200
        assert res.json()["user"]["role_title"] == "System Administrator"


@pytest.mark.asyncio
async def test_admin_login_with_invalid_password():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/admin/login",
            json={"username": "admin", "password": "IncorrectPassword"},
        )
        assert res.status_code == 401
        assert "Invalid" in res.json()["detail"]


@pytest.mark.asyncio
async def test_non_admin_user_cannot_login_with_password():
    """Policy enforcement: Standard non-admin users MUST NOT be able to log in with username/password."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First ensure a non-admin developer exists via SSO
        sso_res = await client.post(
            "/api/v1/auth/google/callback",
            json={"email": "regular.dev@company.com", "display_name": "Regular Developer"},
        )
        assert sso_res.status_code == 200
        assert sso_res.json()["user"]["role_title"] == "Developer"

        # Now regular developer attempts to log in via username/password
        admin_login_res = await client.post(
            "/api/v1/auth/admin/login",
            json={"username": "regular.dev@company.com", "password": "anyPassword123"},
        )
        assert admin_login_res.status_code == 403
        assert "Standard users cannot log in with username and password" in admin_login_res.json()["detail"]
        assert "SSO" in admin_login_res.json()["detail"]


@pytest.mark.asyncio
async def test_non_admin_cannot_use_passwordless_login():
    """Policy enforcement: Passwordless direct email login is rejected for non-admin users."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "regular.dev@company.com"},
        )
        assert res.status_code == 403
        assert "SSO" in res.json()["detail"]


@pytest.mark.asyncio
async def test_sso_authentication_for_staff():
    """Policy enforcement: Stakeholders authenticate seamlessly via SSO."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/auth/google/callback",
            json={
                "email": "harshal.pm@neml.in",
                "display_name": "Harshal PM",
                "google_id": "google-oauth2|987654321",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["login_method"] == "GOOGLE_SSO"
        assert data["user"]["email"] == "harshal.pm@neml.in"
        assert "token" in data

