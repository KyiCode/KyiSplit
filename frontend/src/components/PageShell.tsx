import type { ReactNode } from "react"
import Brand from "./Brand"

function PageShell({ children, action }: { children: ReactNode, action?: ReactNode }) {
    return (
        <div className="app-shell">
            <header className="topbar">
                <Brand />
                <div className="topbar-actions">
                    {action}
                </div>
            </header>
            <main className="page-content">{children}</main>
        </div>
    )
}

export default PageShell
