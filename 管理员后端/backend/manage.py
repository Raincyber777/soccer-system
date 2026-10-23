#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Django 命令行入口：python manage.py <command>。"""
import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:  # pragma: no cover - 环境缺失时的友好提示
        raise ImportError(
            "无法导入 Django。请确认已激活虚拟环境并执行 pip install -r requirements.txt。"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
