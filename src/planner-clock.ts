import type { Clock } from "@/src/planner";

export const systemClock: Clock = {
  now() {
    return new Date();
  },
  todayIso() {
    return toIsoDate(new Date());
  },
  nowLocalDateTime() {
    return toLocalDateTime(new Date());
  },
};

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateTime(date: Date): string {
  const isoDate = toIsoDate(date);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${isoDate}T${hour}:${minute}`;
}
