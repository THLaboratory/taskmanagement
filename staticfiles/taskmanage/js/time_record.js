// DOMが完全に読み込まれてから実行
document.addEventListener("DOMContentLoaded", () => {
    const timeFormForDesign = document.getElementById("timeFormForDesign");
    const timeElement = document.querySelectorAll(".calendar-day")
    const timeForm = document.getElementById("timeForm");
    console.log("timeElement", timeElement)

    timeElement.forEach(timeElement => {
        // 勉強時間ダブルクリックでフォーム生成
        timeElement.addEventListener("dblclick", createForm);
        function createForm(event) {
            const rect = this.getBoundingClientRect();

            timeFormForDesign.style.left = `${rect.left+30}px`;
            timeFormForDesign.style.top = `${rect.bottom-30}px`;
            timeFormForDesign.style.display = "block";

            timeInput.focus();

            event.stopPropagation();  // イベントの伝播を防止
        }

        // 外側をクリックしたら非表示
        document.addEventListener("click", eliminateForm);
        function eliminateForm(event) {
            if (!timeFormForDesign.contains(event.target)) {
                timeFormForDesign.style.display = "none";
            }
        }

        // フォームをキャンセル
        cancelButton.addEventListener("click", cancelForm);
        function cancelForm() {
            timeForm.reset(); // フォームの内容をリセット
            timeFormForDesign.style.display = "none"; // フォームを非表示
        }


        }
    });
});