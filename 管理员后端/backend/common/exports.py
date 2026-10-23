# -*- coding: utf-8 -*-
"""导出（PLAN 8.8）：xlsx 只写模式 / csv 流式（UTF-8 BOM），文件名 ASCII。"""
from __future__ import annotations

import csv
from io import BytesIO
from typing import Iterable, List, Sequence

from django.http import FileResponse, StreamingHttpResponse
from openpyxl import Workbook

from common.codes import ResponseCode
from common.exceptions import BusinessException

XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
CSV_CONTENT_TYPE = "text/csv; charset=utf-8"


def _check_rows(rows: Iterable[Sequence], max_rows: int) -> Iterable[Sequence]:
    count = 0
    for row in rows:
        count += 1
        if count > max_rows:
            raise BusinessException(
                ResponseCode.QUOTA_EXCEEDED,
                f"导出数据超过 {max_rows} 行，请缩小筛选范围",
            )
        yield row


def xlsx_response(
    headers: List[str],
    rows: Iterable[Sequence],
    filename: str,
    max_rows: int = 10000,
    sheet_title: str = "数据",
) -> FileResponse:
    """只写模式生成 xlsx：流式写行，避免一次性加载全表。"""
    workbook = Workbook(write_only=True)
    worksheet = workbook.create_sheet(title=sheet_title)
    worksheet.append(list(headers))
    for row in _check_rows(rows, max_rows):
        worksheet.append(list(row))
    buffer = BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return FileResponse(
        buffer,
        as_attachment=True,
        filename=filename,
        content_type=XLSX_CONTENT_TYPE,
    )


class _Echo:
    def write(self, value: str) -> str:
        return value


def csv_response(
    headers: List[str],
    rows: Iterable[Sequence],
    filename: str,
    max_rows: int = 10000,
) -> StreamingHttpResponse:
    """流式生成 CSV，首块带 UTF-8 BOM，Excel 打开中文不乱码。"""
    writer = csv.writer(_Echo())

    def generator():
        yield "\ufeff"
        yield writer.writerow(list(headers))
        for row in _check_rows(rows, max_rows):
            yield writer.writerow(list(row))

    response = StreamingHttpResponse(generator(), content_type=CSV_CONTENT_TYPE)
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response
