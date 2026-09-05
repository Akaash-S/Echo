import os
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any

# ---------------------------------------------------------------------------
# Firebase Admin SDK Initialization
# ---------------------------------------------------------------------------
# In production on Cloud Run with Default Application Credentials (ADC),
# firebase_admin.initialize_app() automatically discovers credentials.
# For local dev with a service account file, set GOOGLE_APPLICATION_CREDENTIALS
# or FIREBASE_SERVICE_ACCOUNT_PATH in your .env.
if not firebase_admin._apps:
    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH") or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if service_account_path and os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
    else:
        # Defaults to Google Application Default Credentials (ADC)
        firebase_admin.initialize_app()

security = HTTPBearer(auto_error=False)

async def get_verified_user(
    auth_credentials: HTTPAuthorizationCredentials | None = Depends(security)
) -> Dict[str, Any]:
    """
    Reusable FastAPI authentication dependency.
    
    1. Extracts the Bearer token from the Authorization header.
    2. Verifies the ID token against Firebase Auth using Firebase Admin SDK.
    3. Returns decoded token claims (including 'uid', 'email', etc.).
    4. Raises HTTP 401 Unauthorized if token is missing, invalid, or expired.
    
    Satisfies Non-Negotiable #2: Every backend route verifies the Firebase ID token
    server-side before touching data.
    """
    if not auth_credentials or not auth_credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header with Bearer token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_credentials.credentials

    try:
        # Verify the Firebase ID token server-side
        # check_revoked=True can optionally be passed for strict revocation checks
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        if not uid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing UID claim.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return decoded_token
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase ID token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase ID token has been revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase ID token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_verified_uid(
    user_claims: Dict[str, Any] = Depends(get_verified_user)
) -> str:
    """
    Convenience dependency to inject just the verified `uid` string into route handlers.
    Ensures routes never trust client-supplied UIDs in request bodies.
    """
    return user_claims["uid"]

async def require_admin(
    user_claims: Dict[str, Any] = Depends(get_verified_user)
) -> Dict[str, Any]:
    """
    Enforces Admin RBAC per Brief §3 & Security Constitution Rule 9.
    Verifies that the caller's token contains role == 'admin' or admin == True
    (or matches configured ADMIN_EMAILS environment variable for test accounts).
    Raises 403 Forbidden if the caller is not an admin.
    """
    admin_claim = user_claims.get("role") == "admin" or user_claims.get("admin") is True
    admin_emails = [e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
    user_email = (user_claims.get("email") or "").lower()

    if not admin_claim and (not user_email or user_email not in admin_emails):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin role required for this endpoint."
        )
    return user_claims
