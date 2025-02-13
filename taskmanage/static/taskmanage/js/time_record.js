// DOMが完全に読み込まれてから実行
document.addEventListener("DOMContentLoaded", () => {
    let currentYear = Number(djangoData.year);  // djangoData.yearはもともと文字列
    let currentMonth = Number(djangoData.month);
    let isLoading = false;

    const now = new Date();  // 今日の日付を取得

    const timeFormForDesign = document.getElementById("timeFormForDesign");
    const timeElement = document.querySelectorAll(".calendar-day");
    const timeForm = document.getElementById("timeForm");
    const timeFormDate = document.getElementById("timeFormDate");

    const prevMonthButton = document.getElementById("prevMonth");
    const nextMonthButton = document.getElementById("nextMonth");

    const SaveStudyTimeURL = "/taskmanage/save-study-time/"

    // jsonData管理用
    const INFOs = { thisMonthDataFromDB: [], allDataFromDB: [] };

    // ◆カレンダー更新◆
    function updateCalendar(year, month) {
        const newURL = `/taskmanage/records-view/?year=${year}&month=${month}`;
        window.location.href = newURL;
    }

    // ◆ボタンを押したら、カレンダーを更新◆
    prevMonthButton.addEventListener("click", () => {
        if (currentMonth === 1) {
            currentYear--;
            currentMonth = 12;
        } else {
            currentMonth--;
        }
        updateCalendar(currentYear, currentMonth);
    });
    nextMonthButton.addEventListener("click", () => {
        if (currentMonth === 12) {
            currentYear++;
            currentMonth = 1;
        } else {
            currentMonth++;
        }
        updateCalendar(currentYear, currentMonth);
    });

    // ◆ダブルクリックでフォーム生成◆
    timeElement.forEach(timeElement => {        
        timeElement.addEventListener("dblclick", createForm);
        function createForm(event) {
            const timeInput = document.getElementById("timeInput");
            timeInput.value = "";

            const rect = this.getBoundingClientRect();

            const dayElement = this.querySelector(".date");
            if (!dayElement) return;
            const day = dayElement.textContent;  // 日にちだけ取得(3日なら 3 )
            const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            timeFormDate.value = formattedDate;  // timeFormに日付をセット
            timeFormForDesign.style.left = `${rect.left+30}px`;
            timeFormForDesign.style.top = `${rect.bottom-30}px`;
            timeFormForDesign.style.display = "block";

            timeInput.focus();

            event.stopPropagation();  // イベントの伝播を防止
        }
    });

    // ◆外側をクリックしたら非表示◆
    document.addEventListener("click", eliminateForm);
    function eliminateForm(event) {
        if (!timeFormForDesign.contains(event.target)) {
            timeFormForDesign.style.display = "none";
        }
    }

    // ◆フォームをキャンセル◆
    cancelButton.addEventListener("click", cancelForm);
    function cancelForm() {
        timeForm.reset(); // フォームの内容をリセット
        timeFormForDesign.style.display = "none"; // フォームを非表示
    }

    // ◆DBへデータ送信・保存◆
    // saveTaskUrl: タスク保存するためのDjangoテンプレURL
    // 送るデータはデータベースの型、キー：user, date, study_time
    async function savingData(formData, URL) {
        try {
            const response = await fetch(URL, {
                method: "POST",
                body: JSON.stringify(formData),
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });    
            const data = await response.json(); // JSON を解析
            console.log("Server response:", data); // サーバーからのレスポンスをログ出力
        } catch (error) {
            console.error("Error saving task:", error); // エラーログ
            throw error; // 呼び出し元にエラーを伝播
        }
    }

    // ◆フォームの保存ボタンの動作◆
    timeForm.addEventListener("submit", timeFormSubmit);
    async function timeFormSubmit(event) {
        event.preventDefault();
        event.stopPropagation();

        const formData = new FormData(this);  // newによってインスタンス化

        const timeDate = formData.get("date");
        const targetDate = new Date(timeDate); // 文字列から日付に変換（ただし、形式は以下 Thu Jan 02 2025 09:00:00 GMT+0900 (GMT+09:00)）
        const onlyDay = targetDate.getDate();  // getDate(): 日だけを返す
        const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(onlyDay).padStart(2, '0')}`;

        const studyTime = formData.get("study-time");
        console.log("studyTime:", studyTime);

        const timeInputElement = document.getElementsByName(`time_${onlyDay}`);
        timeInputElement.textContent = studyTime
        console.log("timeInputElement.textContent:", timeInputElement.textContent)

        const username = getUsername()

        const confirmedFormData = {
            "user": username,
            "date": formattedDate,
            "study_time": studyTime,
        };

        console.log(JSON.stringify(confirmedFormData));

        isLoading = true;
        await savingData(confirmedFormData, SaveStudyTimeURL);
        // await updateCalendar(currentYear, currentMonth);
        isLoading = false;

        timeFormForDesign.style.display = "none";
    }

    // ◆ユーザ名取得◆
    async function getUsername() {
        try {
            const response = await fetch('/taskmanage/api/get_username/');
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            console.log(data.username); // ログインユーザー名
            return data.username;
        } catch (error) {
            console.error('Error:', error);
            return null; // エラー時は `null` を返す
        }
    }

    // ◆下のURLで年月ごとのデータをjsonデータで取得、views.pyのRecordsViewクラスより◆
    // 構造 { 'year':~, 'month':~, 'day_info_and_records':[{"day": ~,  "is_holiday": ~, "holiday_name": ~, "study_time":~}, {~}] } 
    // view_type："records-json"(→json)、None(→render)
    async function getRecordsView(year, month) {
        const cache_buster = new Date().getTime();
        const getRecordsURL = `/taskmanage/records-view/?year=${year}&month=${month}&view=records-json&_=${cache_buster}`

        const response = await fetch(getRecordsURL, { cache: "no-store" });
        const jsonResponse = await response.json();
        INFOs.thisMonthDataFromDB = jsonResponse;
        return INFOs.thisMonthDataFromDB;
    }

    // ◆今日までの全ての勉強データを取得する関数◆
    async function getAllRecordsView() {
        let startYear = 2025;  // 勉強記録を開始した年月（必要なら変更）
        
        const endYear = now.getFullYear();
        const endMonth = now.getMonth() + 1;
        console.log("endYear:", endYear);
        console.log("endMonth:", endMonth);
        const today = new Date(endYear, endMonth, now.getDate());  // getMonth()は0始まりのため+1
        console.log("today:", today);

        INFOs.allDataFromDB = [];  // 初期化

        for (let year = startYear; year <= endYear; year++) {
            for (let month = 1; month <= 12; month++) {
                if (year > endYear || (year === endYear && month > endMonth)) {
                    break;
                }
                try {
                    const jsonResponse = await getRecordsView(year, month);

                    // 今日より後の日付のデータを除外
                    jsonResponse.day_info_and_records = jsonResponse.day_info_and_records.filter(record => {
                        const recordDate = new Date(year, month - 1, record.day);
                        return recordDate <= today;
                    });

                    INFOs.allDataFromDB.push(jsonResponse);
                } catch (error) {
                    console.error(`Error fetching records for ${year}-${month}:`, error);
                }
            }
        }
        return INFOs.allDataFromDB;
    }
    
    // ◆推移グラフの描画◆
    drawChart();
    async function drawChart() {
        // (1)今月のデータだけ取得
        jsonData = await getRecordsView(currentYear, currentMonth);
        console.log("jsonData:", jsonData);

        const jsonDataArray = Object.values(jsonData);
        console.log("jsonDataArray:", jsonDataArray);
        const filteredJsonDataArray = jsonDataArray[0].filter(record => record.day !== null);        

        // グラフ作成用データを準備
        const labels = filteredJsonDataArray.map(record => record.day);  // 今月の日付を配列で取得
        const studyTimes = filteredJsonDataArray.map(record => {
            if (typeof record.study_time === "string") {  // && record.day <= now.getDate()を付けると、1日～今日だけ取得できる
                const [hours, minutes] = record.study_time.split(":").map(Number);
                return hours + minutes / 60; // 時間単位に変換
            }
            return record.study_time; // すでに数値ならそのまま
        });
        console.log("labels:", labels);
        console.log("filteredJsonDataArray:", filteredJsonDataArray);

        // ◆推移グラフ◆
        const ctx = document.getElementById("studyTimeChart").getContext("2d");
        // chart.jsから読み込み、htmlの<script>で記載
        new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Study-time",
                    data: studyTimes,
                    borderColor: "blue",
                    borderWidth: 1,
                    radius: 3,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMin: 0,
                        // ↓...によって配列中の要素を一つずつ渡す
                        suggestedMax: Math.max(...studyTimes)
                    }
                }
            }
        });

        // (2)全期間のデータ取得
        const n = 365;  // n日前からの累計勉強時間【適宜変更】→ 絶対的な時間を指定すべきか？
        const displayDuration = 100; // グラフに表示する期間【適宜変更】
        
        allJsonData = await getAllRecordsView();

        // day_info_and_recordsにyear、monthを付与
        const allJsonDataArray = allJsonData.flatMap(data => 
            data.day_info_and_records.map(record => ({
                ...record,
                year: data.year,
                month: data.month
            }))
        );
        const filteredAllJsonDataArray = allJsonDataArray.filter(data => data.day !== null);
        console.log("filteredAllJsonDataArray:", filteredAllJsonDataArray);

        // 累計勉強時間の計算        
        const startDate = new Date();
        startDate.setDate(now.getDate() - displayDuration); // 何日前のデータまで含めるか

        const specificPeriodStudyData = filteredAllJsonDataArray.filter(record => {
            const recordDateStr = `${record.year}-${String(record.month).padStart(2, '0')}-${String(record.day).padStart(2, '0')}`;
            const recordDate = new Date(recordDateStr);  // Dateオブジェクトに変換
            return recordDate >= startDate;  // startDateと比較
        });

        let totalStudyTime = [];
        let total = 0;
        const allLabels = specificPeriodStudyData.map(record => record.day);
        const allStudyTimes = filteredAllJsonDataArray.map(record => {
            if (typeof record.study_time === "string" || record.study_time === 0) {
                const [hours, minutes] = record.study_time.split(":").map(Number);
                return hours + minutes / 60; // 時間単位に変換
            }
            return record.study_time || 0; // 既に数値ならそのまま
        });        
        allStudyTimes.forEach(st => {
            total += st;
            totalStudyTime.push(total);
        });
        const slicedTotalStudyTime = totalStudyTime.slice(-displayDuration);  // 表示区間だけ取り出す
        console.log("slicedTotalStudyTime:", slicedTotalStudyTime);

        // ◆推移グラフ◆
        const ctx2 = document.getElementById("totalStudyTimeChart").getContext("2d");
        new Chart(ctx2, {
            type: "line",
            data: {
                labels: allLabels,
                datasets: [{
                    label: "Total-study-time",
                    data: slicedTotalStudyTime,
                    borderColor: "red",
                    borderWidth: 2,
                    radius: 0,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        suggestedMin: 0,
                        // ↓...によって配列中の要素を一つずつ渡す
                        suggestedMax: Math.max(...totalStudyTime) + 5
                    }
                }
            }
        });
    }
});