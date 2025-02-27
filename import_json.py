import json
import psycopg2

# PostgreSQLデータベースへの接続
conn = psycopg2.connect(
    host="my-database-2.cz0kyssyi425.ap-northeast-1.rds.amazonaws.com",
    database="taskdatabase",
    user="t4skm4ster9",
    password="r5Gf8iVmS1o",
    port=5432
)
cursor = conn.cursor()

# JSONファイルを読み込む
with open("dump.json", "r", encoding="utf-8") as file:
    data = json.load(file)

# データを挿入する
for entry in data:
    if entry["model"] == "taskmanage.task":
        fields = entry["fields"]
        cursor.execute(
            """
            INSERT INTO tasks (date, task, is_checked)
            VALUES (%s, %s, %s)
            """,
            (fields["date"], fields["task"], fields["is_checked"])
        )

# コミットして接続を閉じる
conn.commit()
cursor.close()
conn.close()

print("データが正常にインポートされました！")
input("ENTER:")
