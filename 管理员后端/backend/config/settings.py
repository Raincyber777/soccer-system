# -*- coding: utf-8 -*-
"""Django 配置：省级中小学足球系统 · 管理员端。

契约依据：
- PLAN_DJANGO.md 第 2 章（技术栈与环境变量）、2.1（禁止项）
- PLAN_DJANGO.md 第 8.3 节（trace_id + 三通道日志）
- PLAN_DJANGO.md 第 10 章（安全与合规）
- PLAN_DJANGO.md 第 6.9 节（缓存）、第 8.5 节（分页）
"""
import os
import secrets
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
# 工程根：football_admin/（backend 与 frontend 的父目录），展示层资源在 ../frontend
PROJECT_ROOT = BASE_DIR.parent


def _read_dotenv(path: Path) -> None:
    """极简 .env 读取（不引入第三方依赖）；已存在的环境变量优先，不被覆盖。"""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_read_dotenv(BASE_DIR / ".env")


def env(key: str, default: str = "") -> str:
    return (os.environ.get(key) or default).strip()


def env_int(key: str, default: int) -> int:
    try:
        return int(env(key, str(default)))
    except (TypeError, ValueError):
        return default


def env_bool(key: str, default: bool = False) -> bool:
    value = env(key, "1" if default else "0").lower()
    return value in {"1", "true", "yes", "on"}


# ---------------------------------------------------------------------------
# 基础设施
# ---------------------------------------------------------------------------
def _secret_key() -> str:
    """SECRET_KEY：环境变量 > instance/secret_key.txt > 随机生成并落盘（权限 600）。"""
    value = env("SECRET_KEY")
    if value:
        return value
    key_file = BASE_DIR / "instance" / "secret_key.txt"
    if key_file.exists():
        cached = key_file.read_text(encoding="utf-8").strip()
        if cached:
            return cached
    generated = secrets.token_hex(25)
    try:
        key_file.parent.mkdir(parents=True, exist_ok=True)
        key_file.write_text(generated, encoding="utf-8")
        try:
            os.chmod(key_file, 0o600)
        except OSError:
            pass
    except OSError:
        pass
    return generated


SECRET_KEY = _secret_key()
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = [h.strip() for h in env("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost,testserver").split(",") if h.strip()]

# ---------------------------------------------------------------------------
# 应用与中间件
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "apps.core",
    "apps.accounts",
    "apps.teams",
    "apps.players",
    "apps.selection",
    "apps.oplogs",
]

AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = ["django.contrib.auth.backends.ModelBackend"]

MIDDLEWARE = [
    # 自研：trace_id 必须最外层，保证任何响应都带 X-Trace-Id
    "common.middleware.TraceIdMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "common.middleware.RequestContextMiddleware",
    "common.middleware.ApiLogMiddleware",
    # 统一异常必须最内层，才能接住视图与 CSRF 抛出的异常
    "common.middleware.ExceptionMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # 纯后端服务：不提供模板渲染（展示层已移除，见 README「界面已归档」）
        "DIRS": [],
        "APP_DIRS": False,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.template.context_processors.csrf",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# 数据库：MySQL 8.0（InnoDB / utf8mb4），禁止 SQLite
# ---------------------------------------------------------------------------
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": env("DB_NAME", "football_admin"),
        "USER": env("DB_USER", "fa_admin"),
        "PASSWORD": env("DB_PASSWORD", "fa_2026_pwd"),
        "HOST": env("DB_HOST", "127.0.0.1"),
        "PORT": env("DB_PORT", "3306"),
        "CONN_MAX_AGE": 60,
        "OPTIONS": {
            "charset": "utf8mb4",
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
        },
        "TEST": {
            "CHARSET": "utf8mb4",
            "COLLATION": "utf8mb4_unicode_ci",
        },
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# 语言与时区（PLAN 4.1：USE_TZ=False，接口输出 Y-m-d H:i:s）
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "zh-hans"
TIME_ZONE = "Asia/Shanghai"
USE_I18N = True
USE_TZ = False

# ---------------------------------------------------------------------------
# 静态文件与模板
# ---------------------------------------------------------------------------
STATIC_URL = "/static/"
# 纯后端服务：不托管静态资源（原前端已归档）
STATICFILES_DIRS: list = []
STATIC_ROOT = BASE_DIR / "staticfiles"

# ---------------------------------------------------------------------------
# 会话与 CSRF（同源 Session + CSRF，PLAN 5.1 / 10）
# ---------------------------------------------------------------------------
SESSION_ENGINE = "django.contrib.sessions.backends.db"
SESSION_COOKIE_NAME = "fadmin_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", False)
SESSION_COOKIE_AGE = env_int("SESSION_COOKIE_AGE", 12 * 3600)
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

CSRF_COOKIE_NAME = "csrftoken"
CSRF_COOKIE_HTTPONLY = False  # 前端 JS 需读取 csrftoken 写入 X-CSRFToken
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", False)
CSRF_HEADER_NAME = "HTTP_X_CSRFTOKEN"
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in env(
        "CSRF_TRUSTED_ORIGINS",
        "http://127.0.0.1:8000,http://localhost:8000,http://127.0.0.1:8011,http://localhost:8011",
    ).split(",")
    if origin.strip()
]

X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"

# 生产安全开关：设置 DJANGO_SECURE=1 后启用 HTTPS/HSTS/安全 Cookie，
# 本地 HTTP 开发（默认）不启用，避免 runserver 跳转 HTTPS 导致无法访问。
DJANGO_SECURE = env_bool("DJANGO_SECURE", False)
if DJANGO_SECURE:
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = env_int("SECURE_HSTS_SECONDS", 31536000)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# ---------------------------------------------------------------------------
# 密码哈希：bcrypt（PLAN 2 / 10）
# ---------------------------------------------------------------------------
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

# ---------------------------------------------------------------------------
# 缓存：LocMemCache（PLAN 2 / 6.9）
# ---------------------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "football-admin-cache",
        "TIMEOUT": 3600,
    }
}
CACHE_TTL_DICT = env_int("CACHE_TTL_DICT", 3600)

# ---------------------------------------------------------------------------
# 业务参数
# ---------------------------------------------------------------------------
SELECTION_TOP_N = env_int("SELECTION_TOP_N", 5)
SELECTION_TOP_N_MAX = 11
MAX_EXPORT_ROWS = env_int("MAX_EXPORT_ROWS", 10000)
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
APP_VERSION = env("APP_VERSION", "1.0.0")
LOGIN_RATE_LIMIT_TIMES = env_int("LOGIN_RATE_LIMIT_TIMES", 5)
LOGIN_RATE_LIMIT_SECONDS = env_int("LOGIN_RATE_LIMIT_SECONDS", 300)

LOGIN_URL = "/login"
LOGIN_REDIRECT_URL = "/admin/teams"

# ---------------------------------------------------------------------------
# 日志：三通道按天轮转（PLAN 8.3）
#   business 14 天 / exception 30 天 / api 7 天
# ---------------------------------------------------------------------------
LOG_DIR = BASE_DIR / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

_LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | trace_id=%(trace_id)s | %(message)s"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {"format": _LOG_FORMAT},
        "simple": {"format": "%(asctime)s | %(levelname)s | %(message)s"},
    },
    "filters": {
        "trace_id": {"()": "common.logging.TraceIdFilter"},
    },
    "handlers": {
        "business": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "filename": str(LOG_DIR / "business.log"),
            "when": "midnight",
            "interval": 1,
            "backupCount": 14,
            "encoding": "utf-8",
            "formatter": "standard",
            "filters": ["trace_id"],
        },
        "exception": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "filename": str(LOG_DIR / "exception.log"),
            "when": "midnight",
            "interval": 1,
            "backupCount": 30,
            "encoding": "utf-8",
            "formatter": "standard",
            "filters": ["trace_id"],
        },
        "api": {
            "class": "logging.handlers.TimedRotatingFileHandler",
            "filename": str(LOG_DIR / "api.log"),
            "when": "midnight",
            "interval": 1,
            "backupCount": 7,
            "encoding": "utf-8",
            "formatter": "standard",
            "filters": ["trace_id"],
        },
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
            "filters": ["trace_id"],
        },
    },
    "loggers": {
        "business": {
            "handlers": ["business", "console"] if DEBUG else ["business"],
            "level": "INFO",
            "propagate": False,
        },
        "api": {
            "handlers": ["api", "console"] if DEBUG else ["api"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["exception"],
            "level": "ERROR",
            "propagate": False,
        },
    },
    "root": {"handlers": ["exception"], "level": "WARNING"},
}

# ---------------------------------------------------------------------------
# 敏感字段密钥（PLAN 8.6）：环境变量优先，否则落盘 instance/
# ---------------------------------------------------------------------------
FIELD_ENCRYPTION_KEY = env("FIELD_ENCRYPTION_KEY", "")
ID_CARD_HASH_KEY = env("ID_CARD_HASH_KEY", "")
INSTANCE_DIR = BASE_DIR / "instance"
INSTANCE_DIR.mkdir(parents=True, exist_ok=True)
