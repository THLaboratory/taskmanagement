document.addEventListener("DOMContentLoaded", manageAll);

function manageAll() {
    document.getElementById("menu-icon").addEventListener("click", () => {
        const settingsPanel = document.getElementById("settings-panel");
        settingsPanel.classList.toggle("active"); // activeクラスの付け外しで表示切替
    });
}