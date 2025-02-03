// DOMが完全に読み込まれてから実行
document.addEventListener("DOMContentLoaded", manageAll);

function manageAll() {
    let currentYear = djangoData.year;
    let currentMonth = djangoData.month;
    let isLoading = false;

    const taskFormForDesign = document.getElementById("taskFormForDesign");
    const taskForm = document.getElementById("taskForm");
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const cancelButton = document.getElementById("cancelButton");
    const calendarContainer = document.querySelector(".calendar-container");  // カレンダー全体

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
        await apdateCalendar(currentYear, currentMonth);
        isLoading = false;      
    });

    // ◆DBからjson形式のデータ受取＋カレンダー更新◆
    // 非同期関数はawaitを使わないと戻り値を取得できない
    // async：非同期を含む、fetch、response.json()：非同期
    async function apdateCalendar(currentYear, currentMonth){
        // 下のURLに年月ごとのデータが格納、それをjsonデータで取得
        const response = await fetch(`/taskmanage/calendar-data/?year=${currentYear}&month=${currentMonth}`);
        const jsonData = await response.json();
        // ↑めちゃくちゃ大事

        const calendarTable = document.querySelector(".calendar tbody");
        const calendarTitle = document.getElementById("calendar-title");

        calendarTitle.textContent = `${jsonData.year}年 ${jsonData.month}月`; // カレンダーのタイトルを更新       
        calendarTable.innerHTML = "";  // カレンダーの内容をクリア

        let row = document.createElement("tr");
        jsonData.calendar_days.forEach((jsonData, index) => {
            if (index % 7 === 0 && index !== 0) {
                calendarTable.appendChild(row);
                row = document.createElement("tr");
            }

            const tdElement = document.createElement("td");

            if (jsonData.day) {
                const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(jsonData.day).padStart(2, '0')}`;

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

        return jsonData
    }

    // ◆DBへデータ送信・保存◆
    // saveTaskUrl: タスク保存するためのDjangoテンプレURL
    // 送るデータはデータベースの型に合わせる
    function savingData(formData){
        fetch('/taskmanage/save-task/', {
            method: "POST",
            body: JSON.stringify(formData),
            headers: {
                'Content-Type': 'application/json',
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
    // formDataの構造は {"date":~~, "tasks":[{"task":~~, "is_checked":~~}]}
    // ↑だが、バックエンドではキー: date, task, is_checkedを期待  
    taskForm.addEventListener("submit", taskFormSubmit);

    async function taskFormSubmit(event) {
        event.preventDefault();  // デフォルトのフォーム送信動作をキャンセル

        // formDataをDBに送信、thisはid: taskForm（入力フォーム）の要素すべて
        // 「FormData」はjsの組込メソッド。submitで受け取ったid=taskForm部分。構造は(htmlのname属性：value)
        const formData = new FormData(this);

        const taskDate = formData.get("date");
        const targetDate = new Date(taskDate); // 文字列から日付に変換（ただし、形式は以下 Thu Jan 02 2025 09:00:00 GMT+0900 (GMT+09:00)）
        const itsDay = targetDate.getDate();  // getDate(): 日だけを返す
        const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(itsDay).padStart(2, '0')}`;

        const taskContent = formData.get("task");        

        console.log("targetDate:", formattedDate);
        console.log("taskContent:", taskContent);

        let judgeCheck = false;

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
        
        let formData2 = {
            "date": formattedDate,
            "task": taskContent,
            "is_checked": judgeCheck
        };
        console.log(JSON.stringify(formData2))

        await savingData(formData2) 
        
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

        
        // DBに送信後、html構造を更新
        const tdElement = document.querySelectorAll(".calendar td")

        divElements.forEach(function(divElement) {
            if (divElement.textContent == itsDay) {
                let theList = [];

                const ulElement = divElement.nextElementSibling;
                const liElement = ulElement.firstElementChild;
                const inputElement = liElement.firstElementChild;

                const processedTaskContent = taskContent.split("\n")
                    .map(task => task.trim()).filter(task => task !== "")

                if (processedTaskContent.length === 0) {
                    return;
                }
                
                // タスクリスト作成                
                theList.push({task: processedTaskContent})
                ulElement = createTaskList(theList, formattedDate)

                tdElement.appendChild(ulElement);  // html構造を<td>内に挿入、即時反映       
            }         
        });
        taskFormForDesign.style.display = "none";   
    }

    // ◆タスクが無い日付に新しく登録◆ tasks: 配列["~~~","~~~"]、単体のタスクどちらも対応
    function createTaskList(tasks, formattedDate) {
        const ulElement = document.createElement("ul");
        if (!Array.isArray(tasks)) {
            return document.createElement("ul"); // 空の<ul>を返す
        }
        tasks.forEach(task => {
            const taskItem = document.createElement("li");           
            const checkbox = document.createElement("input");
            const taskLabel = document.createElement("span");

            checkbox.type = "checkbox";
            checkbox.classList.add("task-checkbox");
            // チェック状態をグローバルオブジェクトから取得（デフォルトはtask.is_checked）
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
        const tdElement = document.querySelectorAll(".calendar td")
        
        checkboxes.forEach(theCheckbox => {
            theCheckbox.addEventListener('change', manageCheckbox);
        });

        // チェックボックスのクリック状況保存、死んでるかも
        function manageCheckbox(event) {
            // .target: イベントが発生した要素
            const closestTD = event.target.closest("td");  // 最も近い<td>
            const day = closestTD.querySelector(".date").textContent.trim();  // class=date
            const formattedDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const closestLI = event.target.closest("li");
            const taskContent = closestLI.querySelector("span").textContent.trim();

            const isChecked = event.target.checked;
            console.log("チェック状況:", isChecked);

            let formData = {
                "date": formattedDate,
                "task": taskContent,
                "is_checked": isChecked
            };
            console.log(JSON.stringify(formData))
        
            savingData(formData);
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

            function createForm(action) {
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
                taskFormForDesign.style.left = `${rect.left}px`;
                taskFormForDesign.style.top = `${rect.bottom + window.scrollY}px`;
                taskFormForDesign.style.position = "absolute";
                taskFormForDesign.style.display = "block";

                taskInput.focus();

                action.stopPropagation();
            }
        });
    }

    // 初期ロード時にイベントリスナーを設定
    manageForm();
}