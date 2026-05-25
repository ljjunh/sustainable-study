import type { Clock, EventDraft, PlannerState, TaskDraft } from "@/src/planner";
import {
  applyAddEvent,
  applyAddTask,
  applyDeleteEvent,
  applyDeleteTask,
  applyMarkNotificationRead,
  applyRefreshNotifications,
  applySelectDate,
  applySetVisibleMonth,
  applySnoozeNotification,
  applyToggleTask,
  applyUpdateEvent,
  applyUpdateTask,
} from "@/src/planner-commands";

export type PlannerAction =
  | { type: "replace"; state: PlannerState }
  | { type: "selectDate"; date: string }
  | { type: "setVisibleMonth"; month: string }
  | { type: "addTask"; draft: TaskDraft }
  | { type: "updateTask"; id: string; draft: TaskDraft }
  | { type: "toggleTask"; id: string }
  | { type: "deleteTask"; id: string }
  | { type: "addEvent"; draft: EventDraft }
  | { type: "updateEvent"; id: string; draft: EventDraft }
  | { type: "deleteEvent"; id: string }
  | { type: "markNotificationRead"; id: string }
  | { type: "snoozeNotification"; id: string; minutes: number }
  | { type: "refreshNotifications" };

/**
 * 플래너 상태를 액션 단위로 갱신하는 reducer입니다.
 *
 * 각 액션은 상태를 불변 방식으로 계산해 새 상태를 반환하며,
 * 로컬 스토리지 동기화/타이머 같은 부수효과는 reducer 밖에서 처리합니다.
 *
 * @param state 현재 플래너 상태
 * @param action 상태 변경 의도를 담은 액션
 * @param clock 시간 의존성을 캡슐화한 런타임 포트
 * @returns 다음 플래너 상태
 */
export function plannerReducer(
  state: PlannerState,
  action: PlannerAction,
  clock: Clock
): PlannerState {
  switch (action.type) {
    // 로컬 스토리지에서 복원한 상태로 전체를 교체합니다.
    case "replace":
      return action.state;
    // 선택한 날짜를 변경하고, 월이 달라졌다면 visibleMonth도 함께 맞춥니다.
    case "selectDate":
      return applySelectDate(state, action.date);
    // 미니 캘린더 등에서 현재 보고 있는 월만 변경합니다.
    case "setVisibleMonth":
      return applySetVisibleMonth(state, action.month);
    // 새 할 일을 추가하고, 필요한 알림/선택 날짜/표시 월을 동기화합니다.
    case "addTask":
      return applyAddTask(state, action.draft, clock);
    // 기존 할 일을 수정하고, 연결된 알림도 재생성해 최신 상태로 맞춥니다.
    case "updateTask":
      return applyUpdateTask(state, action.id, action.draft, clock);
    // 할 일 완료 여부(done)를 토글합니다.
    case "toggleTask":
      return applyToggleTask(state, action.id);
    // 할 일과 그 할 일에 연결된 알림을 함께 삭제합니다.
    case "deleteTask":
      return applyDeleteTask(state, action.id);
    // 새 일정을 추가하고, 필요한 알림/선택 날짜/표시 월을 동기화합니다.
    case "addEvent":
      return applyAddEvent(state, action.draft, clock);
    // 기존 일정을 수정하고, 연결된 알림도 재생성해 최신 상태로 맞춥니다.
    case "updateEvent":
      return applyUpdateEvent(state, action.id, action.draft, clock);
    // 일정과 그 일정에 연결된 알림을 함께 삭제합니다.
    case "deleteEvent":
      return applyDeleteEvent(state, action.id);
    // 특정 알림을 읽음 상태(read)로 변경합니다.
    case "markNotificationRead":
      return applyMarkNotificationRead(state, action.id);
    // 특정 알림의 시간(notifyAt)을 뒤로 미루고 scheduled 상태로 되돌립니다.
    case "snoozeNotification":
      return applySnoozeNotification(state, action.id, action.minutes);
    // 현재 시각 기준으로 알림 상태를 scheduled -> ready로 갱신합니다.
    case "refreshNotifications":
      return applyRefreshNotifications(state, clock);
    // 알 수 없는 액션은 현재 상태를 그대로 유지합니다.
    default:
      return state;
  }
}
