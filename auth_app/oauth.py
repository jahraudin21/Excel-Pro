"""OAuth 2.0 provider integrations for Google, GitHub and Microsoft.

Each provider exposes ``build_authorize_url()`` to compose the consent redirect
and ``exchange_code()`` to trade the returned code for a normalised profile
dict::

    {"provider", "provider_user_id", "email", "name", "avatar_url",
     "email_verified", "access_token"}

Only ``requests`` is required (already installed). Configure credentials with
environment variables; unconfigured providers report ``is_configured() == False``
so the UI can hide their buttons instead of failing at redirect time.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import requests

REQUEST_TIMEOUT = 15

PROVIDERS: Dict[str, Dict[str, Any]] = {
    "google": {
        "label": "Google",
        "authorize_endpoint": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_endpoint": "https://oauth2.googleapis.com/token",
        "profile_endpoint": "https://www.googleapis.com/oauth2/v3/userinfo",
        "scopes": ["openid", "email", "profile"],
        "supports_pkce": True,
        "env": ("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
    },
    "github": {
        "label": "GitHub",
        "authorize_endpoint": "https://github.com/login/oauth/authorize",
        "token_endpoint": "https://github.com/login/oauth/access_token",
        "profile_endpoint": "https://api.github.com/user",
        "email_endpoint": "https://api.github.com/user/emails",
        "scopes": ["read:user", "user:email"],
        "supports_pkce": False,
        "env": ("GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"),
    },
    "microsoft": {
        "label": "Microsoft",
        "authorize_endpoint": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_endpoint": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "profile_endpoint": "https://graph.microsoft.com/v1.0/me",
        "scopes": ["openid", "email", "profile", "User.Read"],
        "supports_pkce": True,
        "env": ("MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"),
    },
}


@dataclass
class OAuthError(Exception):
    """Raised when a provider rejects or fails a step of the flow."""

    message: str
    provider: str = ""
    details: Dict[str, Any] = field(default_factory=dict)

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"[{self.provider or 'oauth'}] {self.message}"


def provider_names() -> List[str]:
    return list(PROVIDERS.keys())


def provider_label(name: str) -> str:
    return PROVIDERS.get(name, {}).get("label", name.title())


def credentials_for(name: str) -> Optional[tuple[str, str]]:
    """Return ``(client_id, client_secret)`` when both env vars are present."""
    spec = PROVIDERS.get(name)
    if not spec:
        return None
    client_id = os.environ.get(spec["env"][0], "").strip()
    client_secret = os.environ.get(spec["env"][1], "").strip()
    if not client_id or not client_secret:
        return None
    return client_id, client_secret


def is_configured(name: str) -> bool:
    return credentials_for(name) is not None


def configured_providers() -> List[str]:
    return [name for name in PROVIDERS if is_configured(name)]


def missing_env_hint(name: str) -> str:
    spec = PROVIDERS.get(name)
    if not spec:
        return f"Unknown provider '{name}'."
    joined = " and ".join(spec["env"])
    return f"Set {joined} to enable {provider_label(name)} sign-in."



# --------------------------------------------------------------------------- #
# Authorization redirect
# --------------------------------------------------------------------------- #
def build_authorize_url(
    provider: str,
    client_id: str,
    redirect_uri: str,
    state: str,
    scopes: Optional[List[str]] = None,
    code_challenge: Optional[str] = None,
) -> str:
    """Compose the provider consent URL the browser should be redirected to."""
    spec = PROVIDERS.get(provider)
    if not spec:
        raise OAuthError(f"Unsupported provider '{provider}'.")

    params: Dict[str, str] = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "state": state,
        "scope": " ".join(scopes or spec["scopes"]),
    }
    if provider == "google":
        params["access_type"] = "offline"
        params["prompt"] = "select_account"
    if provider == "github":
        params["allow_signup"] = "true"
    if code_challenge and spec.get("supports_pkce"):
        params["code_challenge"] = code_challenge
        params["code_challenge_method"] = "S256"

    return f"{spec['authorize_endpoint']}?{urlencode(params)}"


# --------------------------------------------------------------------------- #
# Token + profile exchange
# --------------------------------------------------------------------------- #
def _post_token(endpoint: str, data: Dict[str, str], provider: str) -> Dict[str, Any]:
    try:
        response = requests.post(
            endpoint,
            data=data,
            headers={"Accept": "application/json"},
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise OAuthError(f"Token exchange failed: {exc}", provider=provider) from exc

    if response.status_code >= 400:
        raise OAuthError(
            f"Token endpoint returned HTTP {response.status_code}.",
            provider=provider,
            details={"body": response.text[:400]},
        )

    try:
        payload = response.json()
    except ValueError as exc:
        raise OAuthError("Token endpoint did not return JSON.", provider=provider) from exc

    if "error" in payload:
        raise OAuthError(
            str(payload.get("error_description") or payload["error"]),
            provider=provider,
            details=payload,
        )
    return payload


def _get_json(url: str, token: str, provider: str) -> Any:
    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise OAuthError(f"Profile request failed: {exc}", provider=provider) from exc

    if response.status_code >= 400:
        raise OAuthError(
            f"Profile endpoint returned HTTP {response.status_code}.",
            provider=provider,
            details={"body": response.text[:400]},
        )
    return response.json()



def _normalise_google(payload: Dict[str, Any], access_token: str) -> Dict[str, Any]:
    return {
        "provider_user_id": str(payload.get("sub", "")),
        "email": (payload.get("email") or "").lower(),
        "name": payload.get("name") or payload.get("given_name") or "",
        "avatar_url": payload.get("picture"),
        "email_verified": bool(payload.get("email_verified", False)),
    }


def _normalise_github(profile: Dict[str, Any], emails: Any, access_token: str) -> Dict[str, Any]:
    email = (profile.get("email") or "").lower()
    verified = False
    if isinstance(emails, list):
        primary = next(
            (row for row in emails if isinstance(row, dict) and row.get("primary") and row.get("verified")),
            None,
        )
        if primary:
            email = str(primary.get("email", email)).lower()
            verified = True
        elif not email:
            fallback = next(
                (row for row in emails if isinstance(row, dict) and row.get("verified")),
                None,
            )
            if fallback:
                email = str(fallback.get("email", "")).lower()
                verified = True
    if email:
        # GitHub only exposes private emails through the verified list.
        verified = verified or any(
            isinstance(row, dict) and str(row.get("email", "")).lower() == email and row.get("verified")
            for row in (emails if isinstance(emails, list) else [])
        )
    return {
        "provider_user_id": str(profile.get("id", "")),
        "email": email,
        "name": profile.get("name") or profile.get("login") or "",
        "avatar_url": profile.get("avatar_url"),
        "email_verified": verified,
    }


def _normalise_microsoft(payload: Dict[str, Any], access_token: str) -> Dict[str, Any]:
    email = (
        payload.get("mail")
        or payload.get("userPrincipalName")
        or payload.get("preferred_username")
        or ""
    )
    return {
        "provider_user_id": str(payload.get("id", "")),
        "email": str(email).lower(),
        "name": payload.get("displayName") or "",
        "avatar_url": None,
        "email_verified": bool(email),
    }


def fetch_profile(provider: str, access_token: str) -> Dict[str, Any]:
    """Fetch and normalise the signed-in user's profile from the provider."""
    spec = PROVIDERS.get(provider)
    if not spec:
        raise OAuthError(f"Unsupported provider '{provider}'.")

    if provider == "github":
        profile = _get_json(spec["profile_endpoint"], access_token, provider)
        try:
            emails = _get_json(spec["email_endpoint"], access_token, provider)
        except OAuthError:
            emails = []
        normalised = _normalise_github(profile, emails, access_token)
    elif provider == "microsoft":
        payload = _get_json(spec["profile_endpoint"], access_token, provider)
        normalised = _normalise_microsoft(payload, access_token)
    else:
        payload = _get_json(spec["profile_endpoint"], access_token, provider)
        normalised = _normalise_google(payload, access_token)

    normalised["provider"] = provider
    normalised["access_token"] = access_token
    return normalised


def exchange_code(
    provider: str,
    client_id: str,
    client_secret: str,
    code: str,
    redirect_uri: str,
    code_verifier: Optional[str] = None,
) -> Dict[str, Any]:
    """Redeem ``code`` for an access token and the normalised user profile."""
    spec = PROVIDERS.get(provider)
    if not spec:
        raise OAuthError(f"Unsupported provider '{provider}'.")

    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    if code_verifier and spec.get("supports_pkce"):
        data["code_verifier"] = code_verifier

    token_payload = _post_token(spec["token_endpoint"], data, provider)
    access_token = token_payload.get("access_token")
    if not access_token:
        raise OAuthError("Token response did not include an access token.", provider=provider)

    return fetch_profile(provider, access_token)
