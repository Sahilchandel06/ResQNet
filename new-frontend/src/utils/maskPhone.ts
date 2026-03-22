export const maskPhoneInLabel = (value: string) =>
  value.replace(/\(([^)]+)\)/g, (match, inner: string) => {
    const digits = inner.replace(/\D/g, '');

    if (digits.length < 7) {
      return match;
    }

    const visibleStart = inner.trim().startsWith('+')
      ? `+${digits.slice(0, 2)}`
      : digits.slice(0, 2);
    const visibleEnd = digits.slice(-4);
    const shownDigits =
      (visibleStart.startsWith('+') ? visibleStart.length - 1 : visibleStart.length) +
      visibleEnd.length;
    const hidden = '*'.repeat(Math.max(digits.length - shownDigits, 3));

    return `(${visibleStart}${hidden}${visibleEnd})`;
  });
