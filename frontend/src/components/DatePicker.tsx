import { useEffect, useState } from "react";

function DatePicker({ onChange }: { onChange: (date: string) => void }) {
    const today = new Date();

    const [day, setDay] = useState(String(today.getDate()).padStart(2, "0"));
    const [month, setMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
    const [year, setYear] = useState(String(today.getFullYear()));

    function isValidDate(y: string, m: string, d: string) {
        if (!y || !m || !d) return false;
        if (y.length !== 4) return false;

        const yearNum = Number(y);
        const monthNum = Number(m);
        const dayNum = Number(d);

        if (
            isNaN(yearNum) ||
            isNaN(monthNum) ||
            isNaN(dayNum)
        ) return false;

        if (monthNum < 1 || monthNum > 12) return false;
        if (dayNum < 1 || dayNum > 31) return false;

        const date = new Date(yearNum, monthNum - 1, dayNum);

        // check real date (catches 31 Feb, etc.)
        return (
            date.getFullYear() === yearNum &&
            date.getMonth() === monthNum - 1 &&
            date.getDate() === dayNum
        );
    }

    useEffect(() => {
        if (isValidDate(year, month, day)) {
            const formatted = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
            onChange(formatted);
        }
    }, [day, month, year]);

    return (
        <div>
            <input
                value={day}
                onChange={(e) => setDay(e.target.value)}
                placeholder="DD"
            />

            <input
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="MM"
            />

            <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="YYYY"
            />
        </div>
    );
}

export default DatePicker;