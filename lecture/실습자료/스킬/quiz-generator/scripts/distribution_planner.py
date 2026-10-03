#!/usr/bin/env python3
"""
distribution_planner.py — 소방시설 교육용 문제출제 스킬의 출제 계획 계산기.

총 문항 수와 유형/난이도/분야 비율을 주면, 각 축의 정확한 문항 수(합계가
총 문항 수와 딱 맞도록 최대잉여법으로 반올림)와, 문항 하나하나에 배정할
(분야, 난이도, 유형) 조합표를 만들어준다. 사람이 손으로 나누면 반올림
오차나 조합 누락이 생기기 쉬운데, 이 스크립트가 그 계산을 대신한다.

사용 예:
    python distribution_planner.py --total 20 \\
        --difficulty "상:20,중:50,하:30" \\
        --domain "소화설비:60,경보설비:25,피난설비:15" \\
        --type "객관식:100"

    # 분야 비율을 모르고 강의안 분량만 잰 경우 (예: 슬라이드 장수)
    python distribution_planner.py --total 15 \\
        --difficulty "상:20,중:50,하:30" \\
        --domain "소화설비:9,경보설비:4,피난설비:2" \\
        --type "객관식:80,OX:20"

인자를 생략하면 SKILL.md에 정리된 기본값(난이도 상20/중50/하30, 유형
객관식100)을 쓴다. 분야 비율은 강의안마다 다르므로 기본값이 없고,
반드시 --domain으로 지정해야 한다 (강의안 내용 비중을 가늠해서 넣는다).
"""

import argparse
import json
import random
import sys
from collections import Counter


def parse_ratio(spec):
    """'상:20,중:50,하:30' 형태의 문자열을 {'상': 20.0, ...} 딕셔너리로 변환."""
    result = {}
    for part in spec.split(","):
        part = part.strip()
        if not part:
            continue
        if ":" not in part:
            raise ValueError(f"'{part}' — 'label:비율' 형태로 입력해야 합니다.")
        label, value = part.rsplit(":", 1)
        label = label.strip()
        try:
            result[label] = float(value.strip())
        except ValueError:
            raise ValueError(f"'{part}'의 비율 값 '{value}'을 숫자로 읽을 수 없습니다.")
    if not result:
        raise ValueError("비율 항목이 비어 있습니다.")
    return result


def largest_remainder_allocation(total, ratios):
    """
    비율(합이 100이 아니어도 됨, 내부에서 정규화)을 정수 개수로 배분한다.
    합계가 total과 정확히 일치하도록 최대잉여법(Hare quota)을 쓴다.
    """
    labels = list(ratios.keys())
    weight_sum = sum(ratios.values())
    if weight_sum <= 0:
        raise ValueError("비율의 합이 0보다 커야 합니다.")

    quotas = {label: (ratios[label] / weight_sum) * total for label in labels}
    base = {label: int(quotas[label]) for label in labels}
    remainder = total - sum(base.values())

    # 소수부가 큰 항목부터 1씩 더 배정
    fractional_order = sorted(labels, key=lambda l: quotas[l] - base[l], reverse=True)
    for label in fractional_order[:remainder]:
        base[label] += 1

    return base


def build_item_plan(total, difficulty_counts, domain_counts, type_counts, seed=42):
    """
    각 축의 개수 배정을 받아 문항 하나하나에 배정할 (분야, 난이도, 유형)
    조합 리스트를 만든다. 각 축의 합계는 정확히 total과 일치하도록 이미
    보장되어 있으므로, 여기서는 각 축을 개별적으로 셔플한 뒤 나열만 맞춘다.
    완전한 균등 교차배치는 아니지만, 각 축의 전체 개수는 정확히 지켜진다.
    """
    def expand(counts):
        items = []
        for label, n in counts.items():
            items.extend([label] * n)
        return items

    domains = expand(domain_counts)
    difficulties = expand(difficulty_counts)
    types = expand(type_counts)

    rng = random.Random(seed)
    rng.shuffle(domains)
    rng.shuffle(difficulties)
    rng.shuffle(types)

    plan = []
    for i in range(total):
        plan.append({
            "번호": i + 1,
            "분야": domains[i],
            "난이도": difficulties[i],
            "유형": types[i],
        })
    return plan


def print_table(title, counts, total):
    print(f"\n[{title}] (총 {total}문항)")
    for label, n in counts.items():
        pct = (n / total * 100) if total else 0
        print(f"  - {label}: {n}문항 ({pct:.1f}%)")


def main():
    parser = argparse.ArgumentParser(
        description="소방시설 교육용 문제출제 계획 계산기",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--total", type=int, required=True, help="총 문항 수")
    parser.add_argument(
        "--difficulty",
        default="상:20,중:50,하:30",
        help="난이도 비율. 기본값: 상:20,중:50,하:30",
    )
    parser.add_argument(
        "--domain",
        required=True,
        help="분야별 비율 (예: 소화설비:60,경보설비:25,피난설비:15). "
        "강의안 내용 비중에 맞춰 직접 가늠해서 입력한다.",
    )
    parser.add_argument(
        "--type",
        default="객관식:100",
        help="문항 유형 비율. 기본값: 객관식:100",
    )
    parser.add_argument(
        "--json", action="store_true", help="결과를 JSON으로도 출력한다."
    )
    args = parser.parse_args()

    if args.total <= 0:
        print("오류: --total 은 1 이상이어야 합니다.", file=sys.stderr)
        sys.exit(1)

    try:
        difficulty_ratio = parse_ratio(args.difficulty)
        domain_ratio = parse_ratio(args.domain)
        type_ratio = parse_ratio(args.type)
    except ValueError as e:
        print(f"오류: {e}", file=sys.stderr)
        sys.exit(1)

    difficulty_counts = largest_remainder_allocation(args.total, difficulty_ratio)
    domain_counts = largest_remainder_allocation(args.total, domain_ratio)
    type_counts = largest_remainder_allocation(args.total, type_ratio)

    print_table("난이도 배분", difficulty_counts, args.total)
    print_table("분야 배분", domain_counts, args.total)
    print_table("유형 배분", type_counts, args.total)

    plan = build_item_plan(args.total, difficulty_counts, domain_counts, type_counts)

    print(f"\n[문항별 배정표] (총 {args.total}문항)")
    print(f"  {'번호':>4} | {'분야':<10} | {'난이도':<4} | {'유형':<6}")
    for row in plan:
        print(f"  {row['번호']:>4} | {row['분야']:<10} | {row['난이도']:<4} | {row['유형']:<6}")

    # 검증: 각 축의 합계가 총 문항 수와 일치하는지 확인
    assert sum(difficulty_counts.values()) == args.total
    assert sum(domain_counts.values()) == args.total
    assert sum(type_counts.values()) == args.total

    if args.json:
        output = {
            "total": args.total,
            "difficulty_counts": difficulty_counts,
            "domain_counts": domain_counts,
            "type_counts": type_counts,
            "item_plan": plan,
        }
        print("\n[JSON]")
        print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
