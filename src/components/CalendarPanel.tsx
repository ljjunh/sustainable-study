"use client";

import { createMonthGrid, getEventsForDate, getTasksForDate, todayIso } from "@/src/planner";
import type { EventCategory, PlannerState, Priority } from "@/src/planner";

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarPanelProps {
  state: PlannerState;
  onSelectDate(date: string): void;
}

export function CalendarPanel({ state, onSelectDate }: CalendarPanelProps) {
  const monthGrid = createMonthGrid(state.visibleMonth, todayIso());

  return (
    <section className="calendar-board">
      <div className="calendar-grid" role="grid">
        <div className="calendar-weekdays">
          {weekdays.map((weekday) => (
            <div className="weekday" key={weekday}>
              {weekday}
            </div>
          ))}
        </div>
        <div className="calendar-days">
          {monthGrid.map((day) => {
            const dayTasks = getTasksForDate(state.tasks, day.date).filter((task) => !task.done);
            const dayEvents = getEventsForDate(state.events, day.date);
            const visibleEvents = dayEvents.slice(0, 3);
            const visibleTasks = dayTasks.slice(0, Math.max(0, 3 - visibleEvents.length));
            const hiddenCount = dayEvents.length + dayTasks.length - visibleEvents.length - visibleTasks.length;
            const className = ["day-cell", day.isCurrentMonth ? "" : "is-muted", state.selectedDate === day.date ? "is-selected" : ""]
              .filter(Boolean)
              .join(" ");

            return (
              <button className={className} type="button" key={day.date} onClick={() => onSelectDate(day.date)}>
                <span className="day-heading">
                  <span className={day.isToday ? "day-number is-today" : "day-number"}>{day.dayOfMonth}</span>
                </span>
                <span className="day-items">
                  {visibleEvents.map((event) => (
                    <span className={`calendar-chip event ${categoryClass[event.category]}`} key={event.id}>
                      <span className="chip-time">{event.startTime}</span>
                      {event.title}
                    </span>
                  ))}
                  {visibleTasks.map((task) => (
                    <span className={`calendar-chip task ${priorityClass[task.priority]}`} key={task.id}>
                      할 일: {task.title}
                    </span>
                  ))}
                  {hiddenCount > 0 ? <span className="calendar-more">+{hiddenCount}개 더보기</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
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
