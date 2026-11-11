"""行政区划与组织模型（provinces / cities / schools / teams）。"""
from django.conf import settings
from django.db import models


class GroupType(models.TextChoices):
    UNIVERSITY = 'university', '高校组'
    MIDDLE_SCHOOL = 'middle_school', '中学组'
    PRIMARY_SCHOOL = 'primary_school', '小学组'


class TeamStatus(models.TextChoices):
    PENDING = 'pending', '待审核'
    APPROVED = 'approved', '已通过'
    REJECTED = 'rejected', '已驳回'


class Province(models.Model):
    name = models.CharField('省份名称', max_length=50)
    code = models.CharField('行政区划编码', max_length=20, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'provinces'
        ordering = ['code']

    def __str__(self):
        return self.name


class City(models.Model):
    province = models.ForeignKey(Province, on_delete=models.CASCADE, related_name='cities')
    name = models.CharField('城市名称', max_length=50)
    code = models.CharField('行政区划编码', max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cities'
        ordering = ['code']
        constraints = [models.UniqueConstraint(fields=['province', 'code'], name='uniq_city_province_code')]

    def __str__(self):
        return self.name


class School(models.Model):
    class Status(models.TextChoices):
        ACTIVE = 'active', '正常'
        DISABLED = 'disabled', '已停用'

    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='schools')
    county = models.CharField('所属区县', max_length=50, null=True, blank=True)
    name = models.CharField('学校名称', max_length=150)
    logo = models.CharField('Logo 路径', max_length=255, null=True, blank=True)
    address = models.CharField('地址', max_length=255, null=True, blank=True)
    status = models.CharField('状态', max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_by = models.BigIntegerField('创建人 user_id', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'schools'
        ordering = ['id']
        indexes = [
            models.Index(fields=['city', 'status']),
            models.Index(fields=['city', 'county']),
        ]

    def __str__(self):
        return self.name


class Team(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='teams')
    coach = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='coached_teams')
    name = models.CharField('球队名称', max_length=150)
    logo = models.CharField('Logo 路径', max_length=255, null=True, blank=True)
    group_type = models.CharField('组别', max_length=30, choices=GroupType.choices)
    status = models.CharField('审核状态', max_length=20, choices=TeamStatus.choices, default=TeamStatus.PENDING)
    reject_reason = models.TextField('驳回原因', null=True, blank=True)
    # 以下字段用于用户端球队资料完善度校验
    found_time = models.CharField('成立时间', max_length=30, blank=True, default='')
    captain = models.CharField('队长姓名', max_length=50, blank=True, default='')
    intro = models.TextField('球队简介', blank=True, default='')
    flag_uploaded = models.BooleanField('队旗已上传', default=False)
    logo_uploaded = models.BooleanField('队徽已上传', default=False)
    photo_uploaded = models.BooleanField('合照已上传', default=False)
    honor_uploaded = models.BooleanField('荣誉已上传', default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'teams'
        ordering = ['id']
        indexes = [
            models.Index(fields=['school', 'status']),
            models.Index(fields=['coach', 'status']),
        ]

    def __str__(self):
        return self.name


class TeamCoachProfile(models.Model):
    """球队教练组成员：与登录账号解耦，供用户端/校级端维护教练组名单。"""

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='coach_members')
    name = models.CharField('姓名', max_length=50)
    category = models.CharField('类别', max_length=30, default='专职教练员')
    level = models.CharField('教练员等级', max_length=30, blank=True, default='')
    phone = models.CharField('联系电话', max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'team_coaches'
        ordering = ['id']
        indexes = [models.Index(fields=['team'])]

    def __str__(self):
        return f'{self.team.name} - {self.name}'
