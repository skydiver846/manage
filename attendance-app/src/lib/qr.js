const PREFIX = "attn";

export function encodeQrPayload(courseId, periodId) {
  return `${PREFIX}:${courseId}:${periodId}`;
}

export function decodeQrPayload(text) {
  const parts = String(text).split(":");
  if (parts.length !== 3 || parts[0] !== PREFIX) return null;
  const [, courseId, periodId] = parts;
  return { courseId, periodId };
}
