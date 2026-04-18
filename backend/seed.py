"""
시드 데이터 생성 스크립트
실행: python seed.py
PostgreSQL이 실행 중이어야 합니다.
"""

import random
import uuid
from datetime import date, datetime, time, timedelta, timezone

from faker import Faker
from sqlalchemy.orm import Session

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models import (
    AiActionLog,
    Customer,
    DailyStat,
    GolfCourse,
    GolfTeetime,
    Package,
    Room,
    RoomReservation,
    Staff,
)

fake = Faker("ko_KR")
random.seed(42)

KST = timezone(timedelta(hours=9))

# ──────────────────────────── Helpers ────────────────────────────

AI_TAGS_POOL = [
    "#레전드코스_선호", "#오션코스_선호", "#마운틴코스_선호",
    "#주말방문", "#평일방문", "#오전선호", "#오후선호",
    "#풀스위트_선호", "#온천_애용", "#F&B_고소비",
    "#프로모션_반응", "#캐디_지정", "#단체골프",
    "#가족동반", "#기업고객", "#장기투숙",
    "#VIP레벨업후보", "#재방문율_높음", "#생일이벤트_참여",
    "#와인_애호가", "#골프레슨_관심", "#스파_단골",
    "#조용한객실_선호", "#전망좋은객실_선호", "#얼리체크인_요청",
    "#레이트체크아웃_요청", "#유아동반", "#반려동물_동반",
]

COURSE_NAMES = ["마운틴", "오션", "레전드"]
BUILDINGS = {
    "마운틴스테이": {"풀스위트": 3, "스파스위트": 4, "디럭스": 5},
    "설해온천": {"레귤러": 12, "디럭스": 8},
    "골프텔": {"레귤러": 10},
}
BASE_PRICES = {"풀스위트": 850000, "스파스위트": 650000, "디럭스": 450000, "레귤러": 280000}

ROOM_AMENITIES = {
    "풀스위트": ["프라이빗풀", "자쿠지", "발코니", "킹사이즈침대", "에스프레소머신", "미니바", "스마트TV", "오션뷰"],
    "스파스위트": ["전용스파", "온천탕", "발코니", "킹사이즈침대", "미니바", "스마트TV"],
    "디럭스": ["발코니", "퀸사이즈침대", "미니바", "스마트TV", "커피머신"],
    "레귤러": ["퀸사이즈침대", "스마트TV", "커피포트", "냉장고"],
}

ACTION_TYPES = ["noshow_alert", "upsell", "churn_prevention", "package_recommend", "pricing", "briefing"]
ACTION_STATUSES = ["pending", "approved", "executed", "dismissed"]

AI_MEMO_SAMPLES = [
    ("레전드코스 선호, 오전 이른 시간대 요청", "preference"),
    ("특별한 날 방문, 서프라이즈 케이크 준비 완료", "event"),
    ("캐디 박준형 지정 요청", "preference"),
    ("온천 이용 후 만족도 높음", "feedback"),
    ("단체 라운딩 10명 예정, 프로샵 사전 주문", "event"),
    ("풀스위트 업그레이드 만족, 다음 방문 시 동일 객실 희망", "preference"),
    ("F&B 와인 페어링 프로그램 예약", "event"),
    ("레이트 체크아웃 요청, 허용됨", "feedback"),
    ("가족 생일 이벤트 — 케이크 및 꽃 준비", "event"),
    ("조용한 층 객실 선호, 엘리베이터 인접 회피", "preference"),
    ("스파 마사지 90분 코스 재이용", "feedback"),
    ("기업 워크숍 15명, 컨퍼런스룸 포함 패키지 문의", "event"),
    ("골프 레슨 PGA 프로 세션 관심 표명", "preference"),
    ("주차장 EV 충전 가능 여부 문의", "feedback"),
    ("아동 동반 — 키즈클럽 사전 예약", "preference"),
    ("기념일(결혼) 룸 데코 요청 — 다음달 예정", "event"),
    ("채식 메뉴 만족, 다음 방문에도 동일 요청", "feedback"),
    ("프라이빗 라운딩 희망, 3팀 패키지 문의", "preference"),
    ("지인 소개로 첫 방문, 온보딩 세션 필요", "feedback"),
    ("멤버십 등급 상향 상담 요청", "event"),
    ("사우나 이용 중 온도 컴플레인 — 후속 케어 완료", "feedback"),
    ("연말 송년회 단체 20명 문의", "event"),
]

SPECIAL_REQUESTS_POOL = [
    "얼리 체크인 요청 (오후 1시)",
    "레이트 체크아웃 요청 (오후 2시)",
    "조용한 층 배정 부탁드립니다",
    "기념일 세팅 준비 (샴페인 + 꽃)",
    "유아용 침대 추가 요청",
    "알러지 (갑각류) — F&B 주의",
    "반려견 동반, 전용 매트 요청",
    "공항 픽업 서비스 예약",
    "휠체어 접근 가능 객실 요청",
    "EV 충전기 근접 주차 요청",
    "객실 미니바 비알콜 음료 비치",
    "베개 교체 요청 (메모리폼)",
    "채식(비건) 조식 개별 준비",
    "단체 3객실 인접 배정 요청",
    None, None, None, None, None, None,  # 대부분은 요청사항 없음
]

TEETIME_NOTES_POOL = [
    "VIP 고객 — 클럽하우스 환영 안내",
    "단체 예약 — 프로샵 사전 준비 완료",
    "기업 행사 라운딩",
    "신혼 여행 첫 라운딩",
    "어머니 생신 기념 가족 라운딩",
    "해외 VIP — 통역 캐디 배정 요청",
    "프로암 대회 연계 라운딩",
    "장마철 우천 대비 — 우산/타올 추가",
    "셀러브리티 고객 — 프라이버시 모드",
    "신규 회원 첫 라운딩 — 온보딩 가이드",
    None, None, None, None, None, None, None, None,
]


def create_staff(db: Session) -> list[Staff]:
    staff_data = [
        ("한승수", "admin", "management", "admin@seolhaeone.kr"),
        ("김소연", "manager", "golf", "soyon@seolhaeone.kr"),
        ("박준형", "front_desk", "resort", "jun@seolhaeone.kr"),
        ("이하나", "manager", "fnb", "hana@seolhaeone.kr"),
        ("최민주", "manager", "spa", "minju@seolhaeone.kr"),
        ("정우성", "front_desk", "resort", "woosung@seolhaeone.kr"),
        ("윤세영", "staff", "fnb", "seyoung@seolhaeone.kr"),
        ("강태준", "staff", "golf", "taejun@seolhaeone.kr"),
        ("서지혜", "manager", "marketing", "jihye@seolhaeone.kr"),
        ("오현우", "staff", "housekeeping", "hyunwoo@seolhaeone.kr"),
        ("임나래", "staff", "housekeeping", "narae@seolhaeone.kr"),
        ("조성민", "staff", "maintenance", "sungmin@seolhaeone.kr"),
    ]
    caddies = [(f"캐디_{i+1:02d}", "caddy", "golf", None) for i in range(40)]
    all_data = staff_data + caddies
    staff = []
    for name, role, dept, email in all_data:
        s = Staff(
            name=name, role=role, department=dept, email=email,
            phone=fake.phone_number(),
            hashed_password=hash_password("seolhae1234") if email else None,
        )
        staff.append(s)
    db.add_all(staff)
    db.flush()
    return staff


def create_courses(db: Session) -> list[GolfCourse]:
    courses = []
    for name in COURSE_NAMES:
        c = GolfCourse(name=name, holes=9, par=36, status="open")
        courses.append(c)
    db.add_all(courses)
    db.flush()
    return courses


def create_rooms(db: Session) -> list[Room]:
    rooms = []
    for building, types in BUILDINGS.items():
        floor = 1
        room_num = 1
        for rtype, count in types.items():
            for _ in range(count):
                r = Room(
                    building=building,
                    room_type=rtype,
                    room_number=f"{floor}{room_num:02d}",
                    floor=floor,
                    capacity=4 if rtype == "풀스위트" else 2,
                    base_price=BASE_PRICES[rtype],
                    amenities=ROOM_AMENITIES.get(rtype, []),
                    status="available",
                )
                rooms.append(r)
                room_num += 1
            floor += 1
    db.add_all(rooms)
    db.flush()
    return rooms


def create_packages(db: Session, courses: list[GolfCourse]) -> list[Package]:
    pkgs = [
        Package(
            name="레전드 1박 패키지",
            description="레전드코스 18홀 + 마운틴스테이 풀스위트 1박",
            components=[
                {"type": "golf", "course": "레전드", "holes": 18},
                {"type": "room", "building": "마운틴스테이", "room_type": "풀스위트", "nights": 1},
            ],
            base_price=1500000,
            ai_generated=False,
            target_segment="diamond",
            is_active=True,
        ),
        Package(
            name="온천 힐링 패키지",
            description="오션코스 9홀 + 설해온천 1박 + 온천 이용",
            components=[
                {"type": "golf", "course": "오션", "holes": 9},
                {"type": "room", "building": "설해온천", "room_type": "디럭스", "nights": 1},
                {"type": "oncheon", "duration": 120},
            ],
            base_price=980000,
            ai_generated=True,
            acceptance_rate=0.41,
            target_segment="gold",
            is_active=True,
        ),
        Package(
            name="골프텔 평일 특가",
            description="마운틴코스 9홀 + 골프텔 1박",
            components=[
                {"type": "golf", "course": "마운틴", "holes": 9},
                {"type": "room", "building": "골프텔", "room_type": "레귤러", "nights": 1},
            ],
            base_price=420000,
            ai_generated=True,
            acceptance_rate=0.58,
            target_segment="silver",
            is_active=True,
        ),
        Package(
            name="VIP 2박 프리미엄",
            description="레전드 18홀 + 오션 9홀 + 풀스위트 2박 + F&B 크레딧",
            components=[
                {"type": "golf", "course": "레전드", "holes": 18},
                {"type": "golf", "course": "오션", "holes": 9},
                {"type": "room", "building": "마운틴스테이", "room_type": "풀스위트", "nights": 2},
                {"type": "fnb", "credit": 500000},
            ],
            base_price=3200000,
            ai_generated=False,
            target_segment="diamond",
            is_active=True,
        ),
        Package(
            name="패밀리 힐링 패키지",
            description="마운틴 9홀 + 스파스위트 2박 + 키즈 프로그램",
            components=[
                {"type": "golf", "course": "마운틴", "holes": 9},
                {"type": "room", "building": "마운틴스테이", "room_type": "스파스위트", "nights": 2},
                {"type": "kids_program", "duration": 240},
            ],
            base_price=1850000,
            ai_generated=True,
            acceptance_rate=0.47,
            target_segment="gold",
            is_active=True,
        ),
        Package(
            name="기업 워크숍 패키지",
            description="단체 라운딩 + 컨퍼런스룸 + 디럭스 4박",
            components=[
                {"type": "golf", "course": "오션", "holes": 18, "group_size": 10},
                {"type": "room", "building": "설해온천", "room_type": "디럭스", "nights": 4},
                {"type": "conference", "duration": 480},
            ],
            base_price=8500000,
            ai_generated=False,
            target_segment="corporate",
            is_active=True,
        ),
        Package(
            name="허니문 로맨틱 패키지",
            description="오션 9홀 + 풀스위트 2박 + 커플 스파 + 디너",
            components=[
                {"type": "golf", "course": "오션", "holes": 9},
                {"type": "room", "building": "마운틴스테이", "room_type": "풀스위트", "nights": 2},
                {"type": "spa", "duration": 90},
                {"type": "dinner", "course": "tasting"},
            ],
            base_price=2400000,
            ai_generated=True,
            acceptance_rate=0.52,
            target_segment="gold",
            is_active=True,
        ),
        Package(
            name="얼리버드 새벽 라운딩",
            description="오전 6시 티오프 마운틴 9홀 + 조식 + 레귤러 1박",
            components=[
                {"type": "golf", "course": "마운틴", "holes": 9, "early_bird": True},
                {"type": "room", "building": "골프텔", "room_type": "레귤러", "nights": 1},
                {"type": "breakfast", "style": "한식"},
            ],
            base_price=480000,
            ai_generated=True,
            acceptance_rate=0.39,
            target_segment="silver",
            is_active=True,
        ),
        Package(
            name="미식가를 위한 미각 투어",
            description="설해온천 디럭스 1박 + 테이스팅 디너 + 와인페어링",
            components=[
                {"type": "room", "building": "설해온천", "room_type": "디럭스", "nights": 1},
                {"type": "dinner", "course": "tasting_7", "wine_pairing": True},
            ],
            base_price=980000,
            ai_generated=True,
            acceptance_rate=0.44,
            target_segment="gold",
            is_active=True,
        ),
        Package(
            name="동계 단기 특가",
            description="마운틴 9홀 + 레귤러 1박 (12~2월 한정)",
            components=[
                {"type": "golf", "course": "마운틴", "holes": 9},
                {"type": "room", "building": "골프텔", "room_type": "레귤러", "nights": 1},
            ],
            base_price=350000,
            ai_generated=True,
            acceptance_rate=0.63,
            target_segment="member",
            is_active=False,
        ),
    ]
    db.add_all(pkgs)
    db.flush()
    return pkgs


def create_customers(db: Session) -> list[Customer]:
    grade_dist = [("diamond", 80), ("gold", 220), ("silver", 450), ("member", 750)]
    customers = []
    for grade, count in grade_dist:
        for _ in range(count):
            visits = {
                "diamond": random.randint(12, 50),
                "gold": random.randint(6, 15),
                "silver": random.randint(3, 8),
                "member": random.randint(0, 4),
            }[grade]
            clv = {
                "diamond": random.randint(15_000_000, 45_000_000),
                "gold": random.randint(8_000_000, 18_000_000),
                "silver": random.randint(2_000_000, 9_000_000),
                "member": random.randint(0, 3_000_000),
            }[grade]
            churn = round(random.uniform(0, 0.3 if grade == "diamond" else 0.5 if grade == "gold" else 0.8), 2)
            tags = random.sample(AI_TAGS_POOL, k=random.randint(2, 6))
            last_visit_days = random.randint(1, 300)

            memo_count = random.randint(1, 4)
            memos = []
            for _ in range(memo_count):
                content, category = random.choice(AI_MEMO_SAMPLES)
                memos.append({
                    "date": str(date.today() - timedelta(days=random.randint(1, 180))),
                    "content": content,
                    "category": category,
                })

            c = Customer(
                name=fake.name(),
                phone=fake.unique.phone_number(),
                email=fake.email() if random.random() > 0.3 else None,
                grade=grade,
                clv=clv,
                churn_risk=churn,
                total_visits=visits,
                last_visit_at=datetime.now(KST) - timedelta(days=last_visit_days),
                ai_tags=tags,
                ai_memo=memos,
                preferences={
                    "preferred_course": random.choice(COURSE_NAMES),
                    "preferred_time": random.choice(["morning", "afternoon"]),
                    "preferred_building": random.choice(list(BUILDINGS.keys())),
                    "dietary": random.choice([None, "vegetarian", "halal", "gluten_free"]),
                    "wants_caddy": random.random() > 0.4,
                },
            )
            customers.append(c)
    db.add_all(customers)
    db.flush()
    return customers


def create_teetimes(
    db: Session, courses: list[GolfCourse], customers: list[Customer],
    caddies: list[Staff], packages: list[Package],
):
    """18개월분 골프 예약 ~20,000건"""
    today = date.today()
    start = today - timedelta(days=540)
    teetimes = []

    for day_offset in range(540):
        d = start + timedelta(days=day_offset)
        is_weekend = d.weekday() >= 5
        slots_per_course = random.randint(14, 20) if is_weekend else random.randint(8, 15)

        for course in courses:
            for slot_i in range(slots_per_course):
                hour = 6 + slot_i // 2
                minute = (slot_i % 2) * 30
                if hour > 17:
                    break

                booked = random.random() < (0.88 if is_weekend else 0.65)
                cust = random.choice(customers) if booked else None
                status = random.choice(["completed", "noshow"]) if d < today else "reserved"
                if not booked:
                    status = "available"
                if status == "noshow" and random.random() > 0.08:
                    status = "completed"

                noshow_score = round(random.uniform(0, 0.6), 2) if booked else 0
                ai_rec = None
                if booked and random.random() < 0.25:
                    ai_rec = {
                        "recommendation": random.choice([
                            "캐디 지정 제안",
                            "라운딩 후 F&B 패키지 업셀",
                            "레이트 체크아웃 번들 제안",
                            "클럽 렌탈 사전 확인 필요",
                        ]),
                        "confidence": round(random.uniform(0.6, 0.95), 2),
                    }

                tt = GolfTeetime(
                    course_id=course.id,
                    tee_date=d,
                    tee_time=time(hour, minute),
                    status=status,
                    customer_id=cust.id if cust else None,
                    party_size=random.choice([2, 3, 4, 4, 4]),
                    caddy_id=random.choice(caddies).id if booked and random.random() > 0.3 else None,
                    noshow_score=noshow_score,
                    package_id=random.choice(packages).id if booked and random.random() < 0.15 else None,
                    ai_recommendation=ai_rec,
                    notes=random.choice(TEETIME_NOTES_POOL) if booked else None,
                    booked_at=datetime.now(KST) - timedelta(days=random.randint(1, 30)) if booked else None,
                )
                teetimes.append(tt)

    db.add_all(teetimes)
    db.flush()
    print(f"  Golf teetimes: {len(teetimes)}")
    return teetimes


def create_room_reservations(
    db: Session, rooms: list[Room], customers: list[Customer], packages: list[Package],
):
    """18개월분 객실 예약 ~4,700건"""
    today = date.today()
    start = today - timedelta(days=540)
    reservations = []

    for day_offset in range(0, 540, 1):
        d = start + timedelta(days=day_offset)
        is_weekend = d.weekday() >= 4  # Fri~Sun
        bookings_today = random.randint(8, 16) if is_weekend else random.randint(3, 9)

        available_rooms = list(rooms)
        random.shuffle(available_rooms)

        for room in available_rooms[:bookings_today]:
            cust = random.choice(customers)
            nights = random.choice([1, 1, 1, 2, 2, 3])
            status = "checked_out" if d + timedelta(days=nights) < today else "confirmed"

            upsell = None
            if random.random() < 0.25:
                upsell = {
                    "offered": random.choice([
                        "객실 업그레이드 (디럭스 → 스파스위트)",
                        "조식 뷔페 추가",
                        "스파 90분 패키지",
                        "레이트 체크아웃",
                    ]),
                    "accepted": random.random() < 0.4,
                    "amount": random.choice([50000, 80000, 150000, 250000]),
                }

            r = RoomReservation(
                room_id=room.id,
                customer_id=cust.id,
                check_in=d,
                check_out=d + timedelta(days=nights),
                status=status,
                total_price=int(room.base_price) * nights,
                dynamic_price_applied=random.random() < 0.2,
                package_id=random.choice(packages).id if random.random() < 0.12 else None,
                upsell_offered=upsell,
                special_requests=random.choice(SPECIAL_REQUESTS_POOL),
            )
            reservations.append(r)

    db.add_all(reservations)
    db.flush()
    print(f"  Room reservations: {len(reservations)}")
    return reservations


def create_daily_stats(db: Session):
    """540일분 일별 매출 통계 (18개월, YoY 비교 가능)"""
    today = date.today()
    start = today - timedelta(days=540)
    stats = []

    for day_offset in range(540):
        d = start + timedelta(days=day_offset)
        is_weekend = d.weekday() >= 5
        month = d.month
        # 계절성 반영: 봄(4~5월)·가을(9~10월) 성수기, 여름 중반(7~8월) 및 겨울(12~2월) 비수기
        season = 1.25 if month in (4, 5, 9, 10) else 0.75 if month in (12, 1, 2) else 1.0
        multiplier = (1.4 if is_weekend else 1.0) * season

        golf_rev = int(random.uniform(4_000_000, 12_000_000) * multiplier)
        room_rev = int(random.uniform(3_000_000, 10_000_000) * multiplier)
        fnb_rev = int(random.uniform(800_000, 3_000_000) * multiplier)
        oncheon_rev = int(random.uniform(500_000, 2_000_000) * multiplier)

        forecast = None
        if d >= today - timedelta(days=14):
            forecast = {
                "predicted_revenue": int((golf_rev + room_rev + fnb_rev + oncheon_rev) * random.uniform(0.95, 1.1)),
                "confidence": round(random.uniform(0.7, 0.92), 2),
                "model_version": "v1.3.2",
                "factors": random.sample(
                    ["주말효과", "프로모션", "날씨", "단체예약", "시즌성"],
                    k=random.randint(1, 3),
                ),
            }

        s = DailyStat(
            stat_date=d,
            golf_revenue=golf_rev,
            room_revenue=room_rev,
            fnb_revenue=fnb_rev,
            oncheon_revenue=oncheon_rev,
            total_revenue=golf_rev + room_rev + fnb_rev + oncheon_rev,
            golf_rounds=random.randint(15, 45) if is_weekend else random.randint(8, 25),
            room_occupancy_rate=round(random.uniform(0.65, 0.95) if is_weekend else random.uniform(0.4, 0.75), 2),
            avg_party_size=round(random.uniform(3.2, 4.0), 1),
            noshow_count=random.randint(0, 3),
            new_customers=random.randint(0, 5),
            returning_customers=random.randint(5, 25),
            ai_forecast=forecast,
        )
        stats.append(s)

    db.add_all(stats)
    db.flush()
    print(f"  Daily stats: {len(stats)}")


def create_ai_action_logs(db: Session, customers: list[Customer]):
    """AI 액션 로그 4,000건"""
    logs = []
    for _ in range(4000):
        action_type = random.choice(ACTION_TYPES)
        status = random.choice(ACTION_STATUSES)
        result = None
        if status == "executed":
            result = {
                "outcome": random.choice(["success", "partial", "no_response"]),
                "impact_value": random.randint(50_000, 3_000_000),
                "executed_at": (datetime.now(KST) - timedelta(hours=random.randint(1, 240))).isoformat(),
            }

        log = AiActionLog(
            action_type=action_type,
            target_customer_id=random.choice(customers).id if random.random() > 0.2 else None,
            payload={
                "reason": random.choice([
                    "노쇼 확률 0.45 초과",
                    "45일 이상 미방문 VIP",
                    "레전드코스 패키지 추천",
                    "풀스위트 업그레이드 제안",
                    "동적가격 적용 — 주말 +15%",
                    "일일 브리핑 생성",
                    "생일 이벤트 쿠폰 발송",
                    "골프 세션 후 F&B 업셀",
                    "유사 고객군 패턴 기반 추천",
                    "경쟁 리조트 대비 가격 조정",
                ]),
                "confidence": round(random.uniform(0.55, 0.95), 2),
                "source_model": random.choice(["churn_v2", "upsell_v3", "pricing_v1", "forecast_v2"]),
            },
            status=status,
            result=result,
            created_by="ai_engine",
            created_at=datetime.now(KST) - timedelta(hours=random.randint(1, 12960)),
        )
        logs.append(log)
    db.add_all(logs)
    db.flush()
    print(f"  AI action logs: {len(logs)}")


def main():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding data...")
        staff = create_staff(db)
        caddies = [s for s in staff if s.role == "caddy"]
        print(f"  Staff: {len(staff)} (caddies: {len(caddies)})")

        courses = create_courses(db)
        print(f"  Courses: {len(courses)}")

        rooms = create_rooms(db)
        print(f"  Rooms: {len(rooms)}")

        packages = create_packages(db, courses)
        print(f"  Packages: {len(packages)}")

        customers = create_customers(db)
        print(f"  Customers: {len(customers)}")

        create_teetimes(db, courses, customers, caddies, packages)
        create_room_reservations(db, rooms, customers, packages)
        create_daily_stats(db)
        create_ai_action_logs(db, customers)

        db.commit()
        print("\nSeed complete!")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
