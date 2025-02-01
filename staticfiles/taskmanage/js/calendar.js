// DOMが完全に読み込まれてから実行
document.addEventListener("DOMContentLoaded", () => {
    let currentYear = djangoData.year;
    let currentMonth = djangoData.month;
    let isLoading = false;

    const SaveTasksURL = "/taskmanage/save-tasks/"
    const SaveValueChangeURL = "/taskmanage/save-value-change/"

    const taskFormForDesign = document.getElementById("taskFormForDesign");
    const taskForm = document.getElementById("taskForm");    
    const cancelButton = document.getElementById("cancelButton");
    const calendarContainer = document.querySelector(".calendar-container");  // カレンダー全体

    // taskStates: 年月日、タスク、チェックを一括管理
    // 構造 {`${formattedDate}-${task.task}`: checkbox.checked, }
    const taskStates = {};

    // jsonData管理用
    const INFOs = { dataFromDB: {} };

    // ◆スクロール◆
    calendarContainer.addEventListener("wheel", async function (event) {
        if (isLoading) return; // 二重リクエストを防止
        const delta = event.deltaY; // スクロールの方向
        
        if (delta > 0) {
            // 下方向スクロール: 次月
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        } else if (delta < 0) {
            // 上方向スクロール: 前月
            currentMonth--;
            if (currentMonth < 1) {
                currentMonth = 12;
                currentYear--;
            }
        } else {
            return; // スクロールが水平または無効の場合は無視
        }
        isLoading = true;
        await updateCalendar(currentYear, currentMonth);
        isLoading = false;
    });

    // 下のURLで年月ごとのデータをjsonデータで取得、views.pyのCalendarViewクラスより
    // 構造 { 'year':~, 'month':~, 'calendar_days':[{"day": ~,  "is_holiday": ~, "holiday_name": ~, "tasks": ["task": ~, "is_checked: ~"]}, {~}] } 
    // view_type："tasks-render"、"tasks-json"、"t"ime-record"
    async function getCalendarDataView(view_type) {
        const cache_buster = new Date().getTime();
        const calendarDataURL = `/taskmanage/calendar/?year=${currentYear}&month=${currentMonth}&view=${view_type}&_=${cache_buster}`

        const response = await fetch(calendarDataURL, { cache: "no-store" });
        const jsonResponse = await response.json();
        console.log("jsonResponse:", jsonResponse)
        INFOs.dataFromDB = jsonResponse;        
        return INFOs
    }

    // ◆DBからjson形式のデータ受取＋カレンダー更新◆
    // 非同期関数はawaitを使わないと戻り値を取得できない
    async function updateCalendar(currentYear, currentMonth) {
    // async：非同期を含む、fetch、response.json()：非同期
        await getCalendarDataView("tasks-json");

        const jsonData = INFOs.dataFromDB

        const calendarTable = document.querySelector(".calendar tbody");
        const calendarTitle = document.getElementById("calendar-title");
        const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(jsonData.day).padStart(2, '0')}`;

        console.log("jsonData:", jsonData)

        calendarTitle.textContent = `${currentYear}年 ${currentMonth}月`; // カレンダーのタイトルを更新
        calendarTable.innerHTML = "";  // カレンダーの内容をクリア        

        let row = document.createElement("tr");
        jsonData.calendar_days.forEach((jsonData, index) => {
            if (index % 7 === 0 && index !== 0) {
                calendarTable.appendChild(row);
                row = document.createElement("tr");
            }

            const tdElement = document.createElement("td");
            if (jsonData.day) {
                tdElement.innerHTML = `<div class="date">${jsonData.day}</div>`;
                // 土日祝日
                if (index % 7 === 0) {
                    tdElement.classList.add("sunday");
                }
                if ((index + 1) % 7 === 0) {
                    tdElement.classList.add("saturday");
                }                
                if (jsonData.is_holiday && jsonData.holiday_name) {
                    tdElement.classList.add("holiday");
                    const holidayDiv = document.createElement("div");
                    holidayDiv.className = "holiday-name";
                    holidayDiv.textContent = jsonData.holiday_name;
                    tdElement.appendChild(holidayDiv);
                }

                // タスク追加
                if (Array.isArray(jsonData.tasks) && jsonData.tasks.length > 0) {
                    const taskList = createTaskList(jsonData.tasks, formattedDate)
                    tdElement.appendChild(taskList); // タスクリストをセルに追加                                      
                }                
                
            } else {
                tdElement.innerHTML = "&nbsp;"; // 空白セル
            }
            row.appendChild(tdElement);
        });
        calendarTable.appendChild(row);

        manageForm();
    }

    // ◆DBへデータ送信・保存◆
    // saveTaskUrl: タスク保存するためのDjangoテンプレURL
    // 送るデータはデータベースの型、キー：date, task, is_changed
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

    // ◆入力されたタスクをリスト化、DBに保存（submit:保存ボタン）◆
    // formDataの構造は {"date":~~, "tasks":[{"task":~~, "is_checked":~~}]}
    taskForm.addEventListener("submit", taskFormSubmit);

    async function taskFormSubmit(event) {
        event.preventDefault();  // デフォルトのフォーム送信動作をキャンセル

        // 最終的にDBに送信するのはformData2、thisはid: taskForm（入力フォーム）の要素すべて（submitで受け取ったid=taskForm部分）
        // 「FormData」はjsの組込メソッド。構造は(htmlのname属性：value)
        const formData = new FormData(this);

        const taskDate = formData.get("date");
        const targetDate = new Date(taskDate); // 文字列から日付に変換（ただし、形式は以下 Thu Jan 02 2025 09:00:00 GMT+0900 (GMT+09:00)）
        const itsDay = targetDate.getDate();  // getDate(): 日だけを返す
        const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(itsDay).padStart(2, '0')}`;

        const taskContent = formData.get("task");

        // .filterは条件に合う要素だけを返す、indexは検証中の値
        if (taskContent.includes("\n"));
            const eachTasks = taskContent.split("\n")
            .map(task => task.trim())
            .filter(task => task !== "");
            const duplicates = eachTasks.filter(
                (item, index) => eachTasks.indexOf(item) !== index
            );
            if (duplicates.length > 0) {
                alert(`同じタスクは登録できません。表現方法を変えてください。`);
                return
            }

        console.log("targetDate:", formattedDate);
        console.log("taskContent:", taskContent);

        let judgeCheck = false;

        // htmlからチェック状況の把握
        const divElements = Array.from(document.querySelectorAll('.date'));
        divElements.forEach(function(divElement) {
            if (divElement.textContent == itsDay) {                               
                const ulElement = divElement.nextElementSibling;
                if (ulElement !== null) {
                    console.log("ulElement:", ulElement);
                    const liElement = ulElement.firstElementChild;
                    const inputElement = liElement.firstElementChild;
                    console.log("ulElement:", ulElement);
                    console.log("liElement:", liElement);
                    console.log("inputElement:", inputElement);
                    judgeCheck = inputElement.checked
                } else {
                    createTaskList(taskContent, formattedDate)
                }                    
            }         
        });
        
        const formData2 = {
            "date": formattedDate,
            "task": taskContent,
            "is_checked": judgeCheck
        };
        console.log(JSON.stringify(formData2))

        isLoading = true; 
        await savingData(formData2, SaveTasksURL); 
        await updateCalendar(currentYear, currentMonth);
        isLoading = false;  
        
        taskFormForDesign.style.display = "none";   
    }

    // ◆タスクが無い日付に新しく登録、<ul>以降◆
    // tasks=[{task:"~", is_checked:"~"},{}]、単体のタスク(tasks="A")どちらも対応
    function createTaskList(tasks, formattedDate) {
        const ulElement = document.createElement("ul");
        if (!Array.isArray(tasks)) {
            return document.createElement("ul"); // 空の<ul>を返す
        }
        tasks.forEach((task, index) => {
            const taskItem = document.createElement("li");
            taskItem.id = `task-${index + 1}`;

            const checkbox = document.createElement("input");
            const taskLabel = document.createElement("span");

            checkbox.type = "checkbox";
            checkbox.setAttribute("name", "checking")
            checkbox.classList.add("task-checkbox");
            // チェック状態をグローバルオブジェクトから取得（デフォルトはtask.is_checked）
            // taskStates = {`${formattedDate}-${task.task}`: checkbox.checked, }
            const taskKey = `${formattedDate}-${task.task}`;
            checkbox.checked = taskStates[taskKey] !== undefined ? taskStates[taskKey] : task.is_checked;
            // チェック状態を保存
            checkbox.addEventListener("change", () => {
                taskStates[taskKey] = checkbox.checked;
            });

            taskLabel.textContent = task.task || "No task";
            
            taskItem.appendChild(checkbox);
            taskItem.appendChild(taskLabel);
            ulElement.appendChild(taskItem);         
        });
        return ulElement;
    }  
    
    // ◆フォーム管理◆
    function manageForm() {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        const tdElement = document.querySelectorAll(".calendar td")
        
        checkboxes.forEach(theCheckbox => {
            theCheckbox.addEventListener('change', manageCheckbox);
        });

        // チェックボックスのクリック状況保存
        async function manageCheckbox(event) {
            await getCalendarDataView("tasks-json");
            const jsonData = INFOs.dataFromDB;
            console.log("jsonData:", jsonData);         

            // .target: イベントが発生した要素
            const closestTD = event.target.closest("td");  // 最も近い<td>
            const liElements = closestTD.querySelectorAll("li");            

            const day = closestTD.querySelector(".date").textContent.trim();  // 日付だけ抜き出し
            const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const closestLI = event.target.closest("li");
            console.log("closestLI.id:", closestLI.id);
            const taskContent = closestLI.querySelector("span").textContent.trim();
            const isChecked = event.target.checked;

            console.log("taskContent:", taskContent);
            console.log("チェック状況:", isChecked);

            const formData = {
                "date": formattedDate,
                "task": taskContent,
                "is_checked": isChecked
            };
            console.log(JSON.stringify(formData));
        
            savingData(formData, SaveValueChangeURL);
            countCheck();
        }        

        // 外側をクリックしたら非表示
        function eliminateForm(action) {
            if (!taskFormForDesign.contains(action.target)) {
                // フォームを非表示にして位置とスタイルをリセット
                taskFormForDesign.style.display = "none";
            }
        }
        document.addEventListener("click", eliminateForm);

        // フォームをキャンセル
        function cancelForm() {
            taskForm.reset(); // フォームの内容をリセット
            taskFormForDesign.style.display = "none"; // フォームを非表示
        }
        cancelButton.addEventListener("click", cancelForm);
        
        // 日付セルをクリックで生成        
        tdElement.forEach(tdElement => {
            tdElement.addEventListener("dblclick", createForm);

            function createForm(event) {
                const dayElement = this.querySelector(".date");
                if (!dayElement) return;

                const day = dayElement.textContent.trim();
                const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                document.getElementById("taskDate").value = formattedDate;

                const existingTasks = this.querySelectorAll("ul li");
                const taskInput = document.getElementById("taskInput");
                
                console.log("Selected date:", formattedDate);                

                // 既存のタスクを取得してフォームに表示
                if (existingTasks.length > 0) {
                    taskInput.value = Array.from(existingTasks)
                        .map(task => task.textContent.trim())
                        .filter(task => task !== "")
                        .join("\n");
                } else {
                    taskInput.value = ""; // タスクがない場合は空
                }

                // viewport(画面)の端から要素までの距離を取得できる
                const rect = this.getBoundingClientRect();

                // フォームをクリックされた日付の近くに表示                
                taskFormForDesign.style.left = `${rect.left}px`;
                taskFormForDesign.style.top = `${rect.bottom + window.scrollY}px`;
                taskFormForDesign.style.display = "block";

                taskInput.focus();

                event.stopPropagation();  // イベントの伝播を防止
            }
        });
    }

    // タスク数集計（開発中）
    async function countCheck() {
        await getCalendarDataView("tasks-json");
        const jsonData = INFOs.dataFromDB

        const trueCount = jsonData.true_count
        const divElement = document.getElementById("countCheck")
        console.log("divElement:", divElement);
        console.log("trueCount:", trueCount);

        divElement.textContent = trueCount
    }

    // 初期ロード時にイベントリスナーを設定
    manageForm();
});