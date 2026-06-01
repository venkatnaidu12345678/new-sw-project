const { getRideDayBounds } = require("./rideDateQueryUtils");

/** End of the calendar day for the last day of a passenger request window. */
const getPassengerRequestRangeEnd = (doc) => {
  if (!doc) return null;
  const endSource = doc.date_end || doc.date;
  return getRideDayBounds(endSource)?.end ?? null;
};

/** End of the calendar day for the last day of a courier request window. */
const getCourierRequestRangeEnd = (doc) => {
  if (!doc?.date) return null;
  const endSource = doc.date.endDate || doc.date.startDate;
  return getRideDayBounds(endSource)?.end ?? null;
};

const isPastRequestRangeEnd = (rangeEnd) => {
  if (!rangeEnd || Number.isNaN(rangeEnd.getTime())) return false;
  return Date.now() > rangeEnd.getTime();
};

module.exports = {
  getPassengerRequestRangeEnd,
  getCourierRequestRangeEnd,
  isPastRequestRangeEnd,
};
