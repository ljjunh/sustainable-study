"use client";

import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose(): void;
}

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-button" type="button" aria-label="닫기" onClick={onClose}>
            X
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
