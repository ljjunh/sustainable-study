"use client";

import { useState } from "react";
import { EventEditorModal } from "@/src/components/EventEditorModal";
import { createWeekDays, getEventsForDate, getTasksForDate, todayIso } from "@/src/planner";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import type { EventCategory, EventDraft, PlannerState, Priority, ScheduleEvent } from "@/src/planner";

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 56;
const MIN_EVENT_MINUTES = 30;
const MIN_TIMELINE_MINUTES = START_HOUR * 60;
const MAX_TIMELINE_MINUTES = (END_HOUR + 1) * 60;
const MAX_TIME_INPUT_MINUTES = 23 * 60 + 59;
const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index);

interface WeekTimelineProps {
  state: PlannerState;
  onSelectDate(date: string): void;
  onAddEvent(draft: EventDraft): void;
  onUpdateEvent(id: string, draft: EventDraft): void;
}

type EditorState =
  | { mode: "create"; draft: EventDraft }
  | { mode: "edit"; eventId: string; draft: EventDraft };

interface DragState {
  date: string;
  start: number;
  end: number;
  moved: boolean;
}

export function WeekTimeline({ state, onSelectDate, onAddEvent, onUpdateEvent }: WeekTimelineProps) {
  const days = createWeekDays(state.selectedDate, todayIso());
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, date: string) {
    if (event.button !== 0) {
      return;
    }

    const minutes = minutesFromPointer(event);
    onSelectDate(date);
    setDrag({ date, start: minutes, end: minutes, moved: false });
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>, date: string) {
    const end = minutesFromPointer(event);

    setDrag((current) => {
      if (!current || current.date !== date) {
        return current;
      }

      return {
        ...current,
        end,
        moved: current.moved || Math.abs(end - current.start) >= 15
      };
    });
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>, date: string) {
    if (!drag || drag.date !== date) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    let start = Math.min(drag.start, drag.end);
    let end = Math.max(drag.start, drag.end);

    if (end - start < MIN_EVENT_MINUTES) {
      if (start + MIN_EVENT_MINUTES <= MAX_TIMELINE_MINUTES) {
        end = start + MIN_EVENT_MINUTES;
      } else {
        end = MAX_TIMELINE_MINUTES;
        start = Math.max(MIN_TIMELINE_MINUTES, end - MIN_EVENT_MINUTES);
      }
    }

    setDrag(null);
    if (!drag.moved) {
      return;
    }

    setEditor({
      mode: "create",
      draft: {
        title: "",
        date,
        startTime: minutesToTime(start),
        endTime: minutesToTime(end),
        category: "work",
        note: "",
        reminderAt: null
      }
    });
  }

  return (
    <section className="week-board">
      <div className="week-header">
        <div className="week-corner" />
        {days.map((day) => (
          <button
            className={`week-day-header ${state.selectedDate === day.date ? "is-selected" : ""}`}
            type="button"
            key={day.date}
            onClick={() => onSelectDate(day.date)}
          >
            <span>{day.weekday}</span>
            <strong className={day.isToday ? "is-today" : ""}>{day.dayOfMonth}</strong>
          </button>
        ))}
      </div>

      <div className="week-all-day">
        <div className="week-all-day-label">할 일</div>
        {days.map((day) => {
          const tasks = getTasksForDate(state.tasks, day.date).filter((task) => !task.done);
          return (
            <button
              className={`week-all-day-cell ${state.selectedDate === day.date ? "is-selected" : ""}`}
              type="button"
              key={day.date}
              onClick={() => onSelectDate(day.date)}
            >
              {tasks.slice(0, 2).map((task) => (
                <span className={`week-task-chip ${priorityClass[task.priority]}`} key={task.id}>
                  {task.title}
                </span>
              ))}
              {tasks.length > 2 ? <span className="week-more">+{tasks.length - 2}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="week-body">
        <div className="time-gutter">
          {hours.map((hour) => (
            <div className="time-label" key={hour}>
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div className="week-columns">
          {days.map((day) => {
            const events = getEventsForDate(state.events, day.date);
            return (
              <div
                className={`week-column ${state.selectedDate === day.date ? "is-selected" : ""}`}
                key={day.date}
                onPointerDown={(event) => startDrag(event, day.date)}
                onPointerMove={(event) => moveDrag(event, day.date)}
                onPointerUp={(event) => finishDrag(event, day.date)}
                onPointerCancel={() => setDrag(null)}
              >
                <span className="week-hour-lines">
                  {hours.map((hour) => (
                    <span className="week-hour-line" key={hour} />
                  ))}
                </span>
                {drag?.date === day.date ? <span className="week-selection" style={rangeStyle(drag.start, drag.end)} /> : null}
                {events.map((event) => (
                  <button
                    className={`week-event ${categoryClass[event.category]}`}
                    style={eventStyle(event)}
                    type="button"
                    key={event.id}
                    onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onSelectDate(event.date);
                      setEditor({ mode: "edit", eventId: event.id, draft: toDraft(event) });
                    }}
                  >
                    <strong>{event.title}</strong>
                    <span>
                      {event.startTime} - {event.endTime}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {editor ? (
        <EventEditorModal
          key={editor.mode === "edit" ? editor.eventId : `${editor.draft.date}-${editor.draft.startTime}-${editor.draft.endTime}`}
          title={editor.mode === "edit" ? "일정 수정" : "일정 추가"}
          initialDraft={editor.draft}
          isEditing={editor.mode === "edit"}
          onClose={() => setEditor(null)}
          onSubmit={(draft) => {
            if (editor.mode === "edit") {
              onUpdateEvent(editor.eventId, draft);
            } else {
              onAddEvent(draft);
            }
            setEditor(null);
          }}
        />
      ) : null}
    </section>
  );
}

function eventStyle(event: ScheduleEvent): CSSProperties {
  const start = clampMinutes(timeToMinutes(event.startTime));
  const end = Math.max(start + MIN_EVENT_MINUTES, clampMinutes(timeToMinutes(event.endTime)));
  return rangeStyle(start, end);
}

function rangeStyle(startValue: number, endValue: number): CSSProperties {
  const start = Math.min(startValue, endValue);
  const end = Math.max(startValue, endValue);
  return {
    top: `${((start - START_HOUR * 60) / 60) * HOUR_HEIGHT}px`,
    height: `${Math.max(28, ((end - start) / 60) * HOUR_HEIGHT - 4)}px`
  };
}

function timeToMinutes(value: string): number {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function clampMinutes(value: number): number {
  return Math.min(MAX_TIMELINE_MINUTES, Math.max(MIN_TIMELINE_MINUTES, value));
}

function minutesFromPointer(event: ReactPointerEvent<HTMLDivElement>): number {
  const rect = event.currentTarget.getBoundingClientRect();
  const y = Math.max(0, event.clientY - rect.top);
  const rawMinutes = START_HOUR * 60 + (y / HOUR_HEIGHT) * 60;
  return roundToStep(clampMinutes(rawMinutes), 15);
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function minutesToTime(value: number): string {
  const safeValue = Math.min(MAX_TIME_INPUT_MINUTES, Math.max(0, value));
  const hour = Math.floor(safeValue / 60);
  const minute = safeValue % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toDraft(event: ScheduleEvent): EventDraft {
  return {
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    category: event.category,
    note: event.note ?? "",
    reminderAt: event.reminderAt
  };
}

const categoryClass: Record<EventCategory, string> = {
  work: "category-work",
  personal: "category-personal",
  study: "category-study",
  health: "category-health"
};

const priorityClass: Record<Priority, string> = {
  high: "priority-high",
  medium: "priority-medium",
  low: "priority-low"
};
