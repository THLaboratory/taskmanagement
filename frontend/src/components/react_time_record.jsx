import React, { useState, useEffect } from 'react';

const Calendar = () => {
    const [year, setYear] = useState(null);
    const [month, setMonth] = useState(null);
    const [calendarData, setCalendarData] = useState([]);
    const [username, setUsername] = useState("");

    // 初回レンダリング時に year, month, day-info を取得
    useEffect(() => {
        const reactRoot = document.getElementById('react-root');
        if (reactRoot) {
            setYear(parseInt(reactRoot.getAttribute('data-year'), 10));
            setMonth(parseInt(reactRoot.getAttribute('data-month'), 10));
        }

        const dayInfoElement = document.getElementById('day-info');
        if (dayInfoElement) {
            const dayInfo = JSON.parse(dayInfoElement.textContent) || [];
            setCalendarData(dayInfo.filter(i => i.day !== null));
        }
    }, []);

    // ユーザ名を取得（初回マウント時のみ）
    useEffect(() => {
        const fetchUsername = async () => {
            try {
                const response = await fetch('/taskmanage/api/get_username/');
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                setUsername(data.username);
            } catch (error) {
                console.error('Error fetching username:', error);
            }
        };
        fetchUsername();
    }, []);

    // DBへデータ送信
    async function savingData(formData) {
        try {
            const response = await fetch('/taskmanage/save-study-time/', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });
            const data = await response.json();
            console.log("Server response:", data);
        } catch (error) {
            console.error("Error saving task:", error);
        }
    }

    // フォーム送信時にデータを保存
    const handleSubmit = async (event) => {
        event.preventDefault();
        event.stopPropagation();

        const formData = new FormData(event.target);
        const timeDate = formData.get("date");
        const targetDate = new Date(timeDate);
        const onlyDay = targetDate.getDate();

        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(onlyDay).padStart(2, '0')}`;
        const studyTime = formData.get("study-time") || "00:00";

        const confirmedFormData = {
            user: username,
            date: formattedDate,
            study_time: studyTime,
        };

        console.log("confirmedFormData:", confirmedFormData);
        await savingData(confirmedFormData);
    };

    // 入力変更時に即時更新
    const handleInputChange = (day, newTime) => {
        setCalendarData(prevData =>
            prevData.map(item =>
                item.day === day ? { ...item, study_time: newTime } : item
            )
        );
        saveStudyTime(day, newTime);
    };

    // フォーカスが外れたときに即時保存
    const handleBlur = (day, studyTime) => {
        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        const confirmedFormData = {
            user: username,
            date: formattedDate,
            study_time: studyTime || "00:00",
        };

        savingData(confirmedFormData); // 既存の関数を使用
    };

    return (
        <div className="content-wrapper">
            <div className="calendar-wrapper">
                {/* カレンダーの見出し */}
                <div className="calendar-header">
                    <div className="header-item">日付</div>
                    <div className="header-item">曜日</div>
                    <div className="header-item">勉強時間</div>
                </div>

                {/* カレンダー本体 */}
                <div className="calendar-container">
                    {calendarData.map(info => (
                        <div key={info.day}
                            className={`calendar-day 
                                ${info.is_holiday ? 'holiday' : ''} 
                                ${info.weekday === "日" ? 'sunday' : ''} 
                                ${info.weekday === "土" ? 'saturday' : ''}`}>
                            {/* 祝日名の表示 */}
                            <div className="date">
                                {info.day}
                                {info.is_holiday && <span> ({info.holiday_name})</span>}
                            </div>
                            <div className="weekday">{info.weekday}</div>
                            <input
                                type="text"
                                className={`time-input ${info.study_time === "00:00" ? "time-zero" : ""}`}
                                value={info.study_time}
                                onChange={(e) => handleInputChange(info.day, e.target.value)}
                                onBlur={(e) => handleBlur(info.day, e.target.value)} // フォーカスが外れたら保存
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* グラフ部分 */}
            <div className="chart-container" id="studyTimeChart-container">
                <div className="graphTitle">勉強時間の推移</div>
                <canvas id="studyTimeChart"></canvas>
            </div>
            <div className="chart-container" id="totalStudyTimeChart-container">
                <div className="graphTitle">累計勉強時間の推移</div>
                <canvas id="totalStudyTimeChart"></canvas>
            </div>

            {/* フォーム部分 */}
            <div id="timeFormForDesign">
                <form id="timeForm" onSubmit={handleSubmit}>
                    <input type="hidden" id="timeFormDate" name="date" />
                    <textarea id="timeInput" name="study-time" placeholder="時間を入力"></textarea>
                    <button type="submit">保存</button>
                    <button type="button" id="cancelButton">キャンセル</button>
                </form>
            </div>
        </div>
    );
};

export default Calendar;
