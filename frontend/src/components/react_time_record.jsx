import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

// 引数としてindexからpropsを受け取る
const TimeRecords = ({ initialData, allStudyData, year, month, username }) => {
    const [calendarData, setCalendarData] = useState(initialData);
    const [csrfToken, setCsrfToken] = useState('');
    const [allData, setAllData] = useState(allStudyData);
    const [editingDay, setEditingDay] = useState(null);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (token) {
            setCsrfToken(token);
        }
    }, []);

    // ◆前後の月カレンダーを読み込む◆
    const updateCalendar = (newYear, newMonth) => {
        const newURL = `/taskmanage/records-view/?year=${newYear}&month=${newMonth}`;
        window.location.href = newURL;
    };

    // ◆DBにデータ送信＋保存◆
    async function savingData(formData, day) {
        try {
            const response = await fetch('/taskmanage/save-study-time/', {
                method: 'POST',
                body: JSON.stringify(formData),
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                }
            });
            const data = await response.json();
            console.log("Server response:", data);

            setCalendarData(prevData =>
                prevData.map(item =>
                    item.day === day ? { ...item, study_time: inputValue } : item
                )
            );
            setAllData(prevData =>
                prevData.map(item =>
                    item.date === formData.date ? { ...item, study_time: formData.study_time } : item
                )
            );            
        } catch (error) {
            console.error("Error saving task:", error);
        }
    }

    // ◆画面上の即時更新◆
    useEffect(() => {
        if (editingDay !== null) {
            const studyTime = calendarData.find(item => item.day === editingDay)?.study_time || '00:00';
            const formattedTime = studyTime
                .split(':')
                .map(num => num.padStart(2, '0'))
                .join(':');
                
            setInputValue(formattedTime);
            console.log("formattedTime:", formattedTime);
        }
    }, [editingDay, calendarData]);
    
    // ◆フォーカスが無くなったら保存◆
    const handleBlur = async (day) => {
        if (!inputValue) return;

        // 勉強時間のフォーマット統一（XX:YY）
        const formattedTime = inputValue
            .split(':')
            .map(num => num.padStart(2, '0'))
            .join(':');

        const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const confirmedFormData = {
            user: username,
            date: formattedDate,
            study_time: formattedTime || '00:00',
        };
        
        await savingData(confirmedFormData, day);

        setEditingDay(null);
    };
    
    // ◆Enterでも保存◆
    const handleKeyDown = (event, day) => {
        if (event.key === 'Enter') {
            handleBlur(day);
        }
    };

    // ◆グラフのプロパティ◆
    const options = {
        elements: {
            point: {
                radius: 3,
                hoverRadius: 5,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                    precision: 0
                }
            }
        }
    };

    // ◆グラフ描画◆
    const chartData = {
        labels: calendarData.map(data => data.day),
        datasets: [{
            label: '勉強時間（h）',
            data: calendarData.map(data => {
                const [hours, minutes] = data.study_time.split(':').map(Number);
                return hours + minutes / 60;
            }),
            borderColor: 'blue',
            borderWidth: 1,
            fill: false,
        }]
    };

    const cumulativeData = [];
    let total = 0;
    calendarData.forEach(data => {
        const [hours, minutes] = data.study_time.split(':').map(Number);
        total += hours + minutes / 60;
        cumulativeData.push(total);
    });

    const cumulativeChartData = {
        labels: calendarData.map(data => data.day),
        datasets: [{
            label: '累計勉強時間（h）',
            data: cumulativeData,
            borderColor: 'red',
            borderWidth: 1,
            fill: false,
        }]
    };

    // ◆月の合計勉強時間（画面右下に表示）◆
    const totalStudyTime = calendarData.reduce((total, data) => {
        const [hours, minutes] = data.study_time.split(':').map(Number);
        return total + hours + minutes / 60;
    }, 0);

    // ◆今までの総勉強時間（画面右下に表示）◆
    const totalAllTime = allData.reduce((total, data) => {
        const [hours, minutes] = data.study_time.split(':').map(Number);
        return total + hours + minutes / 60;
    }, 0);

    return (
        <>
            <h1 id="calendar-title">
                <button id="prevMonth" onClick={() => updateCalendar(year, month === 1 ? 12 : month - 1)}>◀</button>
                <span>{year}年 {month}月</span>
                <button id="nextMonth" onClick={() => updateCalendar(year, month === 12 ? 1 : month + 1)}>▶</button>
            </h1>
            <div className="content-wrapper">
                <div className="calendar-wrapper">
                    <div className="calendar-header">
                        <div className="header-item">日付</div>
                        <div className="header-item">曜日</div>
                        <div className="header-item">勉強時間</div>
                    </div>
                    <div className="calendar-container">
                        {calendarData.map(info => (
                            <div key={info.day}
                                className={`calendar-day
                                    ${info.is_holiday ? 'holiday' : ''}
                                    ${info.weekday === "日" ? 'sunday' : ''}
                                    ${info.weekday === "土" ? 'saturday' : ''}`
                                }
                            >
                                <div className="date">{info.day}{info.is_holiday && <span> ({info.holiday_name})</span>}</div>
                                <div className="weekday">{info.weekday}</div>
                                {editingDay === info.day ? (
                                    <input
                                        type="text"
                                        className="time-input"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onBlur={() => handleBlur(info.day)}
                                        onKeyDown={(e) => handleKeyDown(e, info.day)}
                                        autoFocus
                                    />
                                ) : (
                                    <div className={`time-display ${info.study_time === '00:00' ? 'time-zero' : ''}`}
                                        onDoubleClick={() => setEditingDay(info.day)}
                                    >
                                        {info.study_time || '入力'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="chart-container-1">
                    <div className="graphTitle">勉強時間の推移</div>
                    <Line data={chartData} options={options} />
                </div>
                <div className="chart-container-2">
                    <div className="graphTitle">累計勉強時間の推移</div>
                    <Line data={cumulativeChartData} options={options} />
                </div>

                <div className="screen-total-container">
                    <div className='screen-total-time'>
                        今月: {totalStudyTime.toFixed(0)} h
                    </div>
                    <div className='screen-total-all-time'>
                        累計: {totalAllTime.toFixed(0)} h
                    </div>
                </div>
            </div>
        </>
    );
};

export default TimeRecords;