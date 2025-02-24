import os
import django
from django.core.management import call_command

# 日本語が文字化けしないためのエクスポート用ファイル
# Djangoの設定をロード
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
django.setup()

# JSONを出力
output_file = "dump.json"
with open(output_file, "w", encoding="utf-8") as f:
    call_command("dumpdata", "--indent", "4", stdout=f)

print(f"JSONデータを {output_file} に保存しました！")
