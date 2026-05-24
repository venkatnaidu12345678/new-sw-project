export default function StatusBadge({ status }) {
  const key = (status || "").toLowerCase().replace(/\s/g, "_");
  const cls = ["badge"];
  if (["pending", "request_to_driver"].includes(key)) cls.push("badge-pending");
  else if (["started", "driver_assigned", "in_transit", "picked_up"].includes(key))
    cls.push("badge-started");
  else if (["completed", "delivered", "aisgned_passenger"].includes(key))
    cls.push("badge-completed");
  else if (["cancelled", "rejected"].includes(key)) cls.push("badge-cancelled");
  else cls.push("badge-pending");

  return <span className={cls.join(" ")}>{status}</span>;
}
