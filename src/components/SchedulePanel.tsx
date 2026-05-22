"use client";

import { useState } from "react";
import { EventEditorModal } from "@/src/components/EventEditorModal";
import { formatDate, getEventsForDate } from "@/src/planner";
import type { EventCategory, EventDraft, ScheduleEvent } from "@/src/planner";

type EventModalState =
  | { mode: "create"; draft: EventDraft }
  | { mode: "edit"; eventId: string; draft: EventDraft };

interface SchedulePanelProps {
  selectedDate: string;
  events: ScheduleEvent[];
  onAddEvent(draft: EventDraft): void;
  onUpdateEvent(id: string, draft: EventDraft): void;
  onDeleteEvent(id: string): void;
}

export function SchedulePanel({ selectedDate, events, onAddEvent, onUpdateEvent, onDeleteEvent }: SchedulePanelProps) {
  const [modalState, setModalState] = useState<EventModalState | null>(null);
  const selectedEvents = getEventsForDate(events, selectedDate);

  function openCreateModal() {
    setModalState({
      mode: "create",
      draft: {
        title: "",
        date: selectedDate,
        startTime: "09:00",
        endTime: "10:00",
        category: "work",
        note: "",
        reminderAt: null
      }
    });
  }

  function openEditModal(event: ScheduleEvent) {
    setModalState({
      mode: "edit",
      eventId: event.id,
      draft: toDraft(event)
    });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>일정</h2>
        <div className="panel-actions">
          <span className="tag">{formatDate(selectedDate)}</span>
          <button className="primary-button" type="button" onClick={openCreateModal}>
            추가
          </button>
        </div>
      </div>
      <div className="panel-body">
        <div className="list">
          {selectedEvents.length === 0 ? (
            <div className="empty-state">항목 없음</div>
          ) : (
            selectedEvents.map((item) => (
              <article className={`schedule-row category-${item.category}`} key={item.id}>
                <div className="item-line">
                  <div>
                    <div className="item-title">{item.title}</div>
                    <div className="item-meta">
                      <span className="tag">
                        {item.startTime} - {item.endTime}
                      </span>
                      <span className="tag">{categoryLabel[item.category]}</span>
                      {item.reminderAt ? <span className="tag">{item.reminderAt.replace("T", " ")}</span> : null}
                    </div>
                    {item.note ? <div className="item-note">{item.note}</div> : null}
                  </div>
                  <div className="row-actions">
                    <button className="secondary-button" type="button" onClick={() => openEditModal(item)}>
                      수정
                    </button>
                    <button className="danger-button" type="button" onClick={() => onDeleteEvent(item.id)}>
                      삭제
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
      {modalState ? (
        <EventEditorModal
          title={modalState.mode === "edit" ? "일정 수정" : "일정 추가"}
          initialDraft={modalState.draft}
          isEditing={modalState.mode === "edit"}
          onClose={() => setModalState(null)}
          onSubmit={(draft) => {
            if (modalState.mode === "edit") {
              onUpdateEvent(modalState.eventId, draft);
            } else {
              onAddEvent(draft);
            }
            setModalState(null);
          }}
        />
      ) : null}
    </section>
  );
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

const categoryLabel: Record<EventCategory, string> = {
  work: "업무",
  personal: "개인",
  study: "학습",
  health: "건강"
};
