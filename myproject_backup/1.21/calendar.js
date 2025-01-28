document.addEventListener("DOMContentLoaded", function () {
    let currentYear = djangoData.year;
    let currentMonth = djangoData.month;
    let isLoading = false;

    const theTaskForm = document.getElementById("task-form");
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const cancelButton = document.getElementById("cancelButton");
    const calendarContainer = document.querySelector(".calendar-container");

    const taskStates = {};

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
        await receiveData(currentYear, currentMonth);
        isLoading = false;      
    });

    // ◆DBからjson形式のデータ受取＋カレンダー更新◆
    // 非同期関数はawaitを使わないと戻り値を取得できない
    // async：非同期を含む、fetch、response.json()：非同期
    async function receiveData(currentYear, currentMonth){
        const response = await fetch(`/taskmanage/calendar-data/?year=${currentYear}&month=${currentMonth}`);
        if (!response.ok) throw new Error("Failed to fetch calendar data");
        const data = await response.json();
        updateCalendar(data);
        return data
    }

    // ◆DBへデータ送信・保存◆
    function savingData(DATA){
        fetch(djangoData.saveTaskUrl, {
            method: "POST",
            body: DATA,
            headers: {
                "X-CSRFToken": document.querySelector('[name=csrfmiddlewaretoken]').value
            }
        })
            .then(response => response.json())
            .then(data => {
                console.log("Server response:", data);
            })
            .catch(error => {
                console.error("Error saving task:", error);
            })
    }

    // ◆入力されたタスクをリスト化、DBに保存（submit:保存ボタン）◆
    // formDataの構造は {"date":~~, "tasks":[{"content":~~, "is_checked":~~}]}
    // tdElementはhtml構造（<td>より内部）
    document.getElementById("taskForm").addEventListener("submit", async function (e) {
        e.preventDefault(); // デフォルトのフォーム送信動作をキャンセル
    
        // formDataをDBに送信、thisはid: taskForm（入力フォーム）の要素すべて
        // 「FormData」はjsの組込メソッド。構造は(htmlのname属性：value)、リストなどと異なる特殊なデータ構造
        const formData = new FormData(this);
        await savingData(formData)

        const taskDate = formData.get("date");
        const taskContent = formData.get("task");
        const targetDate = new Date(taskDate); // 文字列から日付に変換
        const itsDay = targetDate.getDate();  // getDate(): 日付を返す
  
        console.log("Form submitted with:", { date: taskDate, task: taskContent });
        
        // html構造を更新
        // taskList: taskが存在する<ul>以下の要素、tdElement: html要素
        document.querySelectorAll(".calendar td").forEach(tdElement => {
            const dayElement = tdElement.querySelector(".date");
            if (dayElement && parseInt(dayElement.textContent, 10) === itsDay) {
                const day = dayElement.textContent.trim();
                const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                const theList = [];

                let taskList = tdElement.querySelector("ul");

                const processedTaskContent = taskContent.split("\n")
                    .map(task => task.trim()).filter(task => task !== "")

                // タスクが無ければ<ul>削除（=チェックボックス削除）
                if (processedTaskContent.length === 0) {
                    return;
                }

                // タスクリスト作成                
                theList.push({content: processedTaskContent})

                taskList = createTaskList(theList, formattedDate)

                tdElement.appendChild(taskList);  // html構造を<td>内に挿入、即時反映       
            }
        });
        theTaskForm.style.display = "none";   
    });

    // ◆タスクリスト作成◆ tasks: DBのデータ    
    function createTaskList(tasks, formattedDate) {
        const taskList = document.createElement("ul");
        if (!Array.isArray(tasks)) {
            console.error("Error: tasks is not an array");
            return document.createElement("ul"); // 空の<ul>を返す
        }
        tasks.forEach(task => {
            const taskItem = document.createElement("li");           
            const checkbox = document.createElement("input");
            const taskLabel = document.createElement("span");

            checkbox.type = "checkbox";
            checkbox.classList.add("task-checkbox");
            // チェック状態をグローバルオブジェクトから取得（デフォルトはtask.is_checked）
            const taskKey = `${formattedDate}-${task.content}`;
            checkbox.checked = taskStates[taskKey] !== undefined ? taskStates[taskKey] : task.is_checked;
            // チェック状態を保存
            checkbox.addEventListener("change", () => {
                taskStates[taskKey] = checkbox.checked;
            });

            taskLabel.textContent = task.content || "No content";
            
            taskItem.appendChild(checkbox);
            taskItem.appendChild(taskLabel);
            taskList.appendChild(taskItem);         
        });
        return taskList;
    }

    // ◆カレンダーを更新する関数（動的）◆
    function updateCalendar(data) {
        const calendarTable = document.querySelector(".calendar tbody");
        const calendarTitle = document.getElementById("calendar-title");

        calendarTitle.textContent = `${data.year}年 ${data.month}月`; // カレンダーのタイトルを更新       
        calendarTable.innerHTML = "";  // カレンダーの内容をクリア

        let row = document.createElement("tr");
        data.calendar_days.forEach((cal_data, index) => {
            if (index % 7 === 0 && index !== 0) {
                calendarTable.appendChild(row);
                row = document.createElement("tr");
            }

            const cell = document.createElement("td");

            if (cal_data.day) {
                const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(cal_data.day).padStart(2, '0')}`;

                cell.innerHTML = `<div class="date">${cal_data.day}</div>`;
                // 土日祝日
                if (index % 7 === 0) {
                    cell.classList.add("sunday");
                }
                if ((index + 1) % 7 === 0) {
                    cell.classList.add("saturday");
                }                
                if (cal_data.is_holiday && cal_data.holiday_name) {
                    cell.classList.add("holiday");
                    const holidayDiv = document.createElement("div");
                    holidayDiv.className = "holiday-name";
                    holidayDiv.textContent = cal_data.holiday_name;
                    cell.appendChild(holidayDiv);
                }

                // タスク追加
                if (Array.isArray(cal_data.tasks) && cal_data.tasks.length > 0) {
                    const taskList = createTaskList(cal_data.tasks, formattedDate)
                    cell.appendChild(taskList); // タスクリストをセルに追加                                      
                }                
                
            } else {
                cell.innerHTML = "&nbsp;"; // 空白セル
            }
            row.appendChild(cell);
        });
        calendarTable.appendChild(row);

        managementForm();
    }    
    
    // ◆フォーム管理◆
    function managementForm() {
        // ◆チェックボックスのクリックイベント◆        
        checkboxes.forEach(theCheckbox => {
            theCheckbox.addEventListener('change', (event) => {
                const formData = new FormData();

                // チェック状態を取得：true/false            
                const isChecked = event.target.checked;   
                // クリックから最も近い<td>を特定           
                const tdElement = event.target.closest("td");
                // <td>内の<div class="date">を取得             
                const dayElement = tdElement.querySelector(".date");
                const day = dayElement.textContent.trim();
                const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                // チェックボックスのタスク内容を取得
                const liElement = event.target.closest("li");
                const taskContentElement = liElement.querySelector("span");
                const taskContent = taskContentElement.textContent.trim();

                formData.append("date", formattedDate);
                formData.append("task", taskContent);
                formData.append("is_checked", isChecked);

                savingData(formData)
            });
        });

        // 外側をクリックしたら非表示
        document.addEventListener("click", function (action) {
            if (!theTaskForm.contains(action.target)) {
                // フォームを非表示にして位置とスタイルをリセット
                theTaskForm.style.display = "none";
            }
        });

        // キャンセルボタン
        cancelButton.addEventListener("click", function () {
            taskForm.reset(); // フォームの内容をリセット
            theTaskForm.style.display = "none"; // フォームを非表示
        });
        
        // 日付セルをクリックで生成
        document.querySelectorAll(".calendar td").forEach(tdElement => {
            tdElement.addEventListener("dblclick", function (action) {
                const dayElement = this.querySelector(".date");
                if (!dayElement) return;

                const day = dayElement.textContent.trim();
                const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                document.getElementById("taskDate").value = formattedDate;

                const existingTasks = this.querySelectorAll("ul li");
                const taskInput = document.getElementById("taskInput");

                const rect = this.getBoundingClientRect();
                
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

                // フォームをクリックされた日付の近くに表示                
                theTaskForm.style.left = `${rect.left}px`;
                theTaskForm.style.top = `${rect.bottom + window.scrollY}px`;
                theTaskForm.style.position = "absolute";
                theTaskForm.style.display = "block";

                taskInput.focus();

                action.stopPropagation();
            });
        });
    }

    // 初期ロード時にイベントリスナーを設定
    managementForm();
});
