"use client";

import { CalendarPanel } from "@/src/components/CalendarPanel";
import { MiniCalendar } from "@/src/components/MiniCalendar";
import { NotificationMenu } from "@/src/components/NotificationMenu";
import { SchedulePanel } from "@/src/components/SchedulePanel";
import { TaskPanel } from "@/src/components/TaskPanel";
import { WeekTimeline } from "@/src/components/WeekTimeline";
import { usePlannerStore } from "@/src/hooks/usePlannerStore";
import {
  addDays,
  addMonths,
  formatMonth,
  formatWeekTitle,
  parseIsoDate,
  todayIso,
  toIsoDate,
} from "@/src/planner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { EventDraft, TaskDraft } from "@/src/planner";

type CalendarView = "month" | "week";

interface PlannerAppProps {
  view: CalendarView;
  initialDate?: string;
}

export function PlannerApp({ view, initialDate }: PlannerAppProps) {
  const { state, hydrated, actions } = usePlannerStore();
  const router = useRouter();
  const routeDate = normalizeDate(initialDate);
  const toolbarTitle =
    view === "month"
      ? formatMonth(state.visibleMonth)
      : formatWeekTitle(state.selectedDate);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const date = routeDate ?? todayIso();
    actions.selectDate(date);

    if (!routeDate) {
      router.replace(routeFor(view, date), { scroll: false });
    }
  }, [hydrated, routeDate, router, view]);

  function selectDate(date: string) {
    actions.selectDate(date);
    router.replace(routeFor(view, date), { scroll: false });
  }

  function movePrevious() {
    selectDate(
      view === "month"
        ? addMonths(state.visibleMonth, -1)
        : addDays(state.selectedDate, -7)
    );
  }

  function moveNext() {
    selectDate(
      view === "month"
        ? addMonths(state.visibleMonth, 1)
        : addDays(state.selectedDate, 7)
    );
  }

  function selectToday() {
    selectDate(todayIso());
  }

  function addTask(draft: TaskDraft) {
    actions.addTask(draft);
    router.replace(routeFor(view, draft.dueDate), { scroll: false });
  }

  function updateTask(id: string, draft: TaskDraft) {
    actions.updateTask(id, draft);
    router.replace(routeFor(view, draft.dueDate), { scroll: false });
  }

  function addEvent(draft: EventDraft) {
    actions.addEvent(draft);
    router.replace(routeFor(view, draft.date), { scroll: false });
  }

  function updateEvent(id: string, draft: EventDraft) {
    actions.updateEvent(id, draft);
    router.replace(routeFor(view, draft.date), { scroll: false });
  }

  return (
    <main className="app-shell">
      <header className="calendar-topbar">
        <div className="brand">
          <h1>캘린더</h1>
          <span>일정과 할 일</span>
        </div>
        <div className="calendar-toolbar" aria-label="캘린더 이동">
          <button
            className="secondary-button"
            type="button"
            onClick={selectToday}
          >
            오늘
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="이전"
            onClick={movePrevious}
          >
            {"<"}
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="다음"
            onClick={moveNext}
          >
            {">"}
          </button>
          <div className="toolbar-title">{toolbarTitle}</div>
        </div>
        <div className="topbar-actions">
          <div className="segmented view-switch" aria-label="캘린더 보기">
            <Link
              className={view === "month" ? "active" : ""}
              href={routeFor("month", state.selectedDate)}
            >
              월
            </Link>
            <Link
              className={view === "week" ? "active" : ""}
              href={routeFor("week", state.selectedDate)}
            >
              주
            </Link>
          </div>
          <span className="tag">{hydrated ? "저장됨" : "로딩"}</span>
          <NotificationMenu
            notifications={state.notifications}
            onRead={actions.markNotificationRead}
            onSnooze={actions.snoozeNotification}
          />
        </div>
      </header>

      <section className="calendar-workspace">
        <aside className="calendar-sidebar">
          {view === "week" ? (
            <MiniCalendar
              visibleMonth={state.visibleMonth}
              selectedDate={state.selectedDate}
              tasks={state.tasks}
              events={state.events}
              onSelectDate={selectDate}
              onVisibleMonthChange={actions.setVisibleMonth}
            />
          ) : null}
          <SchedulePanel
            selectedDate={state.selectedDate}
            events={state.events}
            onAddEvent={addEvent}
            onUpdateEvent={updateEvent}
            onDeleteEvent={actions.deleteEvent}
          />
          <TaskPanel
            selectedDate={state.selectedDate}
            tasks={state.tasks}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onToggleTask={actions.toggleTask}
            onDeleteTask={actions.deleteTask}
          />
        </aside>

        {view === "month" ? (
          <CalendarPanel
            visibleMonth={state.visibleMonth}
            selectedDate={state.selectedDate}
            tasks={state.tasks}
            events={state.events}
            onSelectDate={selectDate}
          />
        ) : (
          <WeekTimeline
            selectedDate={state.selectedDate}
            tasks={state.tasks}
            events={state.events}
            onSelectDate={selectDate}
            onAddEvent={addEvent}
            onUpdateEvent={updateEvent}
          />
        )}
      </section>
    </main>
  );
}

/**
 * 뷰 타입과 날짜를 기반으로 캘린더 라우트 URL을 생성합니다.
 *
 * @param view 캘린더 뷰 타입(`month` | `week`)
 * @param date 기준 날짜(ISO 형식 `YYYY-MM-DD`)
 * @returns `/{view}?date={date}` 형식의 라우트 문자열
 */
function routeFor(view: CalendarView, date: string): string {
  return `/${view}?date=${date}`;
}

/**
 * 라우트/쿼리에서 받은 날짜 문자열의 유효성을 검사합니다.
 *
 * - `YYYY-MM-DD` 형식만 허용합니다.
 * - 달력에 존재하지 않는 날짜(예: `2026-02-30`)는 거부합니다.
 *
 * @param value 라우트/쿼리 파라미터에서 받은 원본 날짜 문자열
 * @returns 유효하면 원본 ISO 날짜 문자열, 아니면 `null`
 */
function normalizeDate(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  return toIsoDate(parseIsoDate(value)) === value ? value : null;
}
