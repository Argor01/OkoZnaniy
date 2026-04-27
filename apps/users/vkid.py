"""VK ID OAuth 2.1 authentication flow with PKCE.

VK has deprecated the legacy oauth.vk.com endpoint for new apps registered in
the VK ID dashboard. New apps must use id.vk.com with PKCE. django-allauth's
built-in vk provider only supports the legacy flow, so we implement VK ID
ourselves.

Flow:
  1. /api/users/vkid/login/ — generate state + PKCE verifier, redirect to
     id.vk.com/authorize.
  2. id.vk.com → user grants → redirect back to
     /api/users/vkid/callback/?code=...&state=...&device_id=...
  3. Exchange code for access_token at id.vk.com/oauth2/auth.
  4. Fetch profile from id.vk.com/oauth2/user_info.
  5. Find or create User by email/vk_id, issue JWT, redirect to
     FRONTEND_URL/google-callback?access=...&refresh=...

Requires VK_CLIENT_ID, VK_CLIENT_SECRET in env. The VK app's "Доверенный
Redirect URL" must include the absolute callback URL (e.g.
https://example.com/api/users/vkid/callback/).
"""
import base64
import hashlib
import logging
import secrets

import requests
from django.conf import settings
from django.http import HttpResponseBadRequest
from django.shortcuts import redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from rest_framework_simplejwt.tokens import RefreshToken

logger = logging.getLogger(__name__)

VK_AUTHORIZE_URL = "https://id.vk.com/authorize"
VK_TOKEN_URL = "https://id.vk.com/oauth2/auth"
VK_USER_INFO_URL = "https://id.vk.com/oauth2/user_info"

SESSION_STATE = "vkid_state"
SESSION_VERIFIER = "vkid_code_verifier"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _build_callback_url(request) -> str:
    frontend = getattr(settings, "FRONTEND_URL", "").rstrip("/")
    if frontend and not settings.DEBUG:
        return f"{frontend}{reverse('vkid_callback')}"
    return request.build_absolute_uri(reverse("vkid_callback"))


@require_GET
def vkid_login(request):
    """Start VK ID OAuth 2.1 flow with PKCE."""
    client_id = (settings.SOCIALACCOUNT_PROVIDERS.get("vk", {}).get("APP", {}).get("client_id") or "").strip()
    if not client_id:
        return HttpResponseBadRequest("VK is not configured (missing VK_CLIENT_ID)")

    state = _b64url(secrets.token_bytes(24))
    verifier = _b64url(secrets.token_bytes(48))
    challenge = _b64url(hashlib.sha256(verifier.encode("ascii")).digest())

    request.session[SESSION_STATE] = state
    request.session[SESSION_VERIFIER] = verifier
    request.session.modified = True

    redirect_uri = _build_callback_url(request)
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "scope": "email phone",
    }
    qs = "&".join(f"{k}={requests.utils.quote(str(v), safe='')}" for k, v in params.items())
    url = f"{VK_AUTHORIZE_URL}?{qs}"
    logger.info(f"VK ID: redirecting to {VK_AUTHORIZE_URL} (client_id={client_id}, redirect_uri={redirect_uri})")
    return redirect(url)


def _frontend_error(reason: str) -> "redirect":
    base = getattr(settings, "FRONTEND_URL", "").rstrip("/") or ""
    return redirect(f"{base}/login?error=vk_auth_failed&reason={requests.utils.quote(reason, safe='')}")


@csrf_exempt
@require_GET
def vkid_callback(request):
    """Handle VK ID redirect: exchange code, fetch profile, login user."""
    from allauth.socialaccount.models import SocialAccount
    from apps.users.models import User

    code = request.GET.get("code")
    state = request.GET.get("state")
    device_id = request.GET.get("device_id", "")

    if not code or not state:
        return _frontend_error("missing_code_or_state")

    saved_state = request.session.get(SESSION_STATE)
    verifier = request.session.get(SESSION_VERIFIER)
    if not saved_state or saved_state != state or not verifier:
        logger.warning("VK ID: state mismatch or missing verifier")
        return _frontend_error("state_mismatch")

    request.session.pop(SESSION_STATE, None)
    request.session.pop(SESSION_VERIFIER, None)

    client_id = (settings.SOCIALACCOUNT_PROVIDERS.get("vk", {}).get("APP", {}).get("client_id") or "").strip()
    client_secret = (settings.SOCIALACCOUNT_PROVIDERS.get("vk", {}).get("APP", {}).get("secret") or "").strip()
    redirect_uri = _build_callback_url(request)

    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "code_verifier": verifier,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
    }
    if device_id:
        token_data["device_id"] = device_id
    if client_secret:
        token_data["client_secret"] = client_secret

    try:
        token_resp = requests.post(VK_TOKEN_URL, data=token_data, timeout=15)
        token_resp.raise_for_status()
        token_json = token_resp.json()
    except requests.RequestException as e:
        logger.error(f"VK ID: token exchange failed: {e}")
        return _frontend_error("token_exchange_failed")

    access_token = token_json.get("access_token")
    if not access_token:
        logger.error(f"VK ID: no access_token in response: {token_json}")
        return _frontend_error("no_access_token")

    try:
        info_resp = requests.post(
            VK_USER_INFO_URL,
            data={"access_token": access_token, "client_id": client_id},
            timeout=15,
        )
        info_resp.raise_for_status()
        info_json = info_resp.json()
    except requests.RequestException as e:
        logger.error(f"VK ID: user_info failed: {e}")
        return _frontend_error("user_info_failed")

    profile = info_json.get("user") or info_json
    vk_user_id = str(profile.get("user_id") or profile.get("id") or "")
    email = (profile.get("email") or "").strip().lower() or None
    first_name = (profile.get("first_name") or "").strip()
    last_name = (profile.get("last_name") or "").strip()
    avatar = profile.get("avatar") or ""

    if not vk_user_id:
        logger.error(f"VK ID: no user_id in profile: {profile}")
        return _frontend_error("no_user_id")

    user = None
    try:
        social = SocialAccount.objects.get(provider="vk", uid=vk_user_id)
        user = social.user
    except SocialAccount.DoesNotExist:
        if email:
            user = User.objects.filter(email__iexact=email).first()
        if user is None:
            base_username = email.split("@")[0] if email else f"vk_{vk_user_id}"
            base_username = "".join(ch for ch in base_username if ch.isalnum() or ch in "_-") or f"vk_{vk_user_id}"
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            user = User.objects.create(
                username=username,
                email=email or "",
                first_name=first_name,
                last_name=last_name,
                role="client",
                email_verified=bool(email),
            )
        SocialAccount.objects.update_or_create(
            provider="vk",
            uid=vk_user_id,
            defaults={"user": user, "extra_data": profile},
        )

    refresh = RefreshToken.for_user(user)
    access = str(refresh.access_token)
    refresh_str = str(refresh)

    frontend = getattr(settings, "FRONTEND_URL", "").rstrip("/") or ""
    redirect_url = (
        f"{frontend}/google-callback?access={access}&refresh={refresh_str}"
        f"&user_id={user.id}&username={user.username}&role={user.role}"
    )
    logger.info(f"VK ID: login success user={user.username} role={user.role}")
    return redirect(redirect_url)
