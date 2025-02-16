import React, { useState, useEffect } from 'react';

const Calendar = ({ year, month }) => {
    const [currentYear, setCurrentYear] = useState(year);
    const [currentMonth, setCurrentMonth] = useState(month);
    const [calendarData, setCalendarData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [taskStates, setTaskStates] = useState({});
    const [newTask, setNewTask] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [taskList, setTaskList] = useState([]);
    const [isFormVisible, setIsFormVisible] = useState(false);
    
    useEffect(() => {
        fetchCalendarData();
    }, [currentYear, currentMonth]);

    const fetchCalendarData = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/taskmanage/calendar/?year=${currentYear}&month=${currentMonth}&view=tasks-json`);
            const data = await response.json();
            setCalendarData(data.day_info_and_tasks);
        } catch (error) {
            console.error("Error fetching calendar data:", error);
        }
        setIsLoading(false);
    };

    const handleScroll = (event) => {
        if (event.deltaY > 0) {
            setCurrentMonth((prev) => (prev === 12 ? 1 : prev + 1));
            setCurrentYear((prev) => (prev === 12 ? prev + 1 : prev));
        } else {
            setCurrentMonth((prev) => (prev === 1 ? 12 : prev - 1));
            setCurrentYear((prev) => (prev === 1 ? prev - 1 : prev));
        }
    };

    useEffect(() => {
        window.addEventListener("wheel", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("wheel", handleScroll);
        };
    }, []);

    const handleCellClick = (date, tasks) => {
        if (!date) return;
        console.log("Cell clicked: ", date);
        setSelectedDate(date);
        setTaskList(tasks || []);
        setIsFormVisible(true);
    };

    const handleTaskSubmit = async (event) => {
        event.preventDefault();
        if (!selectedDate || !newTask.trim()) return;
        try {
            await fetch("/taskmanage/save-tasks/", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: selectedDate, task: newTask, is_checked: false })
            });
            setNewTask("");
            setIsFormVisible(false);
            fetchCalendarData();
        } catch (error) {
            console.error("Error saving task:", error);
        }
    };

    return (
        <>
        <h1 id="calendar-title">{currentYear}年 {currentMonth}月</h1>
        <div className="calendar-container">
            <table className="calendar">
                <thead>
                    <tr>
                        <th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: Math.ceil(calendarData.length / 7) }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {calendarData.slice(rowIndex * 7, (rowIndex + 1) * 7).map((day, index) => (
                                <td key={index} className={`
                                    ${day.is_holiday ? 'holiday' : ''} 
                                    ${index % 7 === 0 ? 'sunday' : ''} 
                                    ${(index + 1) % 7 === 0 ? 'saturday' : ''}`.trim()}
                                    onClick={() => handleCellClick(`${currentYear}-${currentMonth}-${day.day}`, day.tasks)}>
                                    {day.day && (
                                        <>
                                            <div className="date">{day.day}</div>
                                            {day.is_holiday && <div className="holiday-name">{day.holiday_name}</div>}
                                            {day.tasks && (
                                                <ul>
                                                    {day.tasks.map((task, tIndex) => (
                                                        <li key={tIndex}>
                                                            <input 
                                                                type="checkbox"
                                                                className="task-checkbox"
                                                                name="checking"
                                                                checked={taskStates[`${currentYear}-${currentMonth}-${day.day}-${task.task}`] ?? task.is_checked}
                                                                onChange={(e) => handleTaskChange(`${currentYear}-${currentMonth}-${day.day}`, task.task, e.target.checked)}
                                                            />
                                                            <span>{task.task}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {isFormVisible && (
                <div id="taskFormForDesign">
                    <form id="taskForm" onSubmit={handleTaskSubmit}>
                        <input type="hidden" id="taskDate" name="date" value={selectedDate || ""} />
                        <textarea id="taskInput" name="task" placeholder="タスクを入力" value={newTask} onChange={(e) => setNewTask(e.target.value)}></textarea>
                        <button type="submit">保存</button>
                        <button type="button" id="cancelButton" onClick={() => setIsFormVisible(false)}>キャンセル</button>
                    </form>
                </div>
            )}
        </div>
        </>        
    );
};

export default Calendar;
