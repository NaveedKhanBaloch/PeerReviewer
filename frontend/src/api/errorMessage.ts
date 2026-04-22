export function toErrorMessage(value: unknown, fallback = 'Something went wrong.'): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => toErrorMessage(item, '')).filter(Boolean).join(' ') || fallback;
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.detail === 'string') return record.detail;
    if (record.detail) return toErrorMessage(record.detail, fallback);
    if (typeof record.msg === 'string') {
      const location = Array.isArray(record.loc) ? record.loc.join('.') : '';
      return location ? `${location}: ${record.msg}` : record.msg;
    }
    if (typeof record.message === 'string') return record.message;
  }
  return fallback;
}
