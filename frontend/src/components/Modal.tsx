// components/Modal.tsx
function Modal({ onClose, children }: { onClose: () => void, children: React.ReactNode }) {
    return (
        <div style={{
            position: "fixed",
            top: 0, left: 0,
            width: "100vw", height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: "white",
                padding: "2rem",
                borderRadius: "8px",
                minWidth: "300px"
            }}>
                <button onClick={onClose}>✕</button>
                {children}
            </div>
        </div>
    )
}
export default Modal