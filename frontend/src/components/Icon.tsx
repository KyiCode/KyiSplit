type IconName = "plus" | "people"

function Icon({ name }: { name: IconName }) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            className="action-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            {name === "plus" ? (
                <path d="M12 5v14M5 12h14" />
            ) : (
                <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>
            )}
        </svg>
    )
}

export default Icon
