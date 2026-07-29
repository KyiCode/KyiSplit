import type { MouseEvent, ReactNode } from "react"

function Modal({ onClose, children }: { onClose: () => void, children: ReactNode }) {
    function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
        if (event.target === event.currentTarget) onClose()
    }

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeFromBackdrop}>
            <div className="modal-card" role="dialog" aria-modal="true">
                <button className="icon-button modal-close" onClick={onClose} aria-label="Close">×</button>
                {children}
            </div>
        </div>
    )
}

export default Modal
