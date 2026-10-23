# -*- coding: utf-8 -*-
"""accounts 模型：统一账号（PLAN 4.3.1）。"""
from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models

from common.db_fields import TinyIntegerField
from common.models import SoftDeleteMixin


class UserManager(BaseUserManager):
    """自定义用户管理器：按 username 认证，且默认排除软删除账号。"""

    def get_queryset(self):
        from common.models import AliveQuerySet

        return AliveQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)

    def with_deleted(self):
        from common.models import AliveQuerySet

        return AliveQuerySet(self.model, using=self._db)

    def create_user(self, username: str, password: str | None = None, **extra_fields):
        if not username:
            raise ValueError("username 不能为空")
        user = self.model(username=username, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def get_by_natural_key(self, username: str):
        return self.get(**{self.model.USERNAME_FIELD: username})


class User(SoftDeleteMixin, AbstractBaseUser):
    """统一账号：省级/市州/球队/高校/运动员/教练员/管理员共用。"""

    username = models.CharField(max_length=64, unique=True, verbose_name="登录账号")
    password = models.CharField(max_length=255, verbose_name="密码哈希")
    real_name = models.CharField(max_length=64, null=True, blank=True, verbose_name="姓名")
    phone = models.CharField(max_length=255, null=True, blank=True, verbose_name="手机号密文")
    id_card = models.CharField(max_length=255, null=True, blank=True, verbose_name="身份证密文")
    id_card_hash = models.CharField(max_length=64, null=True, blank=True, db_index=True, verbose_name="身份证哈希")
    role = TinyIntegerField(default=3, db_index=True, verbose_name="角色")
    org_id = models.BigIntegerField(null=True, blank=True, verbose_name="所属单位")
    region_id = models.BigIntegerField(null=True, blank=True, verbose_name="所属市州")
    status = TinyIntegerField(default=1, verbose_name="状态")
    last_login = models.DateTimeField(null=True, blank=True, db_column="last_login_at", verbose_name="最后登录")

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS: list[str] = []
    objects = UserManager()

    class Meta:
        db_table = "users"
        verbose_name = "账号"
        verbose_name_plural = "账号"
        base_manager_name = "all_objects"

    @property
    def is_active(self) -> bool:  # type: ignore[override]
        """账号可用：启用且未软删除。"""
        return self.status == 1 and self.deleted_at is None

    @property
    def role_text(self) -> str:
        from common.dicts import ROLE_TEXT, text_of

        return text_of(ROLE_TEXT, self.role)

    def __str__(self) -> str:
        return self.username
