import datetime

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.messages import ErrorMessage
from app.models.user import User
from app.services.auth import create_password_reset_code, set_new_verification_code_for_user


class TestCheckEmail:
    async def test_available(self, client: AsyncClient) -> None:
        response = await client.post("/api/auth/check-email", json={"email": "new@example.com"})
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_taken(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post("/api/auth/check-email", json={"email": test_user.email})
        assert response.status_code == 409
        assert response.json()["detail"] == ErrorMessage.EMAIL_TAKEN


class TestCheckUsername:
    async def test_available(self, client: AsyncClient) -> None:
        response = await client.post("/api/auth/check-username", json={"username": "newuser"})
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_taken(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post("/api/auth/check-username", json={"username": test_user.username})
        assert response.status_code == 409
        assert response.json()["detail"] == ErrorMessage.USERNAME_TAKEN


class TestRegister:
    async def test_success(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/auth/register",
            json={"email": "new@example.com", "username": "newuser", "password": "newpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_duplicate_email(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post(
            "/api/auth/register",
            json={"email": test_user.email, "username": "otherusername", "password": "somepassword"},
        )
        assert response.status_code == 409
        assert response.json()["detail"] == ErrorMessage.EMAIL_TAKEN

    async def test_duplicate_username(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post(
            "/api/auth/register",
            json={"email": "other@example.com", "username": test_user.username, "password": "somepassword"},
        )
        assert response.status_code == 409
        assert response.json()["detail"] == ErrorMessage.USERNAME_TAKEN

    async def test_invalid_email_format(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/auth/register",
            json={"email": "not-an-email", "username": "someuser", "password": "somepassword"},
        )
        assert response.status_code == 422


class TestLogin:
    async def test_success(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "testpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_success_with_username(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post(
            "/api/auth/login",
            data={"username": test_user.username, "password": "testpassword123"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_wrong_password(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post(
            "/api/auth/login",
            data={"username": test_user.email, "password": "wrongpassword"},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == ErrorMessage.INVALID_CREDENTIALS

    async def test_user_not_found(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/auth/login",
            data={"username": "nobody@example.com", "password": "somepassword"},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == ErrorMessage.INVALID_CREDENTIALS


class TestRefreshToken:
    async def test_success(self, client: AsyncClient, tokens: dict[str, str]) -> None:
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        assert response.status_code == 200
        new_tokens = response.json()
        assert "access_token" in new_tokens
        assert "refresh_token" in new_tokens

    async def test_invalid_token(self, client: AsyncClient) -> None:
        response = await client.post("/api/auth/refresh", json={"refresh_token": "invalid.token.here"})
        assert response.status_code == 401
        assert response.json()["detail"] == ErrorMessage.TOKEN_INVALID

    async def test_access_token_rejected(self, client: AsyncClient, tokens: dict[str, str]) -> None:
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": tokens["access_token"]},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == ErrorMessage.TOKEN_INVALID_TYPE


class TestVerifyEmail:
    async def test_success(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict[str, str],
        test_db: AsyncSession,
    ) -> None:
        code = await set_new_verification_code_for_user(test_db, test_user)
        response = await client.post(
            "/api/auth/verify-email",
            json={"code": code},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_invalid_code(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict[str, str],
        test_db: AsyncSession,
    ) -> None:
        await set_new_verification_code_for_user(test_db, test_user)
        response = await client.post(
            "/api/auth/verify-email",
            json={"code": "000000"},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.VERIFICATION_CODE_INVALID

    async def test_already_verified(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict[str, str],
        test_db: AsyncSession,
    ) -> None:
        code = await set_new_verification_code_for_user(test_db, test_user)
        test_user.is_email_verified = True
        await test_db.commit()

        response = await client.post(
            "/api/auth/verify-email",
            json={"code": code},
            headers=auth_headers,
        )
        assert response.status_code == 422

    async def test_expired_code(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict[str, str],
        test_db: AsyncSession,
    ) -> None:
        await set_new_verification_code_for_user(test_db, test_user)
        test_user.verification_code_expires_at = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=1)
        await test_db.commit()

        response = await client.post(
            "/api/auth/verify-email",
            json={"code": test_user.verification_code},
            headers=auth_headers,
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.VERIFICATION_CODE_EXPIRED

    async def test_unauthorized(self, client: AsyncClient) -> None:
        response = await client.post("/api/auth/verify-email", json={"code": "123456"})
        assert response.status_code == 401


class TestResendCode:
    async def test_success(
        self,
        client: AsyncClient,
        auth_headers: dict[str, str],
    ) -> None:
        response = await client.post("/api/auth/resend-code", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_already_verified(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict[str, str],
        test_db: AsyncSession,
    ) -> None:
        test_user.is_email_verified = True
        await test_db.commit()

        response = await client.post("/api/auth/resend-code", headers=auth_headers)
        assert response.status_code == 422
        assert response.json()["detail"] == ErrorMessage.EMAIL_ALREADY_VERIFIED

    async def test_unauthorized(self, client: AsyncClient) -> None:
        response = await client.post("/api/auth/resend-code")
        assert response.status_code == 401


class TestForgotPassword:
    async def test_success(self, client: AsyncClient, test_user: User) -> None:
        response = await client.post("/api/auth/forgot-password", json={"email": test_user.email})
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_nonexistent_email_still_returns_ok(self, client: AsyncClient) -> None:
        response = await client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_google_user_still_returns_ok(
        self, client: AsyncClient, test_user: User, test_db: AsyncSession
    ) -> None:
        test_user.password_hash = None
        await test_db.commit()

        response = await client.post("/api/auth/forgot-password", json={"email": test_user.email})
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestResetPassword:
    async def test_success(
        self, client: AsyncClient, test_user: User, test_db: AsyncSession
    ) -> None:
        code = await create_password_reset_code(test_db, test_user.email)
        response = await client.post(
            "/api/auth/reset-password",
            json={"email": test_user.email, "code": code, "new_password": "newpassword123"},
        )
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

    async def test_invalid_code(
        self, client: AsyncClient, test_user: User, test_db: AsyncSession
    ) -> None:
        await create_password_reset_code(test_db, test_user.email)
        response = await client.post(
            "/api/auth/reset-password",
            json={"email": test_user.email, "code": "000000", "new_password": "newpassword123"},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.RESET_CODE_INVALID

    async def test_expired_code(
        self, client: AsyncClient, test_user: User, test_db: AsyncSession
    ) -> None:
        await create_password_reset_code(test_db, test_user.email)
        test_user.reset_password_code_expires_at = (
            datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=1)
        )
        await test_db.commit()

        response = await client.post(
            "/api/auth/reset-password",
            json={"email": test_user.email, "code": test_user.reset_password_code, "new_password": "newpassword123"},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.RESET_CODE_INVALID

    async def test_nonexistent_user(self, client: AsyncClient) -> None:
        response = await client.post(
            "/api/auth/reset-password",
            json={"email": "nobody@example.com", "code": "123456", "new_password": "newpassword123"},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == ErrorMessage.RESET_CODE_INVALID
