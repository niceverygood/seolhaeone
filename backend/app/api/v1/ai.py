import json
import logging
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.analytics import AiActionLog, DailyStat
from app.models.customer import Customer
from app.models.golf import GolfCourse, GolfTeetime
from app.models.resort import Room, RoomReservation
from app.models.package import Package
from app.services.openrouter import chat as llm_chat, llm_available

router = APIRouter(prefix="/ai", tags=["ai"])
log = logging.getLogger(__name__)


class AiQueryRequest(BaseModel):
    query: str


def _collect_business_context(db: Session) -> dict:
    """LLM이 참조할 현재 비즈니스 스냅샷 — 숫자가 너무 많아지지 않도록 요약."""
    today = date.today()
    month_start = today.replace(day=1)
    tomorrow = today + timedelta(days=1)

    # 이번 달 매출
    stats = db.query(DailyStat).filter(
        DailyStat.stat_date >= month_start, DailyStat.stat_date <= today
    ).all()
    total_rev = sum(int(s.total_revenue or 0) for s in stats)
    golf_rev = sum(int(s.golf_revenue or 0) for s in stats)
    room_rev = sum(int(s.room_revenue or 0) for s in stats)
    fnb_rev = sum(int(s.fnb_revenue or 0) for s in stats)
    oncheon_rev = sum(int(s.oncheon_revenue or 0) for s in stats)

    # 코스별 이번 달 라운드
    course_rounds = []
    for c in db.query(GolfCourse).all():
        cnt = db.query(GolfTeetime).filter(
            GolfTeetime.course_id == c.id,
            GolfTeetime.tee_date >= month_start,
            GolfTeetime.tee_date <= today,
            GolfTeetime.status.in_(["completed", "reserved"]),
        ).count()
        course_rounds.append({"course": c.name, "rounds": cnt})

    # 고객 분포
    grade_rows = db.query(Customer.grade, func.count()).group_by(Customer.grade).all()
    grade_dist = {g: c for g, c in grade_rows}
    total_customers = sum(grade_dist.values())
    churn_high = db.query(Customer).filter(Customer.churn_risk >= 0.5).count()

    # 예약 현황
    tomorrow_golf = db.query(GolfTeetime).filter(
        GolfTeetime.tee_date == tomorrow, GolfTeetime.status == "reserved",
    ).count()
    tomorrow_room = db.query(RoomReservation).filter(
        RoomReservation.check_in == tomorrow, RoomReservation.status == "confirmed",
    ).count()

    # 오늘 점유율
    today_stat = db.query(DailyStat).filter(DailyStat.stat_date == today).first()
    occupancy = float(today_stat.room_occupancy_rate or 0) * 100 if today_stat else 0

    # 노쇼 위험 건수
    noshow_risk = db.query(GolfTeetime).filter(
        GolfTeetime.tee_date >= today,
        GolfTeetime.noshow_score >= 0.3,
        GolfTeetime.status == "reserved",
    ).count()

    return {
        "today": str(today),
        "month_to_date_revenue": {
            "total": total_rev, "golf": golf_rev, "room": room_rev,
            "fnb": fnb_rev, "oncheon": oncheon_rev,
        },
        "course_rounds_this_month": course_rounds,
        "customers": {
            "total": total_customers,
            "by_grade": grade_dist,
            "churn_high_risk": churn_high,
        },
        "tomorrow_reservations": {
            "golf": tomorrow_golf,
            "room": tomorrow_room,
        },
        "today_room_occupancy_pct": round(occupancy, 1),
        "noshow_risk_count": noshow_risk,
        "total_rooms": db.query(Room).count(),
        "active_packages": db.query(Package).filter(Package.is_active.is_(True)).count(),
    }


_LLM_SYSTEM_PROMPT = """당신은 설해원 리조트(골프+호텔+온천 복합 단지)의 AI CRM 어시스턴트입니다.
사용자(관리자)의 질문에 한국어로 간결·실용적으로 답변하세요.

답변 원칙:
1. 제공된 JSON 데이터의 숫자를 정확히 인용할 것 (추측/창작 금지)
2. 3~6줄로 핵심만. 불필요한 서두("안녕하세요" 등) 금지
3. 원화 금액은 ₩1,234,567 형식
4. 근거가 부족하면 "데이터로 확인 필요"라고 명시
5. 가능하면 구체적 액션("○○ 캠페인 실행" 등) 1개 제안
"""


def _fetch_query_detail(q: str, db: Session) -> dict:
    """질문 의도를 감지해 실제 DB 레코드(이름·연락처 포함)를 가져온다.
    LLM 답변에도 근거로 제공되고, 프론트는 data/rows를 테이블로 렌더한다.

    반환: {query_type, rows: list[dict], extra: dict}
    """
    today = date.today()
    # 이탈 위험
    if any(k in q for k in ("이탈", "이탈위험", "churn")):
        customers = (
            db.query(Customer)
            .filter(Customer.churn_risk >= 0.5)
            .order_by(Customer.churn_risk.desc())
            .limit(20)
            .all()
        )
        rows = [
            {
                "id": str(c.id),
                "이름": c.name,
                "등급": c.grade,
                "연락처": c.phone,
                "이탈위험": f"{float(c.churn_risk) * 100:.0f}%",
                "CLV": f"₩{int(c.clv or 0):,}",
                "최근방문": c.last_visit_at.strftime("%Y-%m-%d") if c.last_visit_at else "-",
                "방문수": c.total_visits,
            }
            for c in customers
        ]
        total_clv = sum(int(c.clv or 0) for c in customers)
        return {
            "query_type": "churn",
            "rows": rows,
            "extra": {"count": len(rows), "total_clv_at_risk": total_clv},
        }

    # 노쇼 위험
    if "노쇼" in q:
        high_risk = (
            db.query(GolfTeetime, Customer, GolfCourse)
            .outerjoin(Customer, GolfTeetime.customer_id == Customer.id)
            .outerjoin(GolfCourse, GolfTeetime.course_id == GolfCourse.id)
            .filter(GolfTeetime.tee_date >= today, GolfTeetime.noshow_score >= 0.3)
            .order_by(GolfTeetime.noshow_score.desc())
            .limit(20)
            .all()
        )
        rows = [
            {
                "고객": cust.name if cust else "미지정",
                "연락처": cust.phone if cust else "-",
                "날짜": str(t.tee_date),
                "시간": t.tee_time.strftime("%H:%M"),
                "코스": course.name if course else "-",
                "인원": t.party_size,
                "위험도": f"{float(t.noshow_score) * 100:.0f}%",
            }
            for t, cust, course in high_risk
        ]
        return {"query_type": "noshow", "rows": rows, "extra": {"count": len(rows)}}

    # 고객 등급 현황
    if any(k in q for k in ("고객", "회원", "등급")):
        grade_rows = db.query(Customer.grade, func.count()).group_by(Customer.grade).all()
        total_count = sum(cnt for _, cnt in grade_rows)
        high_clv = db.query(Customer).filter(Customer.clv >= 10_000_000).count()
        rows = [
            {"등급": g, "인원": cnt, "비율": f"{cnt / total_count * 100:.1f}%"}
            for g, cnt in grade_rows
        ]
        return {
            "query_type": "customers",
            "rows": rows,
            "extra": {"total": total_count, "high_clv": high_clv},
        }

    # 코스별 매출 비교
    if "매출" in q and ("코스" in q or "비교" in q):
        month_start = today.replace(day=1)
        prices = {"레전드": 450000, "오션": 380000, "마운틴": 320000}
        rows = []
        for c in db.query(GolfCourse).all():
            cnt = db.query(GolfTeetime).filter(
                GolfTeetime.course_id == c.id,
                GolfTeetime.tee_date >= month_start,
                GolfTeetime.tee_date <= today,
                GolfTeetime.status.in_(["completed", "reserved"]),
            ).count()
            price = prices.get(c.name, 350000)
            rows.append({
                "코스": c.name,
                "라운드수": cnt,
                "객단가": f"₩{price:,}",
                "예상매출": f"₩{cnt * price:,}",
            })
        rows.sort(key=lambda r: int(r["예상매출"].replace("₩", "").replace(",", "")), reverse=True)
        return {"query_type": "course_revenue", "rows": rows, "extra": {}}

    # 예약 현황
    if "예약" in q:
        tomorrow = today + timedelta(days=1)
        # 내일 골프 예약 상세
        tmr_golf = (
            db.query(GolfTeetime, Customer, GolfCourse)
            .outerjoin(Customer, GolfTeetime.customer_id == Customer.id)
            .outerjoin(GolfCourse, GolfTeetime.course_id == GolfCourse.id)
            .filter(GolfTeetime.tee_date == tomorrow, GolfTeetime.status.in_(["reserved", "pending"]))
            .order_by(GolfTeetime.tee_time)
            .limit(30)
            .all()
        )
        rows = [
            {
                "고객": cust.name if cust else "미지정",
                "등급": cust.grade if cust else "-",
                "시간": t.tee_time.strftime("%H:%M"),
                "코스": course.name if course else "-",
                "인원": t.party_size,
                "상태": "확정대기" if t.status == "pending" else "예약",
            }
            for t, cust, course in tmr_golf
        ]
        return {"query_type": "tomorrow_reservations", "rows": rows, "extra": {"date": str(tomorrow)}}

    # 업셀/패키지 추천 타겟
    if any(k in q for k in ("업셀", "패키지", "추천")):
        targets = (
            db.query(Customer)
            .filter(
                Customer.grade.in_(["gold", "silver"]),
                Customer.total_visits >= 5,
                Customer.churn_risk < 0.3,
            )
            .order_by(Customer.clv.desc())
            .limit(20)
            .all()
        )
        rows = [
            {
                "id": str(c.id),
                "이름": c.name,
                "등급": c.grade,
                "연락처": c.phone,
                "CLV": f"₩{int(c.clv or 0):,}",
                "방문수": c.total_visits,
                "이탈위험": f"{float(c.churn_risk) * 100:.0f}%",
            }
            for c in targets
        ]
        return {"query_type": "upsell_targets", "rows": rows, "extra": {"count": len(rows)}}

    return {"query_type": "general", "rows": [], "extra": {}}


@router.post("/query")
def ai_query(body: AiQueryRequest, db: Session = Depends(get_db)):
    # 1) 의도에 맞는 실제 DB 레코드를 우선 확보 (LLM 성공/실패와 무관하게 프론트에 제공)
    detail = _fetch_query_detail(body.query, db)
    ctx = _collect_business_context(db)

    # 2) LLM이 있으면 실제 레코드 + 스냅샷을 근거로 자연어 답변
    if llm_available():
        try:
            rows_preview = detail["rows"][:10]
            user_msg = (
                f"[비즈니스 스냅샷]\n{json.dumps(ctx, ensure_ascii=False)}\n\n"
                f"[관련 고객/예약 실데이터 — 이 목록을 근거로 답하라]\n"
                f"{json.dumps(rows_preview, ensure_ascii=False)}\n\n"
                f"[질문]\n{body.query}\n\n"
                "답변 지침:\n"
                "- 위 실데이터에 이름이 있으면 대표 2~3명을 실제 이름으로 인용하라\n"
                "- 전체 수·금액 등 숫자는 정확히 쓰라\n"
                "- '이 고객 목록은 아래 표 참고'처럼 표를 참조하라고 안내하라"
            )
            answer = llm_chat(_LLM_SYSTEM_PROMPT, user_msg, max_tokens=500, temperature=0.3)
            return {
                "query_type": detail["query_type"],
                "answer": answer,
                "data": detail["rows"],
                "extra": detail["extra"],
                "model": "openrouter",
            }
        except Exception as e:
            log.warning("LLM query failed, falling back to rule-based: %s", e)

    # 3) LLM 없거나 실패 시: rule-based 문자열 답변 + detail rows 반환
    fallback = _rule_based_query(body, db)
    if detail["rows"]:
        # rule-based가 이미 data를 채운 경우도 있지만, detail이 더 풍부하면 교체
        fallback["data"] = detail["rows"]
        fallback["extra"] = detail["extra"]
    return fallback


def _rule_based_query(body: AiQueryRequest, db: Session):
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


# 프로세스 내 인사이트 캐시 (60초) — 모든 사용자에게 동일 응답이므로 안전.
# Vercel 워밍된 컨테이너에서 반복 요청 시 DB 6~7회 조회 생략.
import time as _time
_SUGG_CACHE: dict = {"data": None, "ts": 0.0}
_SUGG_TTL = 60.0


@router.get("/suggestions")
def ai_suggestions(db: Session = Depends(get_db)):
    if _SUGG_CACHE["data"] is not None and _time.time() - _SUGG_CACHE["ts"] < _SUGG_TTL:
        return _SUGG_CACHE["data"]
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

    _SUGG_CACHE["data"] = suggestions
    _SUGG_CACHE["ts"] = _time.time()
    return suggestions


@router.get("/revenue-optimization")
def revenue_optimization(db: Session = Depends(get_db)):
    """AI 매출 극대화 분석 보고서"""
    from app.services.ai_engine import forecast_demand, calculate_overbooking

    today = date.today()
    month_start = today.replace(day=1)
    tomorrow = today + timedelta(days=1)

    stats = db.query(DailyStat).filter(
        DailyStat.stat_date >= month_start, DailyStat.stat_date <= today
    ).all()
    total_revenue = sum(int(s.total_revenue or 0) for s in stats)

    weekday_rev = sum(int(s.total_revenue or 0) for s in stats if s.stat_date.weekday() < 5)
    weekend_rev = sum(int(s.total_revenue or 0) for s in stats if s.stat_date.weekday() >= 5)
    weekday_count = sum(1 for s in stats if s.stat_date.weekday() < 5) or 1
    weekend_count = sum(1 for s in stats if s.stat_date.weekday() >= 5) or 1

    empty_slots = db.query(GolfTeetime).filter(
        GolfTeetime.tee_date == tomorrow, GolfTeetime.status == "available",
    ).count()

    dormant_vips = db.query(Customer).filter(
        Customer.grade.in_(["diamond", "gold"]),
        Customer.last_visit_at < today - timedelta(days=30),
    ).count()

    forecast = forecast_demand(db, tomorrow)
    overbook = calculate_overbooking(db, tomorrow)

    return {
        "summary": f"이번 달 매출: ₩{total_revenue:,}",
        "tomorrow_forecast": forecast,
        "overbooking": overbook,
        "insights": [
            {
                "title": "평일 매출 강화 필요",
                "detail": f"평일 일평균 ₩{weekday_rev // weekday_count:,} vs 주말 일평균 ₩{weekend_rev // weekend_count:,}. "
                          "평일 프로모션으로 격차를 줄이세요.",
                "impact": f"₩{(weekend_rev // weekend_count - weekday_rev // weekday_count):,} 갭",
            },
            {
                "title": f"내일 빈 슬롯 {empty_slots}개 활용",
                "detail": "대기 고객 자동 배정 또는 당일 할인 프로모션으로 빈 슬롯을 채우세요.",
                "impact": f"₩{empty_slots * 380000:,} 잠재 매출",
            },
            {
                "title": f"미방문 VIP {dormant_vips}명 리콜",
                "detail": "30일 이상 미방문 Diamond/Gold 고객에게 맞춤 초대를 발송하세요.",
                "impact": "VIP CLV 보호",
            },
            {
                "title": f"오버부킹 {overbook['recommended_overbook']}건 추천",
                "detail": f"내일 예상 노쇼 {overbook['expected_noshows']:.0f}건 기반. "
                          f"안전 마진 적용하여 {overbook['recommended_overbook']}건 추가 예약 가능.",
                "impact": f"₩{overbook['potential_recovery']:,} 회수",
            },
        ],
    }


@router.get("/dynamic-pricing/{room_id}")
def get_dynamic_price(
    room_id: str,
    target_date: date = Query(..., alias="date"),
    customer_id: str | None = Query(None),
    db: Session = Depends(get_db),
):
    """객실 동적 가격 조회"""
    from uuid import UUID as UUIDType
    from app.services.ai_engine import calculate_dynamic_price

    room = db.query(Room).filter(Room.id == UUIDType(room_id)).first()
    if not room:
        from fastapi import HTTPException
        raise HTTPException(404, "Room not found")

    stat = db.query(DailyStat).filter(DailyStat.stat_date == target_date).first()
    occupancy = float(stat.room_occupancy_rate or 0) if stat else 0.5

    customer_grade = None
    if customer_id:
        cust = db.query(Customer).filter(Customer.id == UUIDType(customer_id)).first()
        if cust:
            customer_grade = cust.grade

    return calculate_dynamic_price(
        int(room.base_price), target_date, room.room_type, occupancy, customer_grade
    )


@router.get("/package-recommend/{customer_id}")
def get_package_recommendation(customer_id: str, db: Session = Depends(get_db)):
    """고객 맞춤 패키지 추천"""
    from uuid import UUID as UUIDType
    from app.services.ai_engine import recommend_packages

    cust = db.query(Customer).filter(Customer.id == UUIDType(customer_id)).first()
    if not cust:
        from fastapi import HTTPException
        raise HTTPException(404, "Customer not found")

    return recommend_packages(cust, db)


@router.get("/crosssell/{customer_id}")
def get_crosssell(
    customer_id: str,
    booking_type: str = Query(...),
    booking_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    """크로스셀 추천"""
    from uuid import UUID as UUIDType
    from app.services.ai_engine import get_crosssell_recommendations

    cust = db.query(Customer).filter(Customer.id == UUIDType(customer_id)).first()
    if not cust:
        from fastapi import HTTPException
        raise HTTPException(404, "Customer not found")

    return get_crosssell_recommendations(cust, booking_type, booking_date, db)


@router.get("/caddy-recommend/{customer_id}")
def get_caddy_recommendation(customer_id: str, db: Session = Depends(get_db)):
    """캐디 매칭 추천"""
    from uuid import UUID as UUIDType
    from app.services.ai_engine import recommend_caddy

    cust = db.query(Customer).filter(Customer.id == UUIDType(customer_id)).first()
    if not cust:
        from fastapi import HTTPException
        raise HTTPException(404, "Customer not found")

    return recommend_caddy(cust, db)


_BRIEFING_SYSTEM_PROMPT = """당신은 설해원 리조트 총지배인의 AI 비서입니다.
오늘의 데이터 스냅샷 JSON을 받아 **임원 일일 브리핑**을 한국어로 작성하세요.

형식 (마크다운 쓰지 말고 평문):
1줄 요약 (매출·점유·특이사항 중 가장 중요한 1개)
━━━━━━━━━━━━━━━━━━━━
◆ 어제 실적: [원 단위 금액, 전일/전주 대비 한 줄 평]
◆ 오늘 운영: [체크인/체크아웃/VIP 도착 요약]
◆ 내일 대비: [예약 수 + 노쇼 위험 + 이탈 위험]
◆ 우선 조치: [1~3개, 각 한 줄]

원칙: 숫자 정확히 인용, 과장 금지, 길어야 10줄."""


@router.get("/briefing")
def get_daily_briefing(db: Session = Depends(get_db)):
    """일일 AI 브리핑 — LLM이 있으면 자연어 summary 추가."""
    from app.services.ai_engine import generate_daily_briefing
    briefing = generate_daily_briefing(db)
    if llm_available():
        try:
            summary = llm_chat(
                _BRIEFING_SYSTEM_PROMPT,
                f"[오늘의 브리핑 데이터]\n{json.dumps(briefing, ensure_ascii=False, default=str)}",
                max_tokens=450,
                temperature=0.35,
            )
            briefing["ai_summary"] = summary
        except Exception as e:
            log.warning("briefing LLM summary failed: %s", e)
    return briefing


@router.get("/demand-forecast")
def get_demand_forecast(
    target_date: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    """수요 예측"""
    from app.services.ai_engine import forecast_demand
    return forecast_demand(db, target_date)


# ─── AI Action 응답 (승인 / 수정 / 무시) ─────────────────────────────
class ActionRespondRequest(BaseModel):
    suggestion_id: str  # "sug-churn" 같은 문자열 ID 또는 DB action UUID
    status: str  # "approved" | "executed" | "dismissed"
    note: str | None = None


@router.post("/actions/respond")
def respond_to_action(body: ActionRespondRequest, db: Session = Depends(get_db)):
    """
    AI 제안(sug-*) 또는 기존 AiActionLog에 대한 사용자 응답을 기록.

    - 입력 id가 DB AiActionLog.id(UUID) 형태면 해당 행의 status 업데이트
    - 아니면 새 AiActionLog 항목을 생성 (payload에 원래 suggestion_id 기록)
    """
    from uuid import UUID as UUIDType
    from datetime import datetime, timezone

    if body.status not in ("approved", "executed", "dismissed"):
        from fastapi import HTTPException
        raise HTTPException(400, f"invalid status: {body.status}")

    # 기존 log 업데이트 시도
    try:
        uid = UUIDType(body.suggestion_id)
        existing = db.query(AiActionLog).filter(AiActionLog.id == uid).first()
        if existing:
            existing.status = body.status
            existing.result = {
                "responded_at": datetime.now(timezone.utc).isoformat(),
                "note": body.note,
            }
            db.commit()
            return {"ok": True, "action_id": str(existing.id), "mode": "updated"}
    except (ValueError, TypeError):
        pass

    # 새 로그 생성 (클라이언트 사이드 제안에 대한 응답)
    new_log = AiActionLog(
        action_type="suggestion_response",
        payload={"suggestion_id": body.suggestion_id, "note": body.note},
        status=body.status,
        created_by="user",
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return {"ok": True, "action_id": str(new_log.id), "mode": "created"}

