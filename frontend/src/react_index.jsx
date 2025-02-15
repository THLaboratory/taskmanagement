import React from 'react';
import ReactDOM from 'react-dom/client';
import Calendar from './components/react_time_record';

document.addEventListener('DOMContentLoaded', () => {
    async function initializeReact() {
        const reactRoot = document.getElementById('react-root');

        if (reactRoot) {
            const year = parseInt(reactRoot.getAttribute('data-year'), 10);
            const month = parseInt(reactRoot.getAttribute('data-month'), 10);

            const dayInfoElement = document.getElementById('day-info');        
            const dayInfo = dayInfoElement ? JSON.parse(dayInfoElement.textContent) : [];
            const filteredDayInfo = dayInfo.filter(i => i.day !== null);

            console.log("Loaded Django data:", { dayInfo, year, month });
            console.log("filteredDayInfo:", { filteredDayInfo, year, month });

            // ◆ユーザー名取得◆
            const fetchUsername = async () => {
                try {
                    const response = await fetch('/taskmanage/api/get_username/');
                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                    const data = await response.json();
                    return data.username;
                } catch (error) {
                    console.error('Error fetching username:', error);
                    return "";
                }
            };

            // ◆すべての勉強データを取得◆
            const fetchAllStudyData = async () => {
                try {
                    const response = await fetch('/taskmanage/api/get-all-study-time/');
                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                    return await response.json();
                } catch (error) {
                    console.error('Error fetching all study data:', error);
                    return [];
                }
            };

            const [username, allStudyData] = await Promise.all([fetchUsername(), fetchAllStudyData()]);

            const root = ReactDOM.createRoot(reactRoot);
            root.render(
                <React.StrictMode>
                    <Calendar 
                        initialData={filteredDayInfo}
                        allStudyData={allStudyData}
                        year={year}
                        month={month}
                        username={username}
                    />
                </React.StrictMode>
            );
        } else {
            console.error("React root element not found.");
        }
    }
    initializeReact();
});
