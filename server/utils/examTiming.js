const pad2 = (value) => String(value).padStart(2, '0');
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const formatDateOnly = (value) => {
  if (value instanceof Date) {
    return [
      value.getFullYear(),
      pad2(value.getMonth() + 1),
      pad2(value.getDate()),
    ].join('-');
  }

  return String(value).slice(0, 10);
};

const formatTimeOnly = (value) => {
  const time = String(value).slice(0, 8);
  return time.length === 5 ? `${time}:00` : time;
};

const isValidDateOnly = (value) => {
  const text = value instanceof Date ? formatDateOnly(value) : String(value);
  if (!DATE_ONLY_PATTERN.test(text)) return false;

  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
};

const getLocalDateTimeParts = (now = new Date()) => ({
  date: formatDateOnly(now),
  time: [
    pad2(now.getHours()),
    pad2(now.getMinutes()),
    pad2(now.getSeconds()),
  ].join(':'),
});

const getExamEndDate = (examDate, endTime) =>
  new Date(`${formatDateOnly(examDate)}T${formatTimeOnly(endTime)}`);

const isExamCompletedAt = (examDate, endTime, now = new Date()) =>
  now >= getExamEndDate(examDate, endTime);

const buildCompletedExamWhere = (Op, filters = {}, now = new Date()) => {
  const current = getLocalDateTimeParts(now);
  return {
    ...filters,
    isDeleted: false,
    [Op.or]: [
      { examDate: { [Op.lt]: current.date } },
      { examDate: current.date, endTime: { [Op.lte]: current.time } },
    ],
  };
};

const buildNotCompletedExamWhere = (Op, filters = {}, now = new Date()) => {
  const current = getLocalDateTimeParts(now);
  return {
    ...filters,
    isDeleted: false,
    [Op.or]: [
      { examDate: { [Op.gt]: current.date } },
      { examDate: current.date, endTime: { [Op.gt]: current.time } },
    ],
  };
};

module.exports = {
  buildCompletedExamWhere,
  buildNotCompletedExamWhere,
  getExamEndDate,
  getLocalDateTimeParts,
  isValidDateOnly,
  isExamCompletedAt,
};
