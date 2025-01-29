document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("td").forEach(td => {
        const day = td.textContent.trim();
        // console.log("Processing <td>: ", td, "Content:", day); // デバッグ用ログ
    
        // 有効なセルを確認（空白セルや'noday'クラスをスキップ）
        if (!td.classList.contains("noday") && !isNaN(day) && day !== "") {
            // console.log("Valid day found:", day);
    
            td.addEventListener("click", function () {
                const year = 2025;
                const month = 1;
                const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                document.getElementById("taskDate").value = date;
                document.getElementById("task-form").style.display = "block";
                // console.log("Selected date:", date);
            });
        } else {
            // console.warn("Skipping invalid day:", day, "Class:", td.className);
        }
    });
    
    document.getElementById("taskForm").addEventListener("submit", function (e) {
        e.preventDefault();
        console.log("Form submission intercepted."); // フォーム送信イベントを確認
    
        // フォームデータを取得して確認
        const formData = new FormData(this);
        console.log("FormData contents:", Object.fromEntries(formData)); // フォームデータの中身をログ
    
        // CSRFトークンを確認
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (!csrfToken) {
            console.error("CSRF token not found.");
            return;
        }
        console.log("CSRF token:", csrfToken.value);
    
        // Fetch APIでリクエストを送信
        fetch("/taskmanage/save-task/", {
            method: "POST",
            body: formData,
            headers: {
                "X-CSRFToken": csrfToken.value
            }
        })
        .then(response => {
            console.log("Server response status:", response.status); // ステータスコードをログ
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Server response data:", data); // サーバーからのレスポンスをログ
            alert("Task saved!");
            document.getElementById("task-form").style.display = "none";
        })
        .catch(error => {
            console.error("Error during form submission:", error); // エラーをログ
            alert("Failed to save task. Please try again.");
        });
    });
    
});
