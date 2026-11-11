"""重置演示数据：删除负责人球队在演示赛事下的报名，便于重复录制。

用法：.venv\\Scripts\\python scripts\\reset_demo.py
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django  # noqa: E402

django.setup()

from apps.accounts.models import AthleteProfile  # noqa: E402
from apps.registration.models import Competition, Registration  # noqa: E402

DEMO_COMPETITION = '2026 成都市青少年足球杯'
DEMO_TEAMS = ('成都实验中学一队', '成都实验中学足球队')


def main():
    competition = Competition.objects.filter(name=DEMO_COMPETITION).first()
    if competition is None:
        print(f'未找到演示赛事：{DEMO_COMPETITION}')
        return
    competition.status = Competition.Status.OPEN
    competition.save(update_fields=['status'])

    queryset = Registration.objects.filter(competition=competition, team__name__in=DEMO_TEAMS)
    count = queryset.count()
    queryset.delete()

    # 清理演示球队中无学籍材料/未审核的临时球员，保证报名提交能通过完整度校验
    removed = (
        AthleteProfile.objects.filter(team__name__in=DEMO_TEAMS)
        .exclude(status='approved')
        .count()
    )
    AthleteProfile.objects.filter(team__name__in=DEMO_TEAMS).exclude(status='approved').delete()
    AthleteProfile.objects.filter(team__name__in=DEMO_TEAMS).filter(enrollment_cert_path__in=[None, '']).delete()

    print(f'已重置演示赛事「{DEMO_COMPETITION}」：删除 {count} 份报名单，赛事状态=报名中')
    print(f'已清理演示球队中的临时球员 {removed} 名，其余球员均具备学籍材料')


if __name__ == '__main__':
    main()
