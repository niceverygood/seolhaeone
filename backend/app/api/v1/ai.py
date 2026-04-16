from datetime import date, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.analytics import AiActionLog, DailyStat
from app.models.customer import Customer
from app.models.golf import GolfCourse, GolfTeetime
from app.models.resort import Room, RoomReservation
from app.models.package import Package

router = APIRouter(prefix="/ai", tags=["ai"])


class AiQueryRequest(BaseModel):
    query: str


@router.post("/query")
def ai_query(body: AiQueryRequest, db: Session = Depends(get_db)):
    q = body.query.lower()
    today = date.today()

    # Revenue analysis
    if "매출" in q:
        month_start = today.replace(day=1)
        stats = db.query(DailyStat).filter(
            DailyStat.stat_date >= month_start, DailyStat.stat_date <= today
        ).all()
        total = sum(int(s.total_revenue or 0) for s in stats)
        golf = sum(int(s.golf_revenue or 0) for s in stats)
        room = sum(int(s.room_revenue or 0) for s in stats)
        fnb = sum(int(s.fnb_revenue or 0) for s in stats)
        oncheon = sum(int(s.oncheon_revenue or 0) for s in stats)

        # Course breakdown
        if "코스" in q or "비교" in q:
            courses = db.query(GolfCourse).all()
            course_data = []
            for course in courses:
                cnt = db.query(GolfTeetime).filter(
                    GolfTeetime.course_id == course.id,
                    GolfTeetime.tee_date >= month_start,
                    GolfTeetime.tee_date <= today,
                    GolfTeetime.status.in_(["completed", "reserved"]),
                ).count()
                price = {"레전드": 450000, "오션": 380000, "마운틴": 320000}.get(course.name, 350000)
                course_data.append({"코스": course.name, "라운드수": cnt, "예상매출": f"₩{cnt * price:,}"})
            return {
                "query_type": "course_revenue",
                "answer": f"이번 달 코스별 매출 분석입니다.\n총 매출: ₩{total:,}",
                "data": course_data,
            }

        return {
            "query_type": "revenue",
            "answer": f"이번 달 총 매출은 ₩{total:,}입니다.\n"
                      f"  - 골프: ₩{golf:,}\n  - 객실: ₩{room:,}\n"
                      f"  - F&B: ₩{fnb:,}\n  - 온천: ₩{oncheon:,}",
            "data": [{"category": "골프", "amount": golf}, {"category": "객실", "amount": room},
                     {"category": "F&B", "amount": fnb}, {"category": "온천", "amount": oncheon}],
        }

    # Churn risk
    if "이탈" in q or "위험" in q:
        customers = (
            db.query(Customer)
            .filter(Customer.churn_risk >= 0.5)
            .order_by(Customer.churn_risk.desc())
            .limit(10)
            .all()
        )
        return {
            "query_type": "churn",
            "answer": f"이탈 위험이 높은 고객 {len(customers)}명을 발견했습니다.\n"
                      "리텐션 캠페인 즉시 실행을 추천합니다.",
            "data": [
                {"이름": c.name, "등급": c.grade, "이탈위험": f"{float(c.churn_risk) * 100:.0f}%",
                 "CLV": f"₩{int(c.clv or 0):,}", "최근방문": c.last_visit_at.strftime("%Y-%m-%d") if c.last_visit_at else "-"}
                for c in customers
            ],
        }

    # Noshow
    if "노쇼" in q:
        high_risk = (
            db.query(GolfTeetime, Customer)
            .outerjoin(Customer, GolfTeetime.customer_id == Customer.id)
            .filter(GolfTeetime.tee_date >= today, GolfTeetime.noshow_score >= 0.3)
            .order_by(GolfTeetime.noshow_score.desc())
            .limit(10)
            .all()
        )
        return {
            "query_type": "noshow",
            "answer": f"노쇼 위험이 높은 예약 {len(high_risk)}건을 발견했습니다.\n"
                      "리마인드 발송 또는 대기 고객 배정을 추천합니다.",
            "data": [
                {"고객": cust.name if cust else "미지정", "날짜": str(t.tee_date),
                 "시간": t.tee_time.strftime("%H:%M"), "위험도": f"{float(t.noshow_score) * 100:.0f}%"}
                for t, cust in high_risk
            ],
        }

    # Customer stats
    if "고객" in q or "회원" in q or "등급" in q:
        rows = db.query(Customer.grade, func.count()).group_by(Customer.grade).all()
        total_count = sum(cnt for _, cnt in rows)
        high_clv = db.query(Customer).filter(Customer.clv >= 10_000_000).count()
        return {
            "query_type": "customers",
            "answer": f"총 {total_count}명의 회원이 등록되어 있습니다.\n"
                      f"CLV ₩10M 이상 고가치 고객: {high_clv}명",
            "data": [{"등급": grade, "인원": cnt, "비율": f"{cnt/total_count*100:.1f}%"} for grade, cnt in rows],
        }

    # Reservation / booking
    if "예약" in q:
        tomorrow = today + timedelta(days=1)
        count = db.query(GolfTeetime).filter(
            GolfTeetime.tee_date == tomorrow, GolfTeetime.status == "reserved"
        ).count()
        room_count = db.query(RoomReservation).filter(
            RoomReservation.check_in == tomorrow, RoomReservation.status == "confirmed"
        ).count()
        return {
            "query_type": "reservation",
            "answer": f"내일({tomorrow}) 예약 현황:\n  - 골프: {count}건\n  - 객실: {room_count}건",
            "data": [{"구분": "골프 예약", "건수": count}, {"구분": "객실 예약", "건수": room_count}],
        }

    # Package / upsell
    if "패키지" in q or "업셀" in q or "추천" in q:
        pkgs = db.query(Package).filter(Package.is_active.is_(True)).all()
        return {
            "query_type": "package",
            "answer": f"현재 {len(pkgs)}개의 활성 패키지가 있습니다.",
            "data": [
                {"이름": p.name, "가격": f"₩{int(p.base_price or 0):,}",
                 "타겟": p.target_segment or "-", "AI생성": "O" if p.ai_generated else "X"}
                for p in pkgs
            ],
        }

    # Occupancy
    if "점유" in q or "객실" in q:
        stat = db.query(DailyStat).filter(DailyStat.stat_date == today).first()
        occ = float(stat.room_occupancy_rate or 0) * 100 if stat else 0
        rooms_total = db.query(Room).count()
        return {
            "query_type": "occupancy",
            "answer": f"오늘 객실 점유율: {occ:.0f}%\n총 객실 수: {rooms_total}",
            "data": [{"항목": "점유율", "값": f"{occ:.0f}%"}, {"항목": "총 객실", "값": str(rooms_total)}],
        }

    return {
        "query_type": "help",
        "answer": "다음과 같은 질문을 해보세요:\n"
                  "  - '이번 달 매출 알려줘'\n"
                  "  - '코스별 매출 비교해줘'\n"
                  "  - '이탈 위험 고객 리스트'\n"
                  "  - '노쇼 위험 예약'\n"
                  "  - '고객 등급 현황'\n"
                  "  - '내일 예약 현황'\n"
                  "  - '패키지 현황'\n"
                  "  - '객실 점유율'",
        "data": [],
    }


@router.get("/suggestions")
def ai_suggestions(db: Session = Depends(get_db)):
    today = date.today()

    # High churn customers
    churn_customers = db.query(Customer).filter(Customer.churn_risk >= 0.5).all()
    churn_count = len(churn_customers)
    churn_clv = sum(int(c.clv or 0) for c in churn_customers)

    # Tomorrow noshow risk
    tomorrow = today + timedelta(days=1)
    noshow_teetimes = db.query(GolfTeetime).filter(
        GolfTeetime.tee_date == tomorrow, GolfTeetime.noshow_score >= 0.3,
        GolfTeetime.status == "reserved",
    ).all()
    noshow_count = len(noshow_teetimes)

    # Today occupancy
    stat = db.query(DailyStat).filter(DailyStat.stat_date == today).first()
    occupancy = float(stat.room_occupancy_rate or 0) * 100 if stat else 0

    # Weekend occupancy forecast
    days_to_fri = (4 - today.weekday()) % 7
    next_friday = today + timedelta(days=days_to_fri if days_to_fri > 0 else 7)
    weekend_res = db.query(RoomReservation).filter(
        RoomReservation.check_in >= next_friday,
        RoomReservation.check_in <= next_friday + timedelta(days=2),
    ).count()

    # Upsell opportunities: Gold/Silver customers with high visits but no recent package
    upsell_targets = db.query(Customer).filter(
        Customer.grade.in_(["gold", "silver"]),
        Customer.total_visits >= 5,
        Customer.churn_risk < 0.3,
    ).count()

    suggestions = []

    if churn_count > 0:
        suggestions.append({
            "id": "sug-churn",
            "type": "customer",
            "category": "customer",
            "title": f"VIP 이탈 위험 고객 {churn_count}명 감지",
            "detail": f"이탈 위험도 50% 이상 고객의 총 CLV는 ₩{churn_clv:,}입니다. "
                      "즉시 1:1 리텐션 캠페인을 실행하세요. 설해별담 프리뷰 초대 또는 맞춤 패키지 제안을 추천합니다.",
            "impact": f"CLV ₩{churn_clv:,} 이탈 방지",
        })

    if noshow_count > 0:
        suggestions.append({
            "id": "sug-noshow",
            "type": "operation",
            "category": "operation",
            "title": f"내일 노쇼 위험 예약 {noshow_count}건",
            "detail": "노쇼 스코어 30% 이상 예약에 자동 리마인드(카카오톡/SMS) 발송을 추천합니다. "
                      "대기 고객 배정으로 빈 슬롯을 최소화하세요.",
            "impact": f"노쇼 방지 · 예상 손실 ₩{noshow_count * 400000:,}",
        })

    if occupancy < 70:
        suggestions.append({
            "id": "sug-occupancy",
            "type": "revenue",
            "category": "revenue",
            "title": f"오늘 객실 점유율 {occupancy:.0f}% — 당일 특가 추천",
            "detail": "평균 이하 점유율입니다. 골프 예약 고객 대상 당일 특가 객실 프로모션으로 "
                      "객단가를 올리세요.",
            "impact": "점유율 개선 · 예상 추가 매출 ₩2,000,000",
        })

    if upsell_targets > 0:
        suggestions.append({
            "id": "sug-upsell",
            "type": "revenue",
            "category": "revenue",
            "title": f"업셀 타겟 고객 {upsell_targets}명",
            "detail": "Gold/Silver 등급 중 방문 빈도가 높고 이탈 위험이 낮은 고객에게 "
                      "상위 패키지 또는 객실 업그레이드를 추천합니다.",
            "impact": f"예상 추가 매출 ₩{upsell_targets * 350000:,}",
        })

    suggestions.append({
        "id": "sug-package",
        "type": "marketing",
        "category": "marketing",
        "title": "골프+객실 번들 자동 추천",
        "detail": "최근 2주간 골프 예약 후 객실 예약 전환율이 상승 중입니다. "
                  "골프 예약 확정 시 자동 객실 번들 팝업을 노출하세요.",
        "impact": "패키지 수락률 예측 41% · 객단가 +₩450,000",
    })

    if weekend_res < 20:
        suggestions.append({
            "id": "sug-weekend",
            "type": "revenue",
            "category": "revenue",
            "title": "이번 주말 객실 예약 부진",
            "detail": f"다가오는 주말({next_friday}) 객실 예약이 {weekend_res}건입니다. "
                      "SNS 타겟 광고 또는 기존 골프 예약 고객 대상 객실 프로모션을 추천합니다.",
            "impact": "주말 매출 극대화",
        })

    return suggestions


@router.get("/revenue-optimization")
def revenue_optimization(db: Session = Depends(get_db)):
    """AI 매출 극대화 분석 보고서"""
    today = date.today()
    month_start = today.replace(day=1)

    # Current month stats
    stats = db.query(DailyStat).filter(
        DailyStat.stat_date >= month_start, DailyStat.stat_date <= today
    ).all()
    total_revenue = sum(int(s.total_revenue or 0) for s in stats)

    # Weekday vs weekend comparison
    weekday_rev = sum(int(s.total_revenue or 0) for s in stats if s.stat_date.weekday() < 5)
    weekend_rev = sum(int(s.total_revenue or 0) for s in stats if s.stat_date.weekday() >= 5)
    weekday_count = sum(1 for s in stats if s.stat_date.weekday() < 5) or 1
    weekend_count = sum(1 for s in stats if s.stat_date.weekday() >= 5) or 1

    # Low occupancy slots
    tomorrow = today + timedelta(days=1)
    empty_slots = db.query(GolfTeetime).filter(
        GolfTeetime.tee_date == tomorrow,
        GolfTeetime.status == "available",
    ).count()

    # High CLV customers not visiting recently
    dormant_vips = db.query(Customer).filter(
        Customer.grade.in_(["diamond", "gold"]),
        Customer.last_visit_at < today - timedelta(days=30),
    ).count()

    return {
        "summary": f"이번 달 매출: ₩{total_revenue:,}",
        "insights": [
            {
                "title": "평일 매출 강화 필요",
                "detail": f"평일 일평균 ₩{weekday_rev // weekday_count:,} vs 주말 일평균 ₩{weekend_rev // weekend_count:,}. "
                          "평일 프로모션으로 격차를 줄이세요.",
            },
            {
                "title": f"내일 빈 슬롯 {empty_slots}개 활용",
                "detail": "대기 고객 자동 배정 또는 당일 할인 프로모션으로 빈 슬롯을 채우세요.",
            },
            {
                "title": f"미방문 VIP {dormant_vips}명 리콜",
                "detail": "30일 이상 미방문 Diamond/Gold 고객에게 맞춤 초대를 발송하세요.",
            },
        ],
    }
