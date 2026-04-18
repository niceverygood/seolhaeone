"""
Vercel Serverless 환경에서 /seed-demo 엔드포인트가 호출하는 경량 데모 시드.

전체 seed.py는 2년치 이력 + 28,000건의 teetime 같은 대량 데이터라 Vercel
타임아웃을 넘는다. 여기서는 대시보드·골프예약·객실예약·고객목록이 "살아
있어 보이도록" 최소한의 분량을 생성한다.

멱등: 이미 courses가 존재하면 아무것도 하지 않는다.
"""
from __future__ import annotations

import random
from datetime import date, datetime, time, timedelta, timezone

from faker import Faker
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.analytics import AiActionLog, DailyStat
from app.models.customer import Customer
from app.models.golf import GolfCourse, GolfTeetime
from app.models.package import Package
from app.models.resort import Room, RoomReservation
from app.models.staff import Staff

fake = Faker("ko_KR")
Faker.seed(42)
random.seed(42)

KST = timezone(timedelta(hours=9))

AI_TAGS = [
    "#레전드코스_선호", "#오션코스_선호", "#주말방문", "#VIP",
    "#풀스위트_선호", "#F&B_고소비", "#가족동반", "#기업고객",
    "#캐디_지정", "#장기투숙", "#재방문율_높음",
]

COURSE_NAMES = ["마운틴", "오션", "레전드"]
BUILDINGS = {
    "마운틴스테이": {"풀스위트": 3, "스파스위트": 4, "디럭스": 5},
    "설해온천": {"레귤러": 12, "디럭스": 8},
    "골프텔": {"레귤러": 10},
}
BASE_PRICES = {"풀스위트": 850000, "스파스위트": 650000, "디럭스": 450000, "레귤러": 280000}


def run_demo_seed(db: Session) -> dict:
    summary: dict = {}

    # ── 이미 시드되어 있으면 skip
    if db.query(GolfCourse).count() > 0:
        return {
            "skipped": True,
            "reason": "already seeded",
            "counts": {
                "staff": db.query(Staff).count(),
                "courses": db.query(GolfCourse).count(),
                "rooms": db.query(Room).count(),
                "customers": db.query(Customer).count(),
                "teetimes": db.query(GolfTeetime).count(),
                "reservations": db.query(RoomReservation).count(),
                "daily_stats": db.query(DailyStat).count(),
                "ai_logs": db.query(AiActionLog).count(),
            },
        }

    # ── 1) Staff (admin은 이미 있을 수 있음, 중복 방지)
    staff_seed = [
        ("한승수", "admin", "management", "admin@seolhaeone.kr"),
        ("김소연", "manager", "golf", "soyon@seolhaeone.kr"),
        ("박준형", "front_desk", "resort", "jun@seolhaeone.kr"),
        ("이하나", "manager", "fnb", "hana@seolhaeone.kr"),
        ("최민주", "manager", "spa", "minju@seolhaeone.kr"),
    ]
    existing_emails = {s.email for s in db.query(Staff).all()}
    staff_objs: list[Staff] = list(db.query(Staff).all())
    for name, role, dept, email in staff_seed:
        if email in existing_emails:
            continue
        s = Staff(
            name=name, role=role, department=dept, email=email,
            hashed_password=hash_password("seolhae1234"),
        )
        db.add(s)
        staff_objs.append(s)
    caddies: list[Staff] = []
    for i in range(12):
        c = Staff(name=f"캐디_{i+1:02d}", role="caddy", department="golf")
        db.add(c)
        caddies.append(c)
    db.flush()
    summary["staff"] = len(staff_objs) + len(caddies)

    # ── 2) Courses
    courses: list[GolfCourse] = []
    for name in COURSE_NAMES:
        c = GolfCourse(name=name, holes=9, par=36, status="open")
        db.add(c)
        courses.append(c)
    db.flush()
    summary["courses"] = len(courses)

    # ── 3) Rooms
    rooms: list[Room] = []
    for building, types in BUILDINGS.items():
        floor, room_num = 1, 1
        for rtype, count in types.items():
            for _ in range(count):
                r = Room(
                    building=building, room_type=rtype,
                    room_number=f"{floor}{room_num:02d}",
                    floor=floor,
                    capacity=4 if rtype == "풀스위트" else 2,
                    base_price=BASE_PRICES[rtype],
                    status="available",
                )
                db.add(r)
                rooms.append(r)
                room_num += 1
            floor += 1
    db.flush()
    summary["rooms"] = len(rooms)

    # ── 4) Packages
    pkgs = [
        Package(
            name="레전드 1박 패키지",
            description="레전드코스 18홀 + 마운틴스테이 풀스위트 1박",
            components=[
                {"type": "golf", "course": "레전드", "holes": 18},
                {"type": "room", "building": "마운틴스테이", "room_type": "풀스위트", "nights": 1},
            ],
            base_price=1500000, target_segment="diamond", is_active=True,
        ),
        Package(
            name="온천 힐링 패키지",
            description="오션코스 9홀 + 설해온천 디럭스 1박 + 온천",
            components=[
                {"type": "golf", "course": "오션", "holes": 9},
                {"type": "room", "building": "설해온천", "room_type": "디럭스", "nights": 1},
            ],
            base_price=980000, target_segment="gold", ai_generated=True,
            acceptance_rate=0.41, is_active=True,
        ),
        Package(
            name="골프텔 평일 특가",
            description="마운틴코스 9홀 + 골프텔 1박",
            components=[
                {"type": "golf", "course": "마운틴", "holes": 9},
                {"type": "room", "building": "골프텔", "room_type": "레귤러", "nights": 1},
            ],
            base_price=420000, target_segment="silver", ai_generated=True,
            acceptance_rate=0.58, is_active=True,
        ),
    ]
    for p in pkgs:
        db.add(p)
    db.flush()
    summary["packages"] = len(pkgs)

    # ── 5) Customers (200명)
    grade_dist = [("diamond", 10), ("gold", 35), ("silver", 65), ("member", 90)]
    customers: list[Customer] = []
    for grade, count in grade_dist:
        for _ in range(count):
            clv = {
                "diamond": random.randint(15_000_000, 45_000_000),
                "gold": random.randint(8_000_000, 18_000_000),
                "silver": random.randint(2_000_000, 9_000_000),
                "member": random.randint(0, 3_000_000),
            }[grade]
            visits = {"diamond": random.randint(12, 40), "gold": random.randint(6, 15),
                      "silver": random.randint(3, 8), "member": random.randint(0, 4)}[grade]
            c = Customer(
                name=fake.name(),
                phone=fake.unique.phone_number(),
                email=fake.email() if random.random() > 0.3 else None,
                grade=grade,
                clv=clv,
                churn_risk=round(random.uniform(0, 0.3 if grade == "diamond" else 0.6), 2),
                total_visits=visits,
                last_visit_at=datetime.now(KST) - timedelta(days=random.randint(1, 90)),
                ai_tags=random.sample(AI_TAGS, k=random.randint(1, 4)),
                preferences={
                    "preferred_course": random.choice(COURSE_NAMES),
                    "preferred_time": random.choice(["morning", "afternoon"]),
                },
            )
            db.add(c)
            customers.append(c)
    db.flush()
    summary["customers"] = len(customers)

    # ── 6) Teetimes (60일 × 3코스 × ~8슬롯 ≈ 1,440건)
    today = date.today()
    teetimes: list[GolfTeetime] = []
    for day_offset in range(-45, 15):
        d = today + timedelta(days=day_offset)
        is_weekend = d.weekday() >= 5
        slots = random.randint(8, 12) if is_weekend else random.randint(5, 8)
        for course in courses:
            for slot_i in range(slots):
                hour = 6 + slot_i // 2
                minute = (slot_i % 2) * 30
                if hour > 17:
                    break
                booked = random.random() < (0.8 if is_weekend else 0.55)
                cust = random.choice(customers) if booked else None
                if d < today:
                    status = "completed" if random.random() > 0.08 else "noshow"
                    if not booked:
                        status = "available"
                else:
                    status = "reserved" if booked else "available"
                tt = GolfTeetime(
                    course_id=course.id, tee_date=d, tee_time=time(hour, minute),
                    status=status,
                    customer_id=cust.id if cust else None,
                    party_size=random.choice([2, 3, 4, 4, 4]),
                    caddy_id=random.choice(caddies).id if booked and random.random() > 0.3 else None,
                    noshow_score=round(random.uniform(0, 0.5), 2) if booked else 0,
                    booked_at=datetime.now(KST) - timedelta(days=random.randint(1, 20)) if booked else None,
                )
                db.add(tt)
                teetimes.append(tt)
    db.flush()
    summary["teetimes"] = len(teetimes)

    # ── 7) Room reservations (60일 × ~6건 ≈ 360)
    reservations: list[RoomReservation] = []
    for day_offset in range(-45, 15):
        d = today + timedelta(days=day_offset)
        is_weekend = d.weekday() >= 4
        bookings = random.randint(4, 8) if is_weekend else random.randint(2, 5)
        rooms_copy = list(rooms)
        random.shuffle(rooms_copy)
        for room in rooms_copy[:bookings]:
            cust = random.choice(customers)
            nights = random.choice([1, 1, 2, 2, 3])
            status = "checked_out" if d + timedelta(days=nights) < today else "confirmed"
            r = RoomReservation(
                room_id=room.id, customer_id=cust.id,
                check_in=d, check_out=d + timedelta(days=nights),
                status=status,
                total_price=int(room.base_price) * nights,
            )
            db.add(r)
            reservations.append(r)
    db.flush()
    summary["reservations"] = len(reservations)

    # ── 8) Daily stats (90일)
    stats: list[DailyStat] = []
    for day_offset in range(-60, 30):
        d = today + timedelta(days=day_offset)
        is_weekend = d.weekday() >= 5
        multiplier = 1.4 if is_weekend else 1.0
        golf_rev = int(random.uniform(4_000_000, 12_000_000) * multiplier)
        room_rev = int(random.uniform(3_000_000, 10_000_000) * multiplier)
        fnb_rev = int(random.uniform(800_000, 3_000_000) * multiplier)
        oncheon_rev = int(random.uniform(500_000, 2_000_000) * multiplier)
        s = DailyStat(
            stat_date=d,
            golf_revenue=golf_rev, room_revenue=room_rev,
            fnb_revenue=fnb_rev, oncheon_revenue=oncheon_rev,
            total_revenue=golf_rev + room_rev + fnb_rev + oncheon_rev,
            golf_rounds=random.randint(15, 40) if is_weekend else random.randint(8, 22),
            room_occupancy_rate=round(random.uniform(0.5, 0.95), 2),
            avg_party_size=round(random.uniform(3.2, 4.0), 1),
            noshow_count=random.randint(0, 3),
            new_customers=random.randint(0, 5),
            returning_customers=random.randint(5, 20),
        )
        db.add(s)
        stats.append(s)
    db.flush()
    summary["daily_stats"] = len(stats)

    # ── 9) AI action logs (200건)
    action_types = ["noshow_alert", "upsell", "churn_prevention", "package_recommend", "pricing", "briefing"]
    reasons = [
        "노쇼 확률 0.45 초과",
        "45일 이상 미방문 VIP",
        "레전드코스 패키지 추천",
        "풀스위트 업그레이드 제안",
        "동적가격 적용 — 주말 +15%",
        "일일 브리핑 생성",
    ]
    for _ in range(200):
        log = AiActionLog(
            action_type=random.choice(action_types),
            target_customer_id=random.choice(customers).id if random.random() > 0.2 else None,
            payload={"reason": random.choice(reasons)},
            status=random.choice(["pending", "approved", "executed", "dismissed"]),
            created_by="ai_engine",
            created_at=datetime.now(KST) - timedelta(hours=random.randint(1, 480)),
        )
        db.add(log)
    db.flush()
    summary["ai_logs"] = 200

    db.commit()
    return summary
