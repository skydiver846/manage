#!/usr/bin/env python3
"""
make_quiz_cards.py — 중앙소방학교 객관식 문제카드(hwpx)를 문항 수만큼 채워 만든다.

별도의 hwpx 스킬 없이, 표준 라이브러리만으로 동작한다. 양식 파일(reference.hwpx)의
표 구조·글꼴·테두리는 그대로 두고, 문항마다 카드 한 장(한 페이지)을 복제해 칸만 채운다.

사용 예:
    python make_quiz_cards.py --input items.json --output 문제카드.hwpx \\
        --answers 정답지.md

items.json 모양:
{
  "meta": {"과정명": "", "과목명": "", "출제일자": "2026. 10. 3.", "소속": "", "성명": ""},
  "items": [
    {"번호": 1, "난이도": "중", "출제근거": "○○법 제○조",
     "문제": "다음 중 ... 것은?",
     "보기": ["보기1", "보기2", "보기3", "보기4"],
     "정답": 2, "해설": "정답지에만 들어가는 풀이와 근거"}
  ]
}

- meta 값을 비워 두면 해당 칸은 빈 칸으로 남는다(지어서 채우지 않는다).
- 난이도는 "상ㆍ중ㆍ하" 중 해당 값만 【 】로 감싸 표시한다. 예: 상ㆍ【중】ㆍ하
- 해설은 문제카드에 넣지 않고 --answers 로 지정한 정답지(Markdown)에만 넣는다.
- 문자열 안의 줄바꿈(\\n)은 한글 문서의 줄바꿈으로 바뀐다.
"""

import argparse
import json
import os
import re
import sys
import zipfile
from xml.sax.saxutils import escape

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_TEMPLATE = os.path.join(
    HERE, "..", "references", "learned-formats", "central-fire-academy-objective-card", "reference.hwpx")

# (colAddr, rowAddr) → 채울 칸. 양식의 format-notes.md 와 같은 좌표다.
CELL = {
    "과정명": (1, 0), "과목명": (6, 0), "정답": (13, 0),
    "난이도": (1, 1), "출제근거": (11, 1),
    "문번호": (0, 2), "문제": (1, 2),
    "보기1": (1, 3), "보기2": (1, 4), "보기3": (1, 5), "보기4": (1, 6),
    "출제일자": (1, 7), "소속": (7, 7), "성명": (12, 7),
}
SIGN_MARK = "\U000f012b"   # 성명 칸 끝의 (인) 표시 글자 — 원본 양식 그대로 유지
LEVELS = ["상", "중", "하"]


def t_xml(text):
    """일반 문자열 → <hp:t> 내용. 줄바꿈은 <hp:lineBreak/> 로."""
    return "<hp:lineBreak/>".join(escape(line) for line in str(text).split("\n"))


def set_cell_text(block, col, row, text):
    """블록 안에서 (col,row) 칸의 첫 문단 글자를 text 로 바꾼다."""
    addr = f'<hp:cellAddr colAddr="{col}" rowAddr="{row}"/>'
    for m in re.finditer(r"<hp:tc .*?</hp:tc>", block, re.S):
        tc = m.group(0)
        if addr not in tc:
            continue
        p0 = tc.index("<hp:p ")
        p1 = tc.index("</hp:p>", p0)
        para = tc[p0:p1]
        run = re.search(r'<hp:run charPrIDRef="(\d+)"(?:/>|>.*?</hp:run>)', para, re.S)
        if not run:
            raise ValueError(f"칸 ({col},{row})에서 글자 묶음(run)을 찾지 못했습니다")
        new_run = f'<hp:run charPrIDRef="{run.group(1)}"><hp:t>{t_xml(text)}</hp:t></hp:run>'
        para = para[:run.start()] + new_run + para[run.end():]
        new_tc = tc[:p0] + para + tc[p1:]
        return block[:m.start()] + new_tc + block[m.end():]
    raise ValueError(f"양식에 ({col},{row}) 칸이 없습니다")


def level_text(level):
    if level not in LEVELS:
        raise ValueError(f"난이도는 상/중/하 중 하나여야 합니다: {level!r}")
    return "ㆍ".join(f"【{x}】" if x == level else x for x in LEVELS)


def fill_card(block, item, meta, index):
    opts = item.get("보기", [])
    if len(opts) != 4:
        raise ValueError(f"{item.get('번호', index)}번 문항: 보기는 4개여야 합니다 (현재 {len(opts)}개)")
    no = item.get("번호", index)
    values = {
        "과정명": meta.get("과정명", ""), "과목명": meta.get("과목명", ""),
        "정답": str(item.get("정답", "")),
        "난이도": level_text(item.get("난이도", "중")),
        "출제근거": item.get("출제근거", ""),
        "문번호": f"문( {no} )", "문제": item.get("문제", ""),
        "보기1": opts[0], "보기2": opts[1], "보기3": opts[2], "보기4": opts[3],
        "출제일자": meta.get("출제일자") or ".   .   . ",
        "소속": meta.get("소속", ""),
        "성명": f"{meta.get('성명', '')}       {SIGN_MARK}" if meta.get("성명") else f"       {SIGN_MARK}",
    }
    for key, (col, row) in CELL.items():
        block = set_cell_text(block, col, row, values[key])
    return block


def build(template, data):
    with zipfile.ZipFile(template) as z:
        files = {n: z.read(n) for n in z.namelist()}
        order = z.namelist()
    sec = files["Contents/section0.xml"].decode("utf-8")

    # 카드 한 장 = 제목 문단 ~ 표 문단 (머리말·용지 설정이 든 첫 문단은 한 번만 둔다)
    title = sec.index("객<hp:fwSpace/>관")
    start = sec.rfind("<hp:p ", 0, title)
    end = sec.rindex("</hs:sec>")
    card = sec[start:end]
    tbl_id = int(re.search(r'<hp:tbl id="(\d+)"', card).group(1))

    meta, items = data.get("meta", {}), data.get("items", [])
    if not items:
        raise ValueError("items 가 비어 있습니다")
    cards = []
    for i, item in enumerate(items):
        c = fill_card(card, item, meta, i + 1)
        if i > 0:
            c = c.replace('pageBreak="0"', 'pageBreak="1"', 1)          # 문항마다 새 페이지
            c = c.replace(f'<hp:tbl id="{tbl_id}"', f'<hp:tbl id="{tbl_id + i}"', 1)
        cards.append(c)
    files["Contents/section0.xml"] = (sec[:start] + "".join(cards) + sec[end:]).encode("utf-8")

    preview = "■ 중앙소방학교 평가관리규정 [별지 제4호서식]\r\n\r\n객 관 식 문 제카드\r\n"
    for it in items:
        preview += f"문( {it.get('번호', '')} ) {it.get('문제', '')}\r\n"
    if "Preview/PrvText.txt" in files:
        files["Preview/PrvText.txt"] = preview[:1000].encode("utf-8")
    return files, order


def write_hwpx(files, order, out):
    with zipfile.ZipFile(out, "w") as z:
        # mimetype 은 맨 앞에, 압축하지 않고 넣어야 한글이 hwpx로 인식한다
        z.writestr(zipfile.ZipInfo("mimetype"), files["mimetype"], compress_type=zipfile.ZIP_STORED)
        for n in order:
            if n != "mimetype":
                z.writestr(n, files[n], compress_type=zipfile.ZIP_DEFLATED)


def write_answers(data, path):
    meta = data.get("meta", {})
    lines = [f"# 정답지 — {meta.get('과정명') or '(과정명 확인 필요)'} / {meta.get('과목명') or '(과목명 확인 필요)'}", "",
             "| 문항 | 정답 | 난이도 | 출제근거 | 해설 |", "|---|---|---|---|---|"]
    for i, it in enumerate(data["items"], 1):
        cell = lambda v: str(v).replace("|", "\\|").replace("\n", "<br>")
        lines.append(f"| {it.get('번호', i)} | {it.get('정답', '')} | {it.get('난이도', '')} | "
                     f"{cell(it.get('출제근거', ''))} | {cell(it.get('해설', ''))} |")
    missing = [k for k in ("과정명", "과목명", "출제일자", "소속", "성명") if not meta.get(k)]
    if missing:
        lines += ["", f"> 확인 필요: {', '.join(missing)} 칸이 비어 있습니다."]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def main():
    ap = argparse.ArgumentParser(description="객관식 문제카드(hwpx) 만들기")
    ap.add_argument("--input", required=True, help="문항 JSON 파일")
    ap.add_argument("--output", required=True, help="만들 hwpx 파일 경로")
    ap.add_argument("--template", default=DEFAULT_TEMPLATE, help="문제카드 양식 hwpx")
    ap.add_argument("--answers", help="정답지(Markdown) 저장 경로 (해설 포함)")
    args = ap.parse_args()
    with open(args.input, encoding="utf-8") as f:
        data = json.load(f)
    try:
        files, order = build(args.template, data)
    except ValueError as e:
        sys.exit(f"오류: {e}")
    write_hwpx(files, order, args.output)
    if args.answers:
        write_answers(data, args.answers)
    print(f"문제카드 {len(data['items'])}장 → {args.output}" + (f", 정답지 → {args.answers}" if args.answers else ""))


if __name__ == "__main__":
    main()
