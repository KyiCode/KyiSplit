function DatePicker({ value, onChange }: { value: string, onChange: (date: string) => void }) {
    return <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
}

export default DatePicker
