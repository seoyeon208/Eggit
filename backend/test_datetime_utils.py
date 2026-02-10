"""
datetime_utils 테스트 스크립트

타임존 처리 로직이 올바르게 동작하는지 검증
"""
import sys
from pathlib import Path

# backend/app 경로 추가
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

from datetime import datetime, timezone, timedelta
from app.utils.datetime_utils import (
    now_utc, now_kst, to_kst, to_utc,
    get_monday_of_week_kst, get_date_kst, days_ago_kst, KST
)


def test_basic_functions():
    """기본 함수 테스트"""
    print("=" * 60)
    print("1. 기본 함수 테스트")
    print("=" * 60)
    
    utc_now = now_utc()
    kst_now = now_kst()
    
    print(f"UTC 현재 시각: {utc_now}")
    print(f"KST 현재 시각: {kst_now}")
    print(f"시간 차이: {(kst_now - utc_now).total_seconds() / 3600}시간")
    
    # 9시간 차이 확인
    assert abs((kst_now - utc_now).total_seconds()) < 1, "UTC와 KST는 거의 동일한 순간이어야 함"
    print("✅ UTC와 KST 변환 정상")
    print()


def test_timezone_conversion():
    """타임존 변환 테스트"""
    print("=" * 60)
    print("2. 타임존 변환 테스트")
    print("=" * 60)
    
    # UTC 2026-02-03 15:00:00 = KST 2026-02-04 00:00:00
    utc_time = datetime(2026, 2, 3, 15, 0, 0, tzinfo=timezone.utc)
    kst_time = to_kst(utc_time)
    
    print(f"UTC: {utc_time}")
    print(f"KST: {kst_time}")
    
    assert kst_time.hour == 0, "KST는 자정이어야 함"
    assert kst_time.day == 4, "KST는 다음 날이어야 함"
    print("✅ UTC → KST 변환 정상")
    
    # 역변환
    back_to_utc = to_utc(kst_time)
    assert back_to_utc == utc_time, "역변환 시 원래 값과 같아야 함"
    print("✅ KST → UTC 변환 정상")
    print()


def test_monday_calculation():
    """월요일 계산 테스트"""
    print("=" * 60)
    print("3. 주간 월요일 계산 테스트")
    print("=" * 60)
    
    # 2026-02-05 (목요일) 10:00 KST
    thursday_kst = datetime(2026, 2, 5, 10, 0, 0, tzinfo=KST)
    thursday_utc = thursday_kst.astimezone(timezone.utc)
    
    monday = get_monday_of_week_kst(thursday_utc)
    monday_kst = to_kst(monday)
    
    print(f"기준 날짜 (KST): {thursday_kst} (목요일)")
    print(f"계산된 월요일 (UTC): {monday}")
    print(f"계산된 월요일 (KST): {monday_kst}")
    
    assert monday_kst.weekday() == 0, "월요일이어야 함 (0=월요일)"
    assert monday_kst.hour == 0, "00:00:00이어야 함"
    assert monday_kst.day == 2, "2026-02-02이어야 함"
    print("✅ 월요일 계산 정상")
    print()


def test_date_start():
    """날짜 시작 시각 계산 테스트"""
    print("=" * 60)
    print("4. 날짜 시작 시각 계산 테스트")
    print("=" * 60)
    
    # 2026-02-03 14:30:45 KST
    some_time_kst = datetime(2026, 2, 3, 14, 30, 45, tzinfo=KST)
    some_time_utc = some_time_kst.astimezone(timezone.utc)
    
    date_start = get_date_kst(some_time_utc)
    date_start_kst = to_kst(date_start)
    
    print(f"기준 시각 (KST): {some_time_kst}")
    print(f"날짜 시작 (UTC): {date_start}")
    print(f"날짜 시작 (KST): {date_start_kst}")
    
    assert date_start_kst.hour == 0, "00:00:00이어야 함"
    assert date_start_kst.minute == 0, "00:00:00이어야 함"
    assert date_start_kst.second == 0, "00:00:00이어야 함"
    assert date_start_kst.day == 3, "같은 날짜여야 함"
    print("✅ 날짜 시작 시각 계산 정상")
    print()


def test_days_ago():
    """N일 전 계산 테스트"""
    print("=" * 60)
    print("5. N일 전 계산 테스트")
    print("=" * 60)
    
    # 2026-02-10 (월요일) 기준
    monday_kst = datetime(2026, 2, 10, 15, 0, 0, tzinfo=KST)
    monday_utc = monday_kst.astimezone(timezone.utc)
    
    seven_days_ago = days_ago_kst(7, monday_utc)
    seven_days_ago_kst = to_kst(seven_days_ago)
    
    print(f"기준 날짜 (KST): {monday_kst}")
    print(f"7일 전 (UTC): {seven_days_ago}")
    print(f"7일 전 (KST): {seven_days_ago_kst}")
    
    assert seven_days_ago_kst.day == 3, "2026-02-03이어야 함"
    assert seven_days_ago_kst.hour == 0, "00:00:00이어야 함"
    print("✅ N일 전 계산 정상")
    print()


def test_edge_cases():
    """경계 케이스 테스트"""
    print("=" * 60)
    print("6. 경계 케이스 테스트")
    print("=" * 60)
    
    # KST 자정 직전 (23:59:59)
    before_midnight_kst = datetime(2026, 2, 3, 23, 59, 59, tzinfo=KST)
    before_midnight_utc = before_midnight_kst.astimezone(timezone.utc)
    
    date_start = get_date_kst(before_midnight_utc)
    date_start_kst = to_kst(date_start)
    
    print(f"자정 직전 (KST): {before_midnight_kst}")
    print(f"날짜 시작 (KST): {date_start_kst}")
    
    assert date_start_kst.day == 3, "같은 날짜여야 함"
    assert date_start_kst.hour == 0, "00:00:00이어야 함"
    print("✅ 자정 직전 처리 정상")
    
    # KST 자정 직후 (00:00:01)
    after_midnight_kst = datetime(2026, 2, 4, 0, 0, 1, tzinfo=KST)
    after_midnight_utc = after_midnight_kst.astimezone(timezone.utc)
    
    date_start = get_date_kst(after_midnight_utc)
    date_start_kst = to_kst(date_start)
    
    print(f"자정 직후 (KST): {after_midnight_kst}")
    print(f"날짜 시작 (KST): {date_start_kst}")
    
    assert date_start_kst.day == 4, "다음 날짜여야 함"
    assert date_start_kst.hour == 0, "00:00:00이어야 함"
    print("✅ 자정 직후 처리 정상")
    print()


def test_naive_datetime_handling():
    """naive datetime 처리 테스트"""
    print("=" * 60)
    print("7. naive datetime 처리 테스트")
    print("=" * 60)
    
    # naive datetime (타임존 정보 없음)
    naive_dt = datetime(2026, 2, 3, 15, 0, 0)
    print(f"naive datetime: {naive_dt} (tzinfo={naive_dt.tzinfo})")
    
    # UTC로 간주하고 KST로 변환
    kst_dt = to_kst(naive_dt)
    print(f"KST 변환: {kst_dt}")
    
    assert kst_dt.hour == 0, "UTC 15:00 = KST 00:00"
    assert kst_dt.day == 4, "다음 날이어야 함"
    print("✅ naive datetime은 UTC로 간주됨")
    print()


def main():
    """모든 테스트 실행"""
    print("\n")
    print("🧪 datetime_utils 테스트 시작")
    print("\n")
    
    try:
        test_basic_functions()
        test_timezone_conversion()
        test_monday_calculation()
        test_date_start()
        test_days_ago()
        test_edge_cases()
        test_naive_datetime_handling()
        
        print("=" * 60)
        print("🎉 모든 테스트 통과!")
        print("=" * 60)
        return 0
    except AssertionError as e:
        print(f"\n❌ 테스트 실패: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ 예상치 못한 오류: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
