import { formatRequestDate, formatSingleDate } from "../Utils";
import { getPassengerFare, getCourierFare } from "./fareUtils";
import { tripStatusLabel } from "./participantTripStatus";

const fmtDate = (value) => {
  if (!value) return "—";
  const label = formatRequestDate(value);
  return label === "N/A" ? formatSingleDate(value) : label;
};

const fmtDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const receiver = (item) =>
  item?.courier_receiver_details || item?.receiver || {};

export const buildDriverPassengerDetail = (item, rideFrom, rideTo) => {
  const from = item?.from || rideFrom;
  const to = item?.to || rideTo;
  return {
  role: "passenger",
  name: item?.userId?.name || "Passenger",
  user: item?.userId,
  subtitle: [item?.userId?.gender, tripStatusLabel(item?.status)].filter(Boolean).join(" · "),
  verified: !!item?.isBoardingVerified,
  route: from && to ? `${from} → ${to}` : from || "",
  status: item?.status || "accepted",
  rows: [
    { label: "Mobile", value: item?.userId?.mobile },
    { label: "Email", value: item?.userId?.email },
    { label: "Gender", value: item?.userId?.gender },
    { label: "User ID", value: item?.userId?.userNo },
    { label: "Pickup", value: from },
    { label: "Drop", value: to },
    { label: "Seats Booked", value: item?.requires_seats || 1 },
    { label: "Trip Status", value: tripStatusLabel(item?.status) },
    { label: "Joined At", value: fmtDateTime(item?.joinedAt) },
    {
      label: "Verification",
      value: item?.isBoardingVerified ? "Verified" : "Pending",
    },
  ],
  price: getPassengerFare(item),
  priceLabel: "Fare",
};
};

export const buildDriverCourierDetail = (item, rideFrom, rideTo) => {
  const recv = receiver(item);

  return {
    role: "courier",
    name: item?.userId?.name || recv?.name || "Courier",
    user: item?.userId,
    subtitle: [item?.courierNumber, item?.courier_type, tripStatusLabel(item?.status)]
      .filter(Boolean)
      .join(" · "),
    verified: !!item?.isBoardingVerified,
    parcelImage: item?.courier_img,
    route:
      item?.from && item?.to
        ? `${item.from} → ${item.to}`
        : rideFrom && rideTo
        ? `${rideFrom} → ${rideTo}`
        : "",
    status: item?.status || "accepted",
    rows: [
      { label: "Sender Mobile", value: item?.userId?.mobile },
      { label: "Sender Email", value: item?.userId?.email },
      { label: "User ID", value: item?.userId?.userNo },
      { label: "From", value: item?.from || rideFrom },
      { label: "To", value: item?.to || rideTo },
      { label: "Delivery Date", value: fmtDate(item?.date) },
      { label: "Time Slot", value: item?.timeSlot },
      { label: "Parcel", value: item?.parcel || item?.what_to_deliver },
      { label: "Courier No.", value: item?.courierNumber },
      { label: "Courier Type", value: item?.courier_type },
      { label: "Receiver Name", value: recv?.name },
      { label: "Receiver Mobile", value: recv?.mobile },
      { label: "Receiver Alt. Mobile", value: recv?.alternate_mobile },
      { label: "Receiver Address", value: recv?.Address || recv?.address },
      { label: "Assigned At", value: fmtDateTime(item?.assignedAt) },
      { label: "Trip Status", value: tripStatusLabel(item?.status) },
      {
        label: "Verification",
        value: item?.isBoardingVerified ? "Verified" : "Pending",
      },
    ],
    price: getCourierFare(item),
    priceLabel: "Amount",
  };
};

export const buildEnrouteDetail = (item, from, to, date) => {
  const isCourier = item?.type === "courier";
  const raw = item?.raw || {};
  const recv = receiver(raw);
  const routeFrom = raw.from || from;
  const routeTo = raw.to || to;

  if (isCourier) {
    return {
      role: "courier",
      name: item?.name || "Courier",
      user: { profile_img: item?.profile, name: item?.name, gender: item?.gender },
      subtitle: [raw.courierNumber, raw.courier_type].filter(Boolean).join(" · "),
      route: `${routeFrom || "—"} → ${routeTo || "—"}`,
      status: raw.courier_status || raw.status || "pending",
      parcelImage: raw.courier_img,
      rows: [
        { label: "From", value: routeFrom },
        { label: "To", value: routeTo },
        { label: "Delivery Date", value: fmtDate(raw.date || date) },
        { label: "Time Slot", value: raw.timeSlot || item?.timeSlot },
        { label: "Parcel", value: raw.what_to_deliver || item?.details },
        { label: "Courier No.", value: raw.courierNumber },
        { label: "Courier Type", value: raw.courier_type },
        { label: "Sender Gender", value: raw.gender || item?.gender },
        { label: "Receiver Name", value: recv?.name },
        { label: "Receiver Address", value: recv?.Address || recv?.address },
        { label: "Request Type", value: raw.request_type },
        { label: "Status", value: raw.courier_status },
      ],
      price: item?.price ?? raw.amount ?? raw.amount_will ?? 0,
      priceLabel: "Amount",
    };
  }

  return {
    role: "passenger",
    name: item?.name || "Passenger",
    user: { profile_img: item?.profile, name: item?.name, gender: item?.gender },
    subtitle: raw.gender || item?.gender,
    route: `${routeFrom || "—"} → ${routeTo || "—"}`,
    status: raw.status || "pending",
    rows: [
      { label: "From", value: routeFrom },
      { label: "To", value: routeTo },
      { label: "Date", value: fmtDate(date || raw.date) },
      { label: "Seats Needed", value: raw.seats_needed },
      { label: "Gender", value: raw.gender || item?.gender },
      { label: "Luggage", value: raw.luggage },
      { label: "Request Type", value: raw.request_type },
      { label: "Status", value: raw.status },
    ],
    price: item?.price ?? raw.amount ?? raw.amount_will ?? 0,
    priceLabel: "Fare",
  };
};

export const buildMyRequestDetail = (ride) => {
  const raw = ride?.raw || {};
  const isCourier = ride?.role === "Courier";
  const base = {
    ...ride,
    matchingRides: ride?.matchingRides ?? raw.matchingRides ?? [],
    linkedRide: ride?.linkedRide ?? raw.linkedRide ?? null,
    requestKind: ride?.requestKind ?? raw.requestKind,
  };

  if (isCourier) {
    const recv = raw.receiver || {};
    return {
      ...base,
      extraRows: [
        { label: "Courier Type", value: raw.courier_type },
        { label: "Receiver Name", value: recv?.name },
        { label: "Receiver Mobile", value: recv?.mobile },
        { label: "Receiver Address", value: recv?.Address || recv?.address },
      ],
    };
  }

  const kindLabel =
    raw.requestKind === "ride_join"
      ? "Pending join on driver ride"
      : "Open passenger request";

  return {
    ...base,
    extraRows: [
      { label: "Type", value: kindLabel },
      { label: "Driver", value: raw.driver?.name || raw.linkedRide?.creator?.name },
      { label: "Luggage", value: raw.luggage },
    ],
  };
};
