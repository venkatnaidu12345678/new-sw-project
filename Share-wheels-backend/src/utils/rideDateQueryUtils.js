const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Calendar-day bounds for a ride date (ISO string, Date, or timestamp).
 * Uses UTC + local span so stored dates match regardless of storage style.
 */
const getRideDayBounds = (dateInput) => {
  if (dateInput == null || dateInput === "") return null;

  const str = String(dateInput).trim();
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const year = parseInt(ymd[1], 10);
    const month = parseInt(ymd[2], 10);
    const day = parseInt(ymd[3], 10);
    const utcStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const utcEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    const localStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
    return {
      start: new Date(Math.min(utcStart.getTime(), localStart.getTime())),
      end: new Date(Math.max(utcEnd.getTime(), localEnd.getTime())),
    };
  }

  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/** Passenger request date + date_end overlaps the driver's ride day. */
const passengerOverlapsRideDay = (dayStart, dayEnd) => ({
  $and: [
    { date: { $lte: dayEnd } },
    {
      $or: [
        { date_end: { $gte: dayStart } },
        {
          $and: [
            {
              $or: [{ date_end: null }, { date_end: { $exists: false } }],
            },
            { date: { $gte: dayStart, $lte: dayEnd } },
          ],
        },
      ],
    },
  ],
});

/** Courier { startDate, endDate } overlaps the driver's ride day. */
const courierOverlapsRideDay = (dayStart, dayEnd) => ({
  $and: [
    { "date.startDate": { $lte: dayEnd } },
    {
      $or: [
        { "date.endDate": { $gte: dayStart } },
        {
          $and: [
            {
              $or: [
                { "date.endDate": null },
                { "date.endDate": { $exists: false } },
              ],
            },
            { "date.startDate": { $gte: dayStart, $lte: dayEnd } },
          ],
        },
      ],
    },
  ],
});

module.exports = {
  escapeRegex,
  getRideDayBounds,
  passengerOverlapsRideDay,
  courierOverlapsRideDay,
};
