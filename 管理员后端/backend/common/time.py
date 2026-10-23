# -*- coding: utf-8 -*-
"""时间格式化（PLAN 5.6）：统一 Y-m-d H:i:s 输出，USE_TZ=False。"""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional

DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"
DATE_FORMAT = "%Y-%m-%d"


def fmt_dt(value: Any) -> Optional[str]:
    """datetime → 'Y-m-d H:i:s'；空值返回 None。"""
    if not value:
        return None
    if isinstance(value, datetime):
        return value.strftime(DATETIME_FORMAT)
    if isinstance(value, date):
        return value.strftime(DATE_FORMAT) + " 00:00:00"
    return str(value)


def fmt_date(value: Any) -> Optional[str]:
    """date/datetime → 'Y-m-d'；空值返回 None。"""
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date().strftime(DATE_FORMAT)
    if isinstance(value, date):
        return value.strftime(DATE_FORMAT)
    return str(value)[:10]


def parse_date(value: str) -> date:
    """'YYYY-MM-DD' → date。"""
    return datetime.strptime(value.strip(), DATE_FORMAT).date()


def today_start() -> datetime:
    now = datetime.now()
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def now() -> datetime:
    return datetime.now()
