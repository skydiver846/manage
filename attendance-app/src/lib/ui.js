// 상태값 → 한글 라벨 매핑. 실제 시각적 스타일은 components/ui/Pill.jsx가 담당한다.

export const STATUS_LABEL = {
  present: "출석",
  pending: "신청(대기)",
  late: "지각",
  earlyLeave: "조퇴",
  absent: "결석",
  excused: "공가/기타",
};

export const CORRECTION_STATUS_LABEL = {
  pending: "검토 중",
  approved: "승인",
  rejected: "반려",
};

export const REPORT_STATUS_LABEL = {
  submitted: "상신 대기",
  reviewing: "결재중",
  approved: "승인",
  rejected: "반려",
};
