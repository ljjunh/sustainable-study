import { parseIsoDate, toIsoDate } from "@/src/planner";
import type { EventDraft, IsoDate, LocalDateTime, TaskDraft } from "@/src/planner";

// 불변속성
// Task.title은 비어 있으면 안 됨
// Task.dueDate는 유효한 YYYY-MM-DD여야 함
// Event.startTime < Event.endTime 이어야 함
// reminderAt이 있으면 유효한 날짜/시간 형식이어야 함
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; reason: string };

export function isValidIsoDate(value: string): value is IsoDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return toIsoDate(parseIsoDate(value)) === value;
}

export function validateTaskDraft(draft: TaskDraft): ValidationResult<TaskDraft> {
  const title = draft.title.trim();
  const note = draft.note.trim();

  if (!title) {
    return { ok: false, reason: "할 일 제목을 입력해 주세요." };
  }

  if (!isValidIsoDate(draft.dueDate)) {
    return { ok: false, reason: "마감일 형식이 올바르지 않습니다." };
  }

  if (draft.reminderAt && !isValidLocalDateTime(draft.reminderAt)) {
    return { ok: false, reason: "알림 시간 형식이 올바르지 않습니다." };
  }

  return {
    ok: true,
    value: {
      ...draft,
      title,
      note,
    },
  };
}

export function validateEventDraft(draft: EventDraft): ValidationResult<EventDraft> {
  const title = draft.title.trim();
  const note = draft.note.trim();

  if (!title) {
    return { ok: false, reason: "일정 제목을 입력해 주세요." };
  }

  if (!isValidIsoDate(draft.date)) {
    return { ok: false, reason: "날짜 형식이 올바르지 않습니다." };
  }

  if (!isValidTime(draft.startTime) || !isValidTime(draft.endTime)) {
    return { ok: false, reason: "시작/종료 시간 형식이 올바르지 않습니다." };
  }

  if (toTimeMinutes(draft.startTime) >= toTimeMinutes(draft.endTime)) {
    return { ok: false, reason: "종료 시간은 시작 시간보다 늦어야 합니다." };
  }

  if (draft.reminderAt && !isValidLocalDateTime(draft.reminderAt)) {
    return { ok: false, reason: "알림 시간 형식이 올바르지 않습니다." };
  }

  return {
    ok: true,
    value: {
      ...draft,
      title,
      note,
    },
  };
}

function isValidLocalDateTime(value: string): value is LocalDateTime {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return false;
  }

  const [date, time = ""] = value.split("T");
  return isValidIsoDate(date) && isValidTime(time);
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function toTimeMinutes(value: string): number {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}
