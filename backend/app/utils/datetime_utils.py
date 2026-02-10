"""
타임존 및 날짜/시간 관련 통합 유틸리티

이 모듈은 프로젝트 전체에서 일관된 시간 처리를 보장합니다.
- 가이드라인: DB에는 항상 UTC(aware)로 저장하고, 비즈니스 로직(출석, 통계 등)은 KST로 처리합니다.
"""
from datetime import datetime, timezone, timedelta, date
from typing import Optional, Union

# KST 타임존 상수 (UTC+9)
KST = timezone(timedelta(hours=9))


def now_utc() -> datetime:
    """현재 시각을 UTC aware datetime으로 반환"""
    return datetime.now(timezone.utc)


def now_kst() -> datetime:
    """현재 시각을 KST aware datetime으로 반환"""
    return datetime.now(KST)


def to_kst(dt: Optional[datetime]) -> Optional[datetime]:
    """주어진 datetime을 KST로 변환 (naive인 경우 UTC로 간주)"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(KST)


def to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """주어진 datetime을 UTC로 변환 (naive인 경우 UTC로 간주)"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def get_kst_date(dt: Optional[datetime] = None) -> date:
    """주어진 시각(또는 현재)의 KST 기준 날짜(date 객체) 반환"""
    if dt is None:
        dt = now_utc()
    return to_kst(dt).date()


def get_monday_of_week_kst(dt: Optional[datetime] = None) -> datetime:
    """
    주어진 시각이 포함된 주의 월요일 00:00:00 KST를 UTC 시각으로 반환.
    (주간 퀘스트, 주간 방문자 등 기준점 계산용)
    """
    if dt is None:
        dt = now_utc()
    
    dt_kst = to_kst(dt)
    # KST 기준 월요일 계산 (0=월요일)
    monday_kst = dt_kst - timedelta(days=dt_kst.weekday())
    monday_kst = monday_kst.replace(hour=0, minute=0, second=0, microsecond=0)
    
    return to_utc(monday_kst)


def get_date_start_utc(dt: Optional[datetime] = None) -> datetime:
    """주어진 날짜의 시작 시각(00:00:00 KST)을 UTC로 반환"""
    if dt is None:
        dt = now_utc()
    
    dt_kst = to_kst(dt)
    date_start_kst = dt_kst.replace(hour=0, minute=0, second=0, microsecond=0)
    return to_utc(date_start_kst)


def days_ago_utc(days: int) -> datetime:
    """KST 기준 N일 전의 시작 시각(00:00:00)을 UTC로 반환"""
    return get_date_start_utc(now_utc() - timedelta(days=days))


def to_iso8601(dt: Optional[datetime]) -> Optional[str]:
    """프론트엔드 호환을 위해 ISO8601 문자열(Z 접미사 포함)로 변환"""
    if dt is None:
        return None
    return to_utc(dt).strftime("%Y-%m-%dT%H:%M:%S") + "Z"


def format_kst(dt: Optional[datetime], fmt: str = "%Y-%m-%d %H:%M:%S") -> str:
    """KST로 변환 후 지정된 포맷의 문자열로 반환"""
    if dt is None:
        return ""
    return to_kst(dt).strftime(fmt)


def is_same_day_kst(dt1: datetime, dt2: datetime) -> bool:
    """두 시각이 KST 기준으로 같은 날짜인지 확인"""
    return get_kst_date(dt1) == get_kst_date(dt2)


def is_same_week_kst(dt1: datetime, dt2: datetime) -> bool:
    """두 시각이 KST 기준으로 같은 주(월요일 시작)인지 확인"""
    return get_monday_of_week_kst(dt1) == get_monday_of_week_kst(dt2)
