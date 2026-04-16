"""
AI Revenue Engine — 다이나믹 프라이싱, 맞춤 패키지 추천, 크로스셀, 수요 예측
"""
from datetime import date, timedelta
import math

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.analytics import DailyStat
from app.models.customer import Customer
from app.models.golf import GolfCourse, GolfTeetime
from app.models.resort import Room, RoomReservation
from app.models.package import Package
from app.models.staff import Staff


# ─── Dynamic Pricing Engine ───

def calculate_dynamic_price(
    base_price: int,
    target_date: date,
    room_type: str,
    occupancy_rate: float,
    customer_grade: str | None = None,
) -> dict:
    """객실 동적 가격 계산"""
    multiplier = 1.0
    reasons = []

    weekday = target_date.weekday()

    # Weekend premium
    if weekday == 4:  # Friday
        multiplier += 0.10
        reasons.append("금요일 +10%")
    elif weekday >= 5:  # Sat-Sun
        multiplier += 0.20
        reasons.append("주말 +20%")

    # High occupancy premium
    if occupancy_rate >= 0.85:
        multiplier += 0.15
        reasons.append(f"고점유({occupancy_rate*100:.0f}%) +15%")
    elif occupancy_rate >= 0.70:
        multiplier += 0.08
        reasons.append(f"중점유({occupancy_rate*100:.0f}%) +8%")

    # Low occupancy discount
    if occupancy_rate < 0.40:
        multiplier -= 0.15
        reasons.append(f"저점유({occupancy_rate*100:.0f}%) -15%")
    elif occupancy_rate < 0.55:
        multiplier -= 0.08
        reasons.append(f"저점유({occupancy_rate*100:.0f}%) -8%")

    # Season adjustment (summer premium, winter discount)
    month = target_date.month
    if month in (6, 7, 8):
        multiplier += 0.10
        reasons.append("여름 성수기 +10%")
    elif month in (12, 1, 2):
        multiplier -= 0.05
        reasons.append("겨울 비수기 -5%")

    # Suite premium
    if room_type == "풀스위트":
        multiplier += 0.05
        reasons.append("풀스위트 프리미엄 +5%")

    # VIP loyalty discount
    if customer_grade == "diamond":
        multiplier -= 0.05
        reasons.append("Diamond 로열티 -5%")
    elif customer_grade == "gold":
        multiplier -= 0.03
        reasons.append("Gold 로열티 -3%")

    final_price = int(base_price * max(multiplier, 0.75))  # Floor at 75%
    discount = int(base_price - final_price) if final_price < base_price else 0
    premium = int(final_price - base_price) if final_price > base_price else 0

    return {
        "base_price": base_price,
        "final_price": final_price,
        "multiplier": round(multiplier, 2),
        "discount": discount,
        "premium": premium,
        "reasons": reasons,
    }


# ─── Personalized Package Recommendation ───

def recommend_packages(customer: Customer, db: Session) -> list[dict]:
    """고객 맞춤 패키지 추천"""
    prefs = customer.preferences or {}
    tags = customer.ai_tags or []
    grade = customer.grade

    packages = db.query(Package).filter(Package.is_active.is_(True)).all()

    scored = []
    for pkg in packages:
        score = 0.0
        reasons = []

        # Grade match
        if pkg.target_segment == grade:
            score += 30
            reasons.append("등급 적합")
        elif pkg.target_segment in ("diamond", "gold") and grade in ("diamond", "gold"):
            score += 15
            reasons.append("상위 등급 호환")

        # Course preference match
        pref_course = prefs.get("preferred_course", "")
        components = pkg.components if isinstance(pkg.components, list) else []
        for comp in components:
            if isinstance(comp, dict) and comp.get("course") == pref_course:
                score += 25
                reasons.append(f"{pref_course}코스 선호 매칭")
                break

        # Tag-based scoring
        tag_map = {
            "#온천_애용": ["oncheon"],
            "#풀스위트_선호": ["풀스위트"],
            "#F&B_고소비": ["fnb"],
            "#레전드코스_선호": ["레전드"],
            "#오션코스_선호": ["오션"],
            "#마운틴코스_선호": ["마운틴"],
        }
        for tag in tags:
            if tag in tag_map:
                for keyword in tag_map[tag]:
                    pkg_str = str(pkg.components).lower() + pkg.name
                    if keyword.lower() in pkg_str:
                        score += 15
                        reasons.append(f"태그 매칭: {tag}")

        # CLV-based pricing alignment
        clv = int(customer.clv or 0)
        pkg_price = int(pkg.base_price or 0)
        if clv > 10_000_000 and pkg_price > 800_000:
            score += 10
            reasons.append("고CLV 프리미엄 매칭")
        elif clv < 5_000_000 and pkg_price < 500_000:
            score += 10
            reasons.append("가격대 적합")

        # Historical acceptance boost
        acceptance = float(pkg.acceptance_rate or 0)
        score += acceptance * 20
        if acceptance > 0.4:
            reasons.append(f"높은 수락률({acceptance*100:.0f}%)")

        # Churn prevention bonus
        churn = float(customer.churn_risk or 0)
        if churn > 0.3:
            score += 15
            reasons.append("이탈 방지 프로모션")

        acceptance_prediction = min(0.95, (score / 100) * 0.8)

        scored.append({
            "package_id": str(pkg.id),
            "package_name": pkg.name,
            "base_price": pkg_price,
            "description": pkg.description,
            "score": round(score, 1),
            "acceptance_rate": round(acceptance_prediction, 2),
            "reasons": reasons,
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:3]


# ─── Cross-sell Recommendations ───

def get_crosssell_recommendations(
    customer: Customer,
    booking_type: str,
    booking_date: date,
    db: Session,
) -> list[dict]:
    """예약 시점 크로스셀 추천"""
    recommendations = []
    tags = customer.ai_tags or []
    grade = customer.grade

    if booking_type == "golf":
        # Golf → Room upsell
        rooms = db.query(Room).filter(Room.status == "available").all()
        if rooms:
            room = rooms[0]
            price = calculate_dynamic_price(
                int(room.base_price), booking_date, room.room_type, 0.6, grade
            )
            recommendations.append({
                "type": "room",
                "title": "라운딩 후 1박 추천",
                "detail": f"{room.building} {room.room_type} — 골프 후 편안한 휴식",
                "original_price": int(room.base_price),
                "offer_price": int(price["final_price"] * 0.9),  # 10% bundle discount
                "savings": int(room.base_price - price["final_price"] * 0.9),
                "acceptance_rate": 0.34 if grade in ("diamond", "gold") else 0.22,
            })

        # Golf → Oncheon upsell
        if "#온천_애용" in tags or grade in ("diamond", "gold"):
            recommendations.append({
                "type": "oncheon",
                "title": "라운딩 후 온천 힐링",
                "detail": "설해온천 2시간 이용권 — 피로 회복에 최적",
                "original_price": 80000,
                "offer_price": 60000,
                "savings": 20000,
                "acceptance_rate": 0.45 if "#온천_애용" in tags else 0.28,
            })

        # Golf → F&B upsell
        if "#F&B_고소비" in tags or grade == "diamond":
            recommendations.append({
                "type": "fnb",
                "title": "특선 디너 코스",
                "detail": "설해원 시그니처 한우 디너 — 2인 기준",
                "original_price": 180000,
                "offer_price": 150000,
                "savings": 30000,
                "acceptance_rate": 0.38,
            })

    elif booking_type == "room":
        # Room → Golf upsell
        courses = db.query(GolfCourse).filter(GolfCourse.status == "open").all()
        if courses:
            pref = (customer.preferences or {}).get("preferred_course", "레전드")
            matched = next((c for c in courses if c.name == pref), courses[0])
            price_map = {"레전드": 450000, "오션": 380000, "마운틴": 320000}
            recommendations.append({
                "type": "golf",
                "title": f"{matched.name}코스 라운딩 추가",
                "detail": f"투숙 고객 전용 {matched.name}코스 {matched.holes}홀 라운딩",
                "original_price": price_map.get(matched.name, 380000),
                "offer_price": int(price_map.get(matched.name, 380000) * 0.85),
                "savings": int(price_map.get(matched.name, 380000) * 0.15),
                "acceptance_rate": 0.41,
            })

        recommendations.append({
            "type": "oncheon",
            "title": "투숙객 온천 특가",
            "detail": "설해온천 무제한 이용 — 투숙 기간 중",
            "original_price": 80000,
            "offer_price": 50000,
            "savings": 30000,
            "acceptance_rate": 0.52,
        })

    return recommendations


# ─── Demand Forecast ───

def forecast_demand(db: Session, target_date: date) -> dict:
    """수요 예측"""
    weekday = target_date.weekday()
    is_weekend = weekday >= 5

    # Historical average for same day-of-week
    same_dow_stats = (
        db.query(DailyStat)
        .filter(func.extract("dow", DailyStat.stat_date) == weekday)
        .order_by(DailyStat.stat_date.desc())
        .limit(12)
        .all()
    )

    if not same_dow_stats:
        return {
            "date": str(target_date),
            "predicted_golf_rounds": 20 if is_weekend else 12,
            "predicted_occupancy": 0.80 if is_weekend else 0.55,
            "predicted_revenue": 15_000_000 if is_weekend else 8_000_000,
            "confidence": 0.3,
        }

    avg_rounds = sum(int(s.golf_rounds or 0) for s in same_dow_stats) / len(same_dow_stats)
    avg_occ = sum(float(s.room_occupancy_rate or 0) for s in same_dow_stats) / len(same_dow_stats)
    avg_rev = sum(int(s.total_revenue or 0) for s in same_dow_stats) / len(same_dow_stats)

    # Trend adjustment (recent weeks weighted more)
    recent = same_dow_stats[:4]
    if recent:
        recent_avg_rev = sum(int(s.total_revenue or 0) for s in recent) / len(recent)
        trend = (recent_avg_rev - avg_rev) / avg_rev if avg_rev > 0 else 0
    else:
        trend = 0

    return {
        "date": str(target_date),
        "day_of_week": ["월", "화", "수", "목", "금", "토", "일"][weekday],
        "predicted_golf_rounds": round(avg_rounds * (1 + trend * 0.5)),
        "predicted_occupancy": round(min(0.98, avg_occ * (1 + trend * 0.3)), 2),
        "predicted_revenue": round(avg_rev * (1 + trend * 0.5)),
        "trend": round(trend * 100, 1),
        "confidence": 0.75 if len(same_dow_stats) >= 8 else 0.55,
    }


# ─── No-show Overbooking Optimization ───

def calculate_overbooking(db: Session, target_date: date, course_id: str | None = None) -> dict:
    """노쇼 기반 최적 오버부킹 수 계산"""
    q = db.query(GolfTeetime).filter(
        GolfTeetime.tee_date == target_date,
        GolfTeetime.status == "reserved",
    )
    if course_id:
        q = q.filter(GolfTeetime.course_id == course_id)
    bookings = q.all()

    total_reserved = len(bookings)
    high_risk = [b for b in bookings if float(b.noshow_score or 0) >= 0.3]
    medium_risk = [b for b in bookings if 0.15 <= float(b.noshow_score or 0) < 0.3]

    expected_noshows = sum(float(b.noshow_score or 0) for b in bookings)
    safe_overbook = max(0, math.floor(expected_noshows * 0.7))  # Conservative

    revenue_per_slot = 380000
    potential_recovery = safe_overbook * revenue_per_slot

    return {
        "date": str(target_date),
        "total_reserved": total_reserved,
        "high_risk_count": len(high_risk),
        "medium_risk_count": len(medium_risk),
        "expected_noshows": round(expected_noshows, 1),
        "recommended_overbook": safe_overbook,
        "potential_recovery": potential_recovery,
        "high_risk_customers": [
            {
                "teetime_id": str(b.id),
                "time": b.tee_time.strftime("%H:%M"),
                "noshow_score": float(b.noshow_score or 0),
                "customer_id": str(b.customer_id) if b.customer_id else None,
            }
            for b in sorted(high_risk, key=lambda x: float(x.noshow_score or 0), reverse=True)[:5]
        ],
    }


# ─── Caddy Matching ───

def recommend_caddy(customer: Customer, db: Session) -> list[dict]:
    """고객 맞춤 캐디 추천"""
    caddies = db.query(Staff).filter(Staff.role == "caddy", Staff.is_active.is_(True)).all()

    # Check customer's past caddy preferences
    memos = customer.ai_memo or []
    preferred_caddy = None
    for memo in memos:
        if isinstance(memo, dict) and "캐디" in memo.get("content", ""):
            for caddy in caddies:
                if caddy.name in memo.get("content", ""):
                    preferred_caddy = caddy
                    break

    # Get recent caddy assignments
    recent_teetimes = (
        db.query(GolfTeetime)
        .filter(GolfTeetime.customer_id == customer.id, GolfTeetime.caddy_id.isnot(None))
        .order_by(GolfTeetime.tee_date.desc())
        .limit(10)
        .all()
    )

    caddy_counts: dict[str, int] = {}
    for tt in recent_teetimes:
        cid = str(tt.caddy_id)
        caddy_counts[cid] = caddy_counts.get(cid, 0) + 1

    results = []
    for caddy in caddies:
        score = 0
        reasons = []
        cid = str(caddy.id)

        # Preferred caddy
        if preferred_caddy and caddy.id == preferred_caddy.id:
            score += 50
            reasons.append("고객 지정 캐디")

        # Frequently paired
        if cid in caddy_counts:
            score += caddy_counts[cid] * 10
            reasons.append(f"과거 {caddy_counts[cid]}회 배정")

        # VIP handling (based on naming convention for senior caddies)
        if customer.grade in ("diamond", "gold"):
            score += 5
            reasons.append("VIP 전담")

        results.append({
            "caddy_id": cid,
            "caddy_name": caddy.name,
            "score": score,
            "reasons": reasons,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:3]


# ─── Daily AI Briefing ───

def generate_daily_briefing(db: Session) -> dict:
    """일일 AI 브리핑 생성"""
    today = date.today()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)

    # Yesterday stats
    y_stat = db.query(DailyStat).filter(DailyStat.stat_date == yesterday).first()
    t_stat = db.query(DailyStat).filter(DailyStat.stat_date == today).first()

    # Tomorrow bookings
    tmr_golf = db.query(GolfTeetime).filter(
        GolfTeetime.tee_date == tomorrow, GolfTeetime.status == "reserved"
    ).count()
    tmr_rooms = db.query(RoomReservation).filter(
        RoomReservation.check_in == tomorrow, RoomReservation.status == "confirmed"
    ).count()

    # High priority items
    noshow_risk = db.query(GolfTeetime).filter(
        GolfTeetime.tee_date == tomorrow,
        GolfTeetime.noshow_score >= 0.3,
        GolfTeetime.status == "reserved",
    ).count()

    churn_risk = db.query(Customer).filter(Customer.churn_risk >= 0.5).count()

    # Today checkins/checkouts
    checkins = db.query(RoomReservation).filter(
        RoomReservation.check_in == today, RoomReservation.status == "confirmed"
    ).count()
    checkouts = db.query(RoomReservation).filter(
        RoomReservation.check_out == today, RoomReservation.status == "checked_in"
    ).count()

    # VIP arrivals
    from sqlalchemy import and_
    vip_arrivals = (
        db.query(Customer)
        .join(GolfTeetime, GolfTeetime.customer_id == Customer.id)
        .filter(
            GolfTeetime.tee_date == today,
            Customer.grade.in_(["diamond", "gold"]),
        )
        .distinct()
        .all()
    )

    tasks = []
    if noshow_risk > 0:
        tasks.append({"priority": "high", "task": f"내일 노쇼 위험 예약 {noshow_risk}건 리마인드 발송"})
    if churn_risk > 0:
        tasks.append({"priority": "high", "task": f"이탈 위험 고객 {churn_risk}명 리텐션 캠페인 검토"})
    if checkins > 0:
        tasks.append({"priority": "medium", "task": f"오늘 체크인 {checkins}건 준비"})
    if checkouts > 0:
        tasks.append({"priority": "medium", "task": f"오늘 체크아웃 {checkouts}건 처리"})
    for vip in vip_arrivals[:3]:
        tasks.append({"priority": "high", "task": f"VIP {vip.name}({vip.grade}) 방문 — 맞춤 서비스 준비"})

    return {
        "date": str(today),
        "yesterday_revenue": int(y_stat.total_revenue or 0) if y_stat else 0,
        "today_revenue_so_far": int(t_stat.total_revenue or 0) if t_stat else 0,
        "tomorrow_forecast": {
            "golf_bookings": tmr_golf,
            "room_checkins": tmr_rooms,
            "noshow_risk": noshow_risk,
        },
        "operations": {
            "checkins_today": checkins,
            "checkouts_today": checkouts,
            "vip_arrivals": [{"name": v.name, "grade": v.grade} for v in vip_arrivals[:5]],
        },
        "alerts": {
            "churn_risk_customers": churn_risk,
            "noshow_risk_bookings": noshow_risk,
        },
        "tasks": tasks,
    }
