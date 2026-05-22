"use client";

import { FormEvent, useMemo, useState } from "react";
import { Modal } from "@/src/components/Modal";
import { formatDate, getTasksForDate, nowLocalDateTime } from "@/src/planner";
import type { Priority, Task, TaskDraft } from "@/src/planner";

type TaskFilter = "selected" | "open" | "done" | "all";
type TaskModalMode = "create" | "edit";

interface TaskPanelProps {
  selectedDate: string;
  tasks: Task[];
  onAddTask(draft: TaskDraft): void;
  onUpdateTask(id: string, draft: TaskDraft): void;
  onToggleTask(id: string): void;
  onDeleteTask(id: string): void;
}

export function TaskPanel({ selectedDate, tasks, onAddTask, onUpdateTask, onToggleTask, onDeleteTask }: TaskPanelProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(selectedDate);
  const [priority, setPriority] = useState<Priority>("medium");
  const [note, setNote] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [filter, setFilter] = useState<TaskFilter>("selected");
  const [modalMode, setModalMode] = useState<TaskModalMode | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const visibleTasks = useMemo(() => {
    if (filter === "selected") {
      return getTasksForDate(tasks, selectedDate);
    }
    if (filter === "open") {
      return tasks.filter((task) => !task.done);
    }
    if (filter === "done") {
      return tasks.filter((task) => task.done);
    }
    return tasks;
  }, [filter, selectedDate, tasks]);

  function openCreateModal() {
    setTitle("");
    setDueDate(selectedDate);
    setPriority("medium");
    setNote("");
    setReminderAt("");
    setEditingTaskId(null);
    setModalMode("create");
  }

  function openEditModal(task: Task) {
    setTitle(task.title);
    setDueDate(task.dueDate);
    setPriority(task.priority);
    setNote(task.note ?? "");
    setReminderAt(task.reminderAt ?? "");
    setEditingTaskId(task.id);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setEditingTaskId(null);
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    const draft = {
      title,
      dueDate,
      priority,
      note,
      reminderAt: reminderAt || null
    };

    if (modalMode === "edit" && editingTaskId) {
      onUpdateTask(editingTaskId, draft);
    } else {
      onAddTask(draft);
    }
    closeModal();
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>할 일</h2>
        <div className="panel-actions">
          <div className="segmented" aria-label="할 일 필터">
            {taskFilters.map((item) => (
              <button
                type="button"
                key={item.value}
                className={filter === item.value ? "active" : ""}
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button className="primary-button" type="button" onClick={openCreateModal}>
            추가
          </button>
        </div>
      </div>
      <div className="panel-body">
        <div className="list">
          {visibleTasks.length === 0 ? (
            <div className="empty-state">항목 없음</div>
          ) : (
            visibleTasks.map((task) => (
              <article className={`task-row priority-${task.priority} ${task.done ? "done" : ""}`} key={task.id}>
                <div className="item-line">
                  <div>
                    <div className="item-title">{task.title}</div>
                    <div className="item-meta">
                      <span className="tag">{formatDate(task.dueDate)}</span>
                      <span className="tag">{priorityLabel[task.priority]}</span>
                      {task.reminderAt ? <span className="tag">{task.reminderAt.replace("T", " ")}</span> : null}
                    </div>
                    {task.note ? <div className="item-note">{task.note}</div> : null}
                  </div>
                  <div className="row-actions">
                    <button className="secondary-button" type="button" onClick={() => openEditModal(task)}>
                      수정
                    </button>
                    <button className="secondary-button" type="button" onClick={() => onToggleTask(task.id)}>
                      {task.done ? "열기" : "완료"}
                    </button>
                    <button className="danger-button" type="button" onClick={() => onDeleteTask(task.id)}>
                      삭제
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
      {modalMode ? (
        <Modal title={modalMode === "edit" ? "할 일 수정" : "할 일 추가"} onClose={closeModal}>
          <form className="modal-form" onSubmit={submitTask}>
            <div className="field">
              <label htmlFor="task-title">제목</label>
              <input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
            </div>
            <div className="modal-form-grid">
              <div className="field">
                <label htmlFor="task-date">마감일</label>
                <input id="task-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="task-priority">우선순위</label>
                <select id="task-priority" value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                  <option value="high">높음</option>
                  <option value="medium">보통</option>
                  <option value="low">낮음</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="task-reminder">알림 시간</label>
              <input
                id="task-reminder"
                type="datetime-local"
                min={modalMode === "edit" && reminderAt ? reminderAt : nowLocalDateTime()}
                value={reminderAt}
                onChange={(event) => setReminderAt(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="task-note">메모</label>
              <textarea id="task-note" value={note} onChange={(event) => setNote(event.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="secondary-button" type="button" onClick={closeModal}>
                취소
              </button>
              <button className="primary-button" type="submit">
                저장
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

const taskFilters: Array<{ value: TaskFilter; label: string }> = [
  { value: "selected", label: "선택일" },
  { value: "open", label: "진행" },
  { value: "done", label: "완료" },
  { value: "all", label: "전체" }
];

const priorityLabel: Record<Priority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음"
};
