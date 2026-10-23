# -*- coding: utf-8 -*-
"""Phase 1 公共能力层测试：统一响应、trace_id、异常映射、分页、脱敏、参数校验、加密。"""
from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path
from tempfile import TemporaryDirectory

from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.db import IntegrityError, OperationalError
from django.http import Http404, HttpResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from common import crypto
from common.codes import ResponseCode
from common.exceptions import BusinessException, RequestValidationError
from common.logging import sanitize_params
from common.middleware import ExceptionMiddleware, TraceIdMiddleware
from common.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, normalize_page
from common.request import BaseRequest, CharField, ChoiceField, DecimalField, IntegerField, parse_payload
from common.result import error, success
from common.serializers import page_payload
from common.time import fmt_date, fmt_dt
from common.trace import get_trace_id, set_trace_id


class ResultTests(SimpleTestCase):
    def setUp(self) -> None:
        set_trace_id("trace-unit-001")

    def test_success_structure(self) -> None:
        body = json.loads(success("获取成功", {"x": 1}).content)
        self.assertEqual(body["code"], 0)
        self.assertEqual(body["msg"], "获取成功")
        self.assertEqual(body["data"], {"x": 1})
        self.assertTrue(body["success"])
        self.assertEqual(body["trace_id"], "trace-unit-001")

    def test_error_structure(self) -> None:
        body = json.loads(error(ResponseCode.FORBIDDEN).content)
        self.assertEqual(body["code"], 20005)
        self.assertEqual(body["msg"], "无权限访问")
        self.assertIsNone(body["data"])
        self.assertFalse(body["success"])

    def test_code_messages_frozen(self) -> None:
        self.assertEqual(ResponseCode.VERSION_CONFLICT.msg, "数据已被他人修改，请刷新后重试")
        self.assertEqual(int(ResponseCode.QUOTA_EXCEEDED), 40006)
        self.assertEqual(int(ResponseCode.DATA_EXISTS), 30003)


class TraceIdTests(SimpleTestCase):
    def test_generates_32_hex(self) -> None:
        request = RequestFactory().get("/api/v1/health")
        response = TraceIdMiddleware(lambda r: HttpResponse("ok"))(request)
        trace_id = response["X-Trace-Id"]
        self.assertEqual(len(trace_id), 32)
        int(trace_id, 16)  # 必须是十六进制
        self.assertEqual(request.trace_id, trace_id)

    def test_reuses_incoming_header(self) -> None:
        request = RequestFactory().get("/api/v1/health", HTTP_X_TRACE_ID="abc123")
        response = TraceIdMiddleware(lambda r: HttpResponse("ok"))(request)
        self.assertEqual(response["X-Trace-Id"], "abc123")
        self.assertEqual(get_trace_id(), "abc123")


class ExceptionMappingTests(SimpleTestCase):
    """异常映射走 process_exception（Django 5 会在 __call__ 之前转换异常）。"""

    def setUp(self) -> None:
        self.rf = RequestFactory()
        self.middleware = ExceptionMiddleware(lambda r: HttpResponse("ok"))

    def _run(self, exc: Exception):
        request = self.rf.get("/api/v1/teams")
        response = self.middleware.process_exception(request, exc)
        self.assertIsNotNone(response)
        return json.loads(response.content)

    def test_validation_error_10001(self) -> None:
        self.assertEqual(self._run(RequestValidationError("球员姓名不能为空"))["code"], 10001)

    def test_business_exception_own_code(self) -> None:
        body = self._run(BusinessException(ResponseCode.VERSION_CONFLICT, "评分已被他人修改"))
        self.assertEqual(body["code"], 30008)
        self.assertEqual(body["msg"], "评分已被他人修改")

    def test_permission_denied_20005(self) -> None:
        self.assertEqual(self._run(PermissionDenied())["code"], 20005)

    def test_object_not_exist_30001(self) -> None:
        self.assertEqual(self._run(ObjectDoesNotExist())["code"], 30001)

    def test_integrity_error_30003(self) -> None:
        self.assertEqual(self._run(IntegrityError("dup"))["code"], 30003)

    def test_database_error_60001(self) -> None:
        self.assertEqual(self._run(OperationalError("db down"))["code"], 60001)

    def test_http404_30001(self) -> None:
        body = self._run(Http404())
        self.assertEqual(body["code"], 30001)
        self.assertEqual(body["msg"], "接口不存在")

    def test_unknown_exception_90001(self) -> None:
        self.assertEqual(self._run(RuntimeError("boom"))["code"], 90001)

    def test_unmatched_api_path_30001(self) -> None:
        request = self.rf.get("/api/v1/not-exists")
        response = ExceptionMiddleware(lambda r: HttpResponse(status=404))(request)
        self.assertEqual(json.loads(response.content)["code"], 30001)

    def test_page_404_untouched(self) -> None:
        request = self.rf.get("/admin/teams")
        result = ExceptionMiddleware(lambda r: HttpResponse(status=404))(request)
        self.assertEqual(result.status_code, 404)


class PaginationTests(SimpleTestCase):
    def test_defaults(self) -> None:
        self.assertEqual(normalize_page(None, None), (1, DEFAULT_PAGE_SIZE))

    def test_clamped(self) -> None:
        self.assertEqual(normalize_page(0, 999), (1, MAX_PAGE_SIZE))
        # pageSize=0 视同未传（PLAN 8.5 参考实现），负数则夹到 1
        self.assertEqual(normalize_page(-3, 0), (1, DEFAULT_PAGE_SIZE))
        self.assertEqual(normalize_page(-3, -5), (1, 1))

    def test_page_payload_shape(self) -> None:
        body = page_payload([{"id": 1}], 6, 1, 20)
        self.assertEqual(set(body.keys()), {"list", "total", "pageNum", "pageSize"})
        self.assertEqual(body["total"], 6)


class SanitizeTests(SimpleTestCase):
    def test_recursive_mask(self) -> None:
        cleaned = sanitize_params(
            {
                "username": "team_cd7",
                "password": "Tmp#8f2Kq1z",
                "id_card": "510101200903121234",
                "nested": [{"phone": "13800001111", "name": "王强"}],
            }
        )
        self.assertEqual(cleaned["password"], "***")
        self.assertEqual(cleaned["id_card"], "***")
        self.assertEqual(cleaned["username"], "team_cd7")
        self.assertEqual(cleaned["nested"][0]["phone"], "***")
        self.assertEqual(cleaned["nested"][0]["name"], "王强")


class _SampleRequest(BaseRequest):
    event_id = IntegerField(required=True, label="赛事")
    stage = ChoiceField(choices=(1, 2), required=True, label="阶段")
    score = DecimalField(required=True, min_value=0, max_value=20, decimal_places=1, label="分数")
    remark = CharField(required=False, max_length=8, label="备注")


class RequestValidationTests(SimpleTestCase):
    def test_clean_values(self) -> None:
        cleaned = _SampleRequest({"event_id": "2", "stage": "1", "score": "18.5"}).validate()
        self.assertEqual(cleaned["event_id"], 2)
        self.assertEqual(cleaned["stage"], 1)
        self.assertEqual(cleaned["score"], Decimal("18.5"))
        self.assertIsNone(cleaned["remark"])

    def test_required_missing(self) -> None:
        with self.assertRaises(RequestValidationError) as ctx:
            _SampleRequest({"stage": 1}).validate()
        self.assertIn("赛事不能为空", str(ctx.exception))

    def test_range_and_choice(self) -> None:
        with self.assertRaises(RequestValidationError):
            _SampleRequest({"event_id": 1, "stage": 3, "score": "10"}).validate()
        with self.assertRaises(RequestValidationError):
            _SampleRequest({"event_id": 1, "stage": 1, "score": "21"}).validate()
        with self.assertRaises(RequestValidationError):
            _SampleRequest({"event_id": 1, "stage": 1, "score": "10", "remark": "超过八个字符的备注"}).validate()

    def test_bad_integer(self) -> None:
        with self.assertRaises(RequestValidationError):
            _SampleRequest({"event_id": "abc", "stage": 1, "score": "10"}).validate()

    def test_parse_json_payload(self) -> None:
        request = RequestFactory().post(
            "/api/v1/selection-scores",
            data=json.dumps({"event_id": 2}),
            content_type="application/json",
        )
        self.assertEqual(parse_payload(request), {"event_id": 2})

    def test_parse_bad_json(self) -> None:
        request = RequestFactory().post("/api/v1/x", data="{oops", content_type="application/json")
        with self.assertRaises(RequestValidationError):
            parse_payload(request)


class CryptoAndTimeTests(SimpleTestCase):
    def test_mask_rules(self) -> None:
        self.assertEqual(crypto.mask_id_card("510101200903121234"), "510101********1234")
        self.assertEqual(crypto.mask_phone("13800001111"), "138****1111")

    def test_encrypt_roundtrip(self) -> None:
        with TemporaryDirectory() as tmp:
            with override_settings(
                INSTANCE_DIR=Path(tmp), FIELD_ENCRYPTION_KEY="", ID_CARD_HASH_KEY=""
            ):
                cipher = crypto.encrypt_text("510101200903121234")
                self.assertNotEqual(cipher, "510101200903121234")
                self.assertTrue(cipher.startswith("gAAAA"))
                self.assertEqual(crypto.decrypt_text(cipher), "510101200903121234")
                self.assertEqual(crypto.decrypt_text("not-a-token"), "")

    def test_id_card_hash_stable(self) -> None:
        with TemporaryDirectory() as tmp:
            with override_settings(INSTANCE_DIR=Path(tmp), FIELD_ENCRYPTION_KEY="", ID_CARD_HASH_KEY=""):
                first = crypto.id_card_hash("510101200903121234")
                second = crypto.id_card_hash("510101200903121234")
                third = crypto.id_card_hash("510101200903121235")
                self.assertEqual(len(first), 64)
                self.assertEqual(first, second)
                self.assertNotEqual(first, third)

    def test_time_format(self) -> None:
        from datetime import date, datetime

        self.assertEqual(fmt_dt(datetime(2026, 10, 20, 10, 0, 0)), "2026-10-20 10:00:00")
        self.assertIsNone(fmt_dt(None))
        self.assertEqual(fmt_date(date(2009, 3, 12)), "2009-03-12")
