# -*- coding: utf-8 -*-
"""selection 服务：评分录入/修改、汇总排名、导出、最佳球员生成（PLAN 5.4.5–5.4.8 / 6.4–6.7）。"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.db import IntegrityError, connection, transaction
from django.db.models import F
from django.utils import timezone

from apps.accounts.models import User
from apps.oplogs.services import log_operation
from apps.players.models import Player
from apps.selection.models import Event, SelectionResult, SelectionScore
from apps.selection.serializers import result_row, score_row, summary_row
from common.codes import ResponseCode
from common.crypto import mask_stored_id_card
from common.dicts import (
    ACTION_RESULT_GENERATE,
    ACTION_SCORE_CREATE,
    ACTION_SCORE_EXPORT,
    ACTION_SCORE_UPDATE,
    CATEGORY_TEXT,
    MODULE_SELECTION,
    STAGE_TEXT,
    text_of,
)
from common.exceptions import BusinessException
from common.exports import csv_response, xlsx_response
from common.pagination import paginate
from common.serializers import page_payload
from common.time import fmt_dt

DIMENSIONS = ("physical_score", "technical_score", "tactical_score", "mental_score", "potential_score")
MONEY = Decimal("0.01")


# ---------------------------------------------------------------------------
# 评分录入与修改
# ---------------------------------------------------------------------------
def _total_of(payload: Dict[str, Any]) -> Decimal:
    total = sum((payload[field] for field in DIMENSIONS), Decimal("0"))
    return total.quantize(MONEY)


def _score_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    data = {field: payload[field] for field in DIMENSIONS}
    data["total_score"] = _total_of(payload)
    data["remark"] = payload.get("remark") or ""
    return data


def create_score(payload: Dict[str, Any], judge: Any) -> Dict[str, Any]:
    """新增评分：组别校验、唯一键兜底、总分服务端计算（PLAN 6.4）。"""
    event = Event.objects.filter(pk=payload["event_id"]).first()
    if event is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "赛事不存在")

    player = Player.objects.filter(pk=payload["player_id"]).first()
    if player is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "球员档案不存在")

    if player.category != event.category:
        raise BusinessException(ResponseCode.BUSINESS_ERROR, "球员组别与赛事组别不一致")

    stage = int(payload["stage"])
    duplicated = SelectionScore.objects.filter(
        event_id=event.id, player_id=player.id, stage=stage, judge_id=getattr(judge, "pk", None)
    ).exists()
    if duplicated:
        raise BusinessException(ResponseCode.DATA_EXISTS, "该评委已提交过该球员本阶段评分")

    data = _score_payload(payload)
    with transaction.atomic():
        try:
            score = SelectionScore.objects.create(
                event=event,
                player=player,
                team_id=player.team_id,
                category=player.category,
                stage=stage,
                judge=judge,
                judge_name=getattr(judge, "real_name", "") or getattr(judge, "username", ""),
                version=1,
                **data,
            )
        except IntegrityError:
            raise BusinessException(ResponseCode.DATA_EXISTS, "该评委已提交过该球员本阶段评分") from None

        log_operation(
            MODULE_SELECTION,
            ACTION_SCORE_CREATE,
            {
                "score_id": score.id,
                "event_id": event.id,
                "player_id": player.id,
                "stage": stage,
                "total_score": float(data["total_score"]),
            },
        )

    return get_score(score.id)


def get_score(score_id: int) -> Dict[str, Any]:
    score = (
        SelectionScore.objects.select_related("event", "player", "team")
        .filter(pk=score_id)
        .first()
    )
    if score is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "评分记录不存在")
    return score_row(score)


def update_score(score_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    """修改评分：乐观锁 version，冲突返回 30008（PLAN 6.4）。"""
    score = SelectionScore.objects.filter(pk=score_id).first()
    if score is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "评分记录不存在")
    if score.version != int(payload["version"]):
        raise BusinessException(ResponseCode.VERSION_CONFLICT)

    before = {field: float(getattr(score, field)) for field in DIMENSIONS}
    before["total_score"] = float(score.total_score)
    data = _score_payload(payload)

    with transaction.atomic():
        affected = SelectionScore.objects.filter(pk=score_id, version=int(payload["version"])).update(
            **data,
            version=F("version") + 1,
            updated_at=timezone.now(),
        )
        if not affected:
            raise BusinessException(ResponseCode.VERSION_CONFLICT)
        log_operation(
            MODULE_SELECTION,
            ACTION_SCORE_UPDATE,
            {
                "score_id": score_id,
                "before": before,
                "after": {key: float(value) for key, value in data.items() if key != "remark"},
            },
        )

    return get_score(score_id)


def list_scores(filters: Dict[str, Any], page_num: int, page_size: int) -> Dict[str, Any]:
    queryset = SelectionScore.objects.select_related("event", "player", "team")
    if filters.get("event_id"):
        queryset = queryset.filter(event_id=filters["event_id"])
    if filters.get("stage"):
        queryset = queryset.filter(stage=filters["stage"])
    if filters.get("category"):
        queryset = queryset.filter(category=filters["category"])
    if filters.get("team_id"):
        queryset = queryset.filter(team_id=filters["team_id"])
    keyword = (filters.get("keyword") or "").strip()
    if keyword:
        queryset = queryset.filter(player__name__istartswith=keyword)
    rows, total = paginate(queryset.order_by("-updated_at", "-id"), page_num, page_size)
    return page_payload([score_row(item) for item in rows], total, page_num, page_size)


# ---------------------------------------------------------------------------
# 汇总排名（MySQL 8 窗口函数）
# ---------------------------------------------------------------------------
_RANK_SQL = """
    SELECT s.player_id,
           s.team_id,
           s.category,
           COUNT(*) AS judge_count,
           AVG(s.total_score) AS avg_score,
           AVG(s.physical_score) AS physical_avg,
           AVG(s.technical_score) AS technical_avg,
           AVG(s.tactical_score) AS tactical_avg,
           AVG(s.mental_score) AS mental_avg,
           AVG(s.potential_score) AS potential_avg,
           ROW_NUMBER() OVER (ORDER BY AVG(s.total_score) DESC, s.player_id ASC) AS `rank`
      FROM selection_scores s
     WHERE s.event_id = %s AND s.stage = %s {extra}
     GROUP BY s.player_id, s.team_id, s.category
     ORDER BY `rank`
"""


def _where(extra_filters: Dict[str, Any]) -> tuple:
    clauses, params = [], []
    if extra_filters.get("category"):
        clauses.append("AND s.category = %s")
        params.append(extra_filters["category"])
    return (" ".join(clauses), params)


def ranked_rows(event_id: int, stage: int, category: Optional[int] = None) -> List[Dict[str, Any]]:
    """按均分排名（全局名次，并列按 player_id 升序）。"""
    extra, params = _where({"category": category})
    sql = _RANK_SQL.format(extra=extra)
    with connection.cursor() as cursor:
        cursor.execute(sql, [event_id, stage] + params)
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _overview(event_id: int, stage: int, category: Optional[int] = None) -> Dict[str, Any]:
    extra, params = _where({"category": category})
    sql = (
        "SELECT COUNT(DISTINCT s.player_id) AS player_count,"
        " COUNT(DISTINCT s.judge_id) AS judge_count,"
        " AVG(s.total_score) AS avg_score,"
        " MAX(s.total_score) AS max_score,"
        " MIN(s.total_score) AS min_score"
        " FROM selection_scores s WHERE s.event_id = %s AND s.stage = %s " + extra
    )
    with connection.cursor() as cursor:
        cursor.execute(sql, [event_id, stage] + params)
        columns = [col[0] for col in cursor.description]
        row = dict(zip(columns, cursor.fetchone() or ()))

    def _num(value: Any, digits: int = 2):
        return None if value is None else round(float(value), digits)

    return {
        "player_count": int(row.get("player_count") or 0),
        "judge_count": int(row.get("judge_count") or 0),
        "avg_score": _num(row.get("avg_score")),
        "max_score": _num(row.get("max_score")),
        "min_score": _num(row.get("min_score")),
    }


def _players_map(rows: List[Dict[str, Any]]) -> Dict[int, Player]:
    ids = {row["player_id"] for row in rows}
    if not ids:
        return {}
    return {player.id: player for player in Player.objects.filter(pk__in=ids).select_related("team")}


def summary(payload: Dict[str, Any], page_num: int, page_size: int) -> Dict[str, Any]:
    """评分汇总：概览 + Top10 + 全局名次分页（PLAN 5.4.6）。"""
    event = Event.objects.filter(pk=payload["event_id"]).first()
    if event is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "赛事不存在")

    stage = int(payload["stage"])
    category = payload.get("category")
    rows = ranked_rows(event.id, stage, category)
    players = _players_map(rows)
    list_rows = [summary_row(row, players.get(row["player_id"])) for row in rows]

    start = (page_num - 1) * page_size
    page_rows = list_rows[start:start + page_size]
    return {
        "event_id": event.id,
        "event_name": event.name,
        "stage": stage,
        "stage_text": text_of(STAGE_TEXT, stage),
        "category": category,
        "overview": _overview(event.id, stage, category),
        "top10": list_rows[:10],
        "list": page_rows,
        "total": len(list_rows),
        "pageNum": page_num,
        "pageSize": page_size,
    }


# ---------------------------------------------------------------------------
# 导出
# ---------------------------------------------------------------------------
EXPORT_HEADERS = [
    "名次", "球员姓名", "身份证(掩码)", "所属球队", "组别", "评委数",
    "身体素质均分", "技术水平均分", "战术意识均分", "心理素质均分", "发展潜力均分", "综合均分",
]


def export_scores(payload: Dict[str, Any]) -> Any:
    """导出评分汇总：xlsx / csv，上限 MAX_EXPORT_ROWS（PLAN 5.4.7 / 6.6）。"""
    event = Event.objects.filter(pk=payload["event_id"]).first()
    if event is None:
        raise BusinessException(ResponseCode.DATA_NOT_FOUND, "赛事不存在")

    stage = int(payload["stage"])
    category = payload.get("category")
    rows = ranked_rows(event.id, stage, category)
    max_rows = getattr(settings, "MAX_EXPORT_ROWS", 10000)
    if len(rows) > max_rows:
        raise BusinessException(
            ResponseCode.QUOTA_EXCEEDED, f"导出数据超过 {max_rows} 行，请缩小筛选范围"
        )

    players = _players_map(rows)

    def iter_rows():
        for row in rows:
            player = players.get(row["player_id"])
            yield [
                int(row["rank"]),
                getattr(player, "name", "") if player else "",
                mask_stored_id_card(getattr(player, "id_card", None)) if player else "",
                getattr(getattr(player, "team", None), "name", "") if player else "",
                text_of(CATEGORY_TEXT, row["category"]),
                int(row["judge_count"]),
                round(float(row["physical_avg"]), 1),
                round(float(row["technical_avg"]), 1),
                round(float(row["tactical_avg"]), 1),
                round(float(row["mental_avg"]), 1),
                round(float(row["potential_avg"]), 1),
                round(float(row["avg_score"]), 2),
            ]

    suffix = datetime.now().strftime("%Y%m%d")
    filename = f"selection_scores_stage{stage}_{suffix}.{payload.get('format') or 'xlsx'}"
    if (payload.get("format") or "xlsx") == "csv":
        response = csv_response(EXPORT_HEADERS, iter_rows(), filename, max_rows=max_rows)
    else:
        response = xlsx_response(EXPORT_HEADERS, iter_rows(), filename, max_rows=max_rows)

    log_operation(
        MODULE_SELECTION,
        ACTION_SCORE_EXPORT,
        {
            "event_id": event.id,
            "stage": stage,
            "category": category,
            "format": payload.get("format") or "xlsx",
            "row_count": len(rows),
        },
    )
    return response


# ---------------------------------------------------------------------------
# 最佳球员结果
# ---------------------------------------------------------------------------
def list_results(payload: Dict[str, Any], page_num: int, page_size: int) -> Dict[str, Any]:
    queryset = (
        SelectionResult.objects.filter(
            event_id=payload["event_id"], stage=int(payload["stage"]), status=1
        )
        .select_related("event", "player", "team")
        .order_by("rank", "id")
    )
    if payload.get("category"):
        queryset = queryset.filter(category=payload["category"])
    rows, total = paginate(queryset, page_num, page_size)

    generated_by_ids = {item.generated_by for item in rows if item.generated_by}
    names = {
        user.id: (user.real_name or user.username)
        for user in User.objects.filter(pk__in=generated_by_ids)
    }
    payload_rows = []
    for item in rows:
        data = result_row(item)
        data["generated_by_name"] = names.get(item.generated_by, "")
        payload_rows.append(data)
    return page_payload(payload_rows, total, page_num, page_size)


def generate_results(payload: Dict[str, Any], operator: Any) -> Dict[str, Any]:
    """生成最佳球员：锁赛事 → 作废该组别旧结果 → upsert 新结果（PLAN 5.4.8 / 6.7）。"""
    event_id = int(payload["event_id"])
    stage = int(payload["stage"])
    category = int(payload["category"])
    top_n = int(payload.get("top_n") or getattr(settings, "SELECTION_TOP_N", 5))
    top_n = min(max(1, top_n), getattr(settings, "SELECTION_TOP_N_MAX", 11))

    with transaction.atomic():
        event = Event.objects.select_for_update().filter(pk=event_id).first()
        if event is None:
            raise BusinessException(ResponseCode.DATA_NOT_FOUND, "赛事不存在")

        rows = ranked_rows(event_id, stage, category)
        if not rows:
            raise BusinessException(ResponseCode.BUSINESS_ERROR, "该组别暂无评分数据，无法生成结果")

        SelectionResult.objects.filter(
            event_id=event_id, stage=stage, category=category, status=1
        ).update(status=0, updated_at=timezone.now())

        now = timezone.now()
        selected = rows[:top_n]
        objects = [
            SelectionResult(
                event_id=event_id,
                player_id=row["player_id"],
                team_id=row["team_id"],
                category=category,
                stage=stage,
                total_score=Decimal(str(row["avg_score"])).quantize(MONEY),
                rank=index + 1,
                result=1,
                result_type=1,
                status=1,
                generated_by=getattr(operator, "pk", None),
                generated_at=now,
            )
            for index, row in enumerate(selected)
        ]
        # MySQL 后端不支持 unique_fields 参数（supports_update_conflicts_with_target=False），
        # 直接依赖 ON DUPLICATE KEY UPDATE + 迁移里的唯一键。
        SelectionResult.objects.bulk_create(
            objects,
            update_conflicts=True,
            update_fields=[
                "team_id", "total_score", "rank", "result", "result_type",
                "status", "generated_by", "generated_at", "updated_at",
            ],
        )

        log_operation(
            MODULE_SELECTION,
            ACTION_RESULT_GENERATE,
            {
                "event_id": event_id,
                "stage": stage,
                "category": category,
                "top_n": top_n,
                "count": len(objects),
            },
        )

    return {
        "event_id": event_id,
        "stage": stage,
        "category": category,
        "category_text": text_of(CATEGORY_TEXT, category),
        "count": len(objects),
        "generated_at": fmt_dt(now),
    }
