import React from 'react';
import ReactDOM from 'react-dom/client';
import Calendar from './components/react_time_record';

document.addEventListener('DOMContentLoaded', () => {    
    const reactRoot = document.getElementById('react-root');

    if (reactRoot) {
        const year = parseInt(reactRoot.getAttribute('data-year'), 10);
        const month = parseInt(reactRoot.getAttribute('data-month'), 10);

        const dayInfoElement = document.getElementById('day-info');        
        const dayInfo = dayInfoElement ? JSON.parse(dayInfoElement.textContent) : [];
        const filteredDayInfo = dayInfo.filter(i => i.day !== null);

        console.log("Loaded Django data:", { dayInfo, year, month });
        console.log("filteredDayInfo:", { filteredDayInfo, year, month });

        const root = ReactDOM.createRoot(reactRoot);
        root.render(
            <React.StrictMode>
                <Calendar initialData={filteredDayInfo} year={year} month={month} />
            </React.StrictMode>
        );
    } else {
        console.error("React root element not found.");
    }
});
