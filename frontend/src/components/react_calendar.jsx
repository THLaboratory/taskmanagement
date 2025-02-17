import React, { useState, useEffect } from 'react';

const Calendar = ({ year, month, username }) => {
    const [currentYear, setCurrentYear] = useState(year);
    const [currentMonth, setCurrentMonth] = useState(month);
    const [calendarData, setCalendarData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [taskStates, setTaskStates] = useState({});
    const [newTask, setNewTask] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    const [taskList, setTaskList] = useState([]);
    const [isFormVisible, setIsFormVisible] = useState(false);
    
    // ◆スクロールでカレンダー更新◆
    useEffect(() => {
        window.addEventListener("wheel", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("wheel", handleScroll);
        };
    }, []);
    
    const handleScroll = (event) => {
        if (event.deltaY > 0) {
            setCurrentMonth((prev) => (prev === 12 ? 1 : prev + 1));
            setCurrentYear((prev) => (prev === 12 ? prev + 1 : prev));
        } else {
            setCurrentMonth((prev) => (prev === 1 ? 12 : prev - 1));
            setCurrentYear((prev) => (prev === 1 ? prev - 1 : prev));
        }
    };

    // タスクがスクロール可能ならカレンダー更新を無効化
    useEffect(() => {
        const handleWheel = (event) => {
            const scrollableElement  = event.target.closest("ul, #taskInput");
            if (!scrollableElement ) return;
    
            // スクロール可能か判定
            const canScroll = scrollableElement .scrollHeight > scrollableElement .clientHeight;
    
            if (canScroll) {
                event.stopPropagation(); // カレンダー全体のスクロールを防ぐ
            }
        };    
        document.addEventListener("wheel", handleWheel, { passive: false });    
        return () => {
            document.removeEventListener("wheel", handleWheel);
        };
    }, []);
    
    
    

    // ◆外側クリックでフォーム非表示◆
    useEffect(() => {
        const handleClickOutside = (event) => {
            const form = document.getElementById("taskFormForDesign");
            if (form && !form.contains(event.target)) {
                setIsFormVisible(false);
                form.style.display = "none";  // フォームを非表示
            }
        };        
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);

    // ◆動的にDBからデータ受取◆    
    // 構造 { 'year':~, 'month':~, 'day_info_and_tasks':[{"day": ~,  "is_holiday": ~, "holiday_name": ~, "tasks": ["task": ~, "is_checked: ~"]}, {~}] } 
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

    // ◆日付セルをクリックでフォーム生成◆
    const handleCellClick = (event, date, tasks) => {
        if (!date || !event) return;

        event.stopPropagation();

        setSelectedDate(date);
        setTaskList(tasks || []);
        setIsFormVisible(true);

        // 既存のタスクをフォームに表示
        const existingTasks = tasks.map(task => task.task).join("\n");
        setNewTask(existingTasks);

        // クリックしたセルの位置を取得
        const rect = event.currentTarget.getBoundingClientRect();

        setTimeout(() => {
            const form = document.getElementById("taskFormForDesign");

            if (form) {
                form.style.left = `${rect.left + window.scrollX}px`;  // セルの左位置
                form.style.top = `${rect.bottom + window.scrollY}px`; // セルの下に表示
                form.style.display = "block";  // 表示する
            }
        }, 0);
    };

    // ◆タスク内容を保存◆
    const saveTaskSubmit = async (event) => {
        event.preventDefault();
        if (!selectedDate) return;
    
        // 入力されているタスクを取得
        const inputTasks = newTask.split("\n")
            .map(task => task.trim())
            .filter(task => task !== "");
    
        // 既存のタスクのリスト
        const existingTasks = taskList.map(task => task.task);
    
        // 削除されたタスク（既存にあって、新しい入力にないもの）
        const deletedTasks = existingTasks.filter(task => !inputTasks.includes(task));
    
        // サーバーへ送信するデータ
        const formattedTasks = inputTasks.map(task => ({
            date: selectedDate,
            task: task,
            is_checked: taskStates[`${selectedDate}-${task}`] ?? false
        }));
    
        try {
            await fetch("/taskmanage/save-tasks/", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tasks: formattedTasks,
                    deletedTasks: deletedTasks.map(task => ({
                        date: selectedDate,
                        task: task
                    }))
                })
            });
    
            setNewTask("");
            setIsFormVisible(false);
            fetchCalendarData();
        } catch (error) {
            console.error("Error saving task:", error);
        }
    };
    

    // ◆チェック状況の保存◆
    // [`${date}-${task}`]により、タスクごとの管理が可能に
    // ...taskStates：既存のタスク状況も保持
    const handleTaskChange = async (date, task, is_checked) => {
        // taskStatesにis_checkedという値を追加
        const updatedTaskStates = { ...taskStates, [`${date}-${task}`]: is_checked };
        setTaskStates(updatedTaskStates);
    
        try {
            await fetch("/taskmanage/save-value-change/", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, task, is_checked })
            });
            fetchCalendarData();  // これがないとカレンダー更新時にちらつく
        } catch (error) {
            console.error("Error updating task status:", error);
        }
    };
    

    // ◆html要素を描画◆
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
                            {calendarData.slice(rowIndex * 7, (rowIndex + 1) * 7).map((dayInfo, index) => (
                                <td key={index} className={`
                                    ${dayInfo.is_holiday ? 'holiday' : ''} 
                                    ${index % 7 === 0 ? 'sunday' : ''} 
                                    ${(index + 1) % 7 === 0 ? 'saturday' : ''}`.trim()}
                                    onDoubleClick={(e) => handleCellClick(e, `${currentYear}-${currentMonth}-${dayInfo.day}`, dayInfo.tasks)}>
                                    {dayInfo.day && (
                                        <>
                                        <div className="date">{dayInfo.day}</div>
                                        {dayInfo.is_holiday && <div className="holiday-name">{dayInfo.holiday_name}</div>}
                                        {dayInfo.tasks && (
                                            <ul>
                                                {dayInfo.tasks.map((taskInfo, tIndex) => (
                                                    <li key={tIndex}>
                                                        <input 
                                                            type="checkbox"
                                                            className="task-checkbox"
                                                            name="checking"
                                                            checked={taskStates[`${currentYear}-${currentMonth}-${dayInfo.day}-${taskInfo.task}`] ?? taskInfo.is_checked}
                                                            onChange={(e) => handleTaskChange(`${currentYear}-${currentMonth}-${dayInfo.day}`, taskInfo.task, e.target.checked)}
                                                        />
                                                        <span>{taskInfo.task}</span>
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
                    <form id="taskForm" onSubmit={saveTaskSubmit}>
                        <input type="hidden" id="taskDate" name="date" value={selectedDate || ""} />
                        <textarea id="taskInput" name="task" placeholder="タスクを入力" value={newTask} onChange={(e) => setNewTask(e.target.value)}></textarea>
                        <button type="submit" id="submitButton">保存</button>
                        <button type="button" id="cancelButton"
                            onClick={() => {setIsFormVisible(false);}
                            }>キャンセル</button>
                    </form>
                </div>
            )}
        </div>
        </>        
    );
};

export default Calendar;
