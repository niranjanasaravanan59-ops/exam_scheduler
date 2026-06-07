const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isValidDateOnly = (dateString) => {
  const text = String(dateString || '');
  if (!DATE_ONLY_PATTERN.test(text)) return false;

  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
};

export const formatDisplayDate = (dateString) => {
  if (!dateString) return '';

  const [year, month, day] = String(dateString).slice(0, 10).split('-').map(Number);
  if (!isValidDateOnly(String(dateString).slice(0, 10))) return dateString;

  return `${MONTHS[month - 1]} ${day}, ${year}`;
};

export const formatDisplayTime = (timeString) => {
  if (!timeString) return '';
  return String(timeString).slice(0, 5);
};

export const formatDisplayDateTime = (dateString, timeString) =>
  `${formatDisplayDate(dateString)} at ${formatDisplayTime(timeString)}`;

export const getLocalInputDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isExamEnded = (dateString, endTime, now = new Date()) => {
  if (!dateString || !endTime) return false;
  if (!isValidDateOnly(dateString)) return true;
  return now >= new Date(`${dateString}T${formatDisplayTime(endTime)}`);
};
