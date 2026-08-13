export function parseDate(value) {
  return new Date(`${value.length === 7 ? value + '-01' : value}T00:00:00Z`);
}

export function monthDiff(start, end) {
  return Math.max(1, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth());
}

export function durationLabel(months) {
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return [years && `${years} yr${years === 1 ? '' : 's'}`, remainder && `${remainder} mo`].filter(Boolean).join(' ') || '< 1 mo';
}

export function currentThenChronological(periods) {
  return [...periods].sort((a, b) => {
    const aCurrent = !a.end;
    const bCurrent = !b.end;
    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
    return b.start.localeCompare(a.start);
  });
}

export function alphabeticalProducts(groups) {
  return [...groups].sort((a, b) => a.product.name.localeCompare(b.product.name, 'en-AU'));
}

export function dateLabel(value, precision, qualifier) {
  if (!value) return 'Present';
  const date = parseDate(value);
  const options = precision === 'day'
    ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }
    : { month: 'short', year: 'numeric', timeZone: 'UTC' };
  const text = new Intl.DateTimeFormat('en-AU', options).format(date);
  return qualifier === 'by' ? `By ${text}` : text;
}
