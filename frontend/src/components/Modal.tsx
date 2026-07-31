import { useEffect, useRef, type MouseEvent, type ReactNode } from "react"

function Modal({
    onClose,
    children,
    ariaLabel,
    canClose = true
}: {
    onClose: () => void
    children: ReactNode
    ariaLabel: string
    canClose?: boolean
}) {
    const previousFocus = useRef<HTMLElement | null>(
        document.activeElement as HTMLElement | null
    )
    const dialogRef = useRef<HTMLDivElement | null>(null)
    const onCloseRef = useRef(onClose)
    const canCloseRef = useRef(canClose)

    useEffect(() => {
        onCloseRef.current = onClose
        canCloseRef.current = canClose
    }, [canClose, onClose])

    useEffect(() => {
        const focusToRestore = previousFocus.current
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && canCloseRef.current) {
                event.preventDefault()
                onCloseRef.current()
                return
            }
            if (event.key === "Tab" && dialogRef.current) {
                const focusable = getFocusable(dialogRef.current)
                if (focusable.length === 0) {
                    event.preventDefault()
                    dialogRef.current.focus()
                    return
                }
                const first = focusable[0]
                const last = focusable[focusable.length - 1]
                const active = document.activeElement
                if (
                    event.shiftKey &&
                    (active === first || !dialogRef.current.contains(active))
                ) {
                    event.preventDefault()
                    last.focus()
                } else if (
                    !event.shiftKey &&
                    (active === last || !dialogRef.current.contains(active))
                ) {
                    event.preventDefault()
                    first.focus()
                }
            }
        }
        document.addEventListener("keydown", handleKeyDown)
        const dialog = dialogRef.current
        if (dialog && !dialog.contains(document.activeElement)) {
            const [first] = getFocusable(dialog)
            ;(first || dialog).focus()
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown)
            focusToRestore?.focus()
        }
    }, [])

    function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
        if (canClose && event.target === event.currentTarget) onClose()
    }

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeFromBackdrop}>
            <div
                ref={dialogRef}
                className="modal-card"
                role="dialog"
                aria-label={ariaLabel}
                aria-modal="true"
                tabIndex={-1}
            >
                <button
                    className="icon-button modal-close"
                    disabled={!canClose}
                    onClick={onClose}
                    aria-label="Close"
                >
                    ×
                </button>
                {children}
            </div>
        </div>
    )
}

function getFocusable(container: HTMLElement) {
    return Array.from(container.querySelectorAll<HTMLElement>(
        "button:not(:disabled), [href], input:not(:disabled), " +
        "select:not(:disabled), textarea:not(:disabled), " +
        "[tabindex]:not([tabindex='-1'])"
    )).filter(element => element.getAttribute("aria-hidden") !== "true")
}

export default Modal
