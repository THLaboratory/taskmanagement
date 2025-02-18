#!/bin/bash

echo "========= 環境変数確認 ========="
env  # ここで環境変数をすべて表示
echo "========= 環境変数確認 終了 ========="

# Django のマイグレーションと起動
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
