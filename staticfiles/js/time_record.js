// DOMが完全に読み込まれてから実行
document.addEventListener("DOMContentLoaded", () => {
    let currentYear = djangoData.year;
    let currentMonth = djangoData.month;
    let isLoading = false;

    // キー：day, study_time
    const day_info_and_records = djangoData.day_info_and_records;

    const timeFormForDesign = document.getElementById("timeFormForDesign");
    const timeElement = document.querySelectorAll(".calendar-day");
    const timeForm = document.getElementById("timeForm");
    const timeFormDate = document.getElementById("timeFormDate");

    const SaveStudyTimeURL = "/taskmanage/save-study-time/"

    // jsonData管理用
    const INFOs = { dataFromDB: {} };

    timeElement.forEach(timeElement => {
        // ◆ダブルクリックでフォーム生成◆
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
    // 送るデータはデータベースの型、キー：date, study_time
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

    // 下のURLで年月ごとのデータをjsonデータで取得、views.pyのRecordsViewクラスより
    // 構造 { 'year':~, 'month':~, 'day_info_and_records':[{"day": ~,  "is_holiday": ~, "holiday_name": ~, "study_time":~}, {~}] } 
    // view_type："records-json"、None
    async function getRecordsView(view_type) {
        const cache_buster = new Date().getTime();
        const getRecordsURL = `/taskmanage/records-view/?year=${currentYear}&month=${currentMonth}&view=${view_type}&_=${cache_buster}`

        const response = await fetch(getRecordsURL, { cache: "no-store" });
        const jsonResponse = await response.json();
        console.log("jsonResponse:", jsonResponse)
        INFOs.dataFromDB = jsonResponse;        
        return INFOs
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
        console.log("studyTime:", studyTime)

        const timeInputElement = document.getElementsByName(`time_${onlyDay}`);
        timeInputElement.textContent = studyTime
        console.log("timeInputElement.textContent:", timeInputElement.textContent)

        const confirmedFormData = {
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
});