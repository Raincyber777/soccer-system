# -*- coding: utf-8 -*-
"""加密、哈希与脱敏（PLAN 8.6）。

- 身份证 / 手机号：Fernet 对称加密后入库；
- 身份证检索：HMAC-SHA256 哈希列精确匹配，不存明文、不做模糊；
- 对外输出：一律掩码。
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from pathlib import Path
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

ID_CARD_MASK = "********"
PHONE_MASK = "****"


def _instance_file(name: str) -> Path:
    directory = Path(getattr(settings, "INSTANCE_DIR", Path(settings.BASE_DIR) / "instance"))
    directory.mkdir(parents=True, exist_ok=True)
    return directory / name


def _read_or_create_key(name: str, generator) -> str:
    path = _instance_file(name)
    if path.exists():
        value = path.read_text(encoding="utf-8").strip()
        if value:
            return value
    value = generator()
    try:
        path.write_text(value, encoding="utf-8")
        path.chmod(0o600)
    except OSError:
        pass
    return value


def _fernet_key() -> str:
    configured = (getattr(settings, "FIELD_ENCRYPTION_KEY", "") or "").strip()
    if configured:
        return configured
    return _read_or_create_key("field.key", lambda: Fernet.generate_key().decode())


def _fernet() -> Fernet:
    return Fernet(_fernet_key().encode())


def _hash_key() -> str:
    configured = (getattr(settings, "ID_CARD_HASH_KEY", "") or "").strip()
    if configured:
        return configured
    return _read_or_create_key("hash.key", lambda: secrets.token_hex(32))


def encrypt_text(raw: Optional[str]) -> Optional[str]:
    """明文 → 密文；空值返回 None。"""
    if not raw:
        return None
    return _fernet().encrypt(str(raw).encode("utf-8")).decode("ascii")


def decrypt_text(cipher: Optional[str]) -> str:
    """密文 → 明文；失败返回空串（不抛异常，避免列表页整体失败）。"""
    if not cipher:
        return ""
    try:
        return _fernet().decrypt(str(cipher).encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError, TypeError):
        return ""


def id_card_hash(raw: Optional[str]) -> str:
    """身份证号 → HMAC-SHA256（精确检索用）。"""
    if not raw:
        return ""
    return hmac.new(_hash_key().encode("utf-8"), str(raw).encode("utf-8"), hashlib.sha256).hexdigest()


def mask_id_card(raw: Optional[str]) -> str:
    """身份证掩码：保留前 6 位与后 4 位。"""
    value = str(raw or "")
    if not value:
        return ""
    if len(value) <= 10:
        return value[:1] + ID_CARD_MASK
    return value[:6] + ID_CARD_MASK + value[-4:]


def mask_phone(raw: Optional[str]) -> str:
    """手机号掩码：保留前 3 位与后 4 位。"""
    value = str(raw or "")
    if not value:
        return ""
    if len(value) <= 7:
        return value[:1] + PHONE_MASK
    return value[:3] + PHONE_MASK + value[-4:]


def mask_stored_id_card(cipher: Optional[str]) -> str:
    """库内密文 → 掩码明文。"""
    return mask_id_card(decrypt_text(cipher))


def mask_stored_phone(cipher: Optional[str]) -> str:
    """库内密文 → 手机号掩码。"""
    return mask_phone(decrypt_text(cipher))
