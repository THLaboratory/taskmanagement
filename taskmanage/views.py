from django.db import transaction
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views import View
from .models import Task, Record
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import calendar
import holidays
import json


# .は相対パス、自身と同じ階層にあるファイルを指す

def home(request):
    return HttpResponse("Welcome to the Home Page!")

# 開発環境のみ CSRF を無効化
def maybe_exempt(view_func):
    if settings.DEBUG:
        return csrf_exempt(view_func)
    return view_func


class IndexView(LoginRequiredMixin, View):
    def get(self, request):
        datetime_now = datetime.now(
            ZoneInfo("Asia/Tokyo")
        ).strftime("%Y年%m月%d日 %H:%M:%S")
        return render(
            request, "taskmanage/index.html", {"datetime_now": datetime_now})
 

# カレンダーの土台。クラス継承で渡す
class CalendarBassView():
    def _get_day_info(self, year, month):
        day_info = []

        days_in_month = calendar.monthrange(year, month)[1]
        first_weekday = calendar.monthrange(year, month)[0] + 1  # 開始曜日（+1で調整）
        jp_holidays = holidays.Japan(years=year)
        weekdays = ["月", "火", "水", "木", "金", "土", "日"]

        # 空セルを埋める（開始曜日に応じた調整）
        for _ in range(first_weekday % 7):  # 7で割って余分なセルが生成されないように調整
            day_info.append({"day": None, "weekday": None, "is_holiday": False, "holiday_name": None})

        # 各日付を追加
        for day in range(1, days_in_month + 1):
            date = datetime(year, month, day)
            is_holiday = date.strftime("%Y-%m-%d") in jp_holidays
            holiday_name = jp_holidays.get(date.strftime("%Y-%m-%d"), None)
            day_info.append({
                "day": day,
                "weekday": weekdays[date.weekday()],
                "is_holiday": is_holiday,
                "holiday_name": holiday_name,
            })

        return day_info

    def _get_tasks_by_date(self, year, month):
        """DBから指定された年月のタスクを全て取得"""
        day_info = self._get_day_info(year, month)  # 戻り値をインスタンス化
        
        tasks = Task.objects.filter(date__year=year, date__month=month)
        tasks_by_date = {}  # 構造 {day, ["task":~, "is_checked":~]}
        for task in tasks:
            tasks_by_date.setdefault(task.date.day, []).append({
                "task": task.task,
                "is_checked": task.is_checked,
            })

        # 各日付を追加
        for i in day_info:
            day = i["day"]  # 'day'の値を取得
            i["tasks"] = tasks_by_date.get(day, [])  # dayが一致するタスクをセット

        day_info_and_tasks = day_info

        return day_info_and_tasks


# day_info_and_tasksはCalendarBassViewからの戻り値
# 構造 ["day": ~,  "is_holiday": ~, "holiday_name": ~, "tasks": ["task": ~, "is_checked: ~"]]
class CalendarView(LoginRequiredMixin, View, CalendarBassView):
    def get(self, request):
        year = int(request.GET.get("year", datetime.today().year))
        month = int(request.GET.get("month", datetime.today().month))
        view_type = request.GET.get("view", "default")  # 分岐処理

        # 年の範囲を制限
        if year < 1900 or year > 2200:
            return JsonResponse({"error": "Year out of range"}, status=400)

        day_info_and_tasks = self._get_tasks_by_date(year, month)

        # 分岐
        if view_type == "tasks-json":
            return JsonResponse({
                "day_info_and_tasks": day_info_and_tasks,
                "year": year,
                "month": month,
            })
        else:  # カレンダー描画
            print("view_typeの指定がありませんでした")
            # html：テンプレートファイル、その後に渡すデータ(辞書型)を記述
            return render(request, 'taskmanage/calendar.html', {
                'day_info_and_tasks': day_info_and_tasks,
                'year': year,
                'month': month,
            })


# save()でデータベースに保存、関数名はpost、URL：save-tasks
# "date","task"(入力フォーム),"is_checked": htmlのname属性
@method_decorator(csrf_exempt, name='dispatch')
class SaveTasks(LoginRequiredMixin, View):
    def post(self, request):
        if request.method == "POST":
            # postされたデータをjsonとして取得
            gotten_jsonData = json.loads(request.body)

            if not isinstance(gotten_jsonData, list):
                gotten_jsonData = [gotten_jsonData]

            for jsonData in gotten_jsonData:
                DATE = jsonData.get("date")
                TASK = jsonData.get("task")
                task_list = [t.strip() for t in TASK.splitlines() if t.strip() != ""]

                is_checked = jsonData.get("is_checked", False)

                if not DATE:
                    return JsonResponse({"status": "error", "message": "Missing required DATE"}, status=400)

                with transaction.atomic():
                    Task.objects.filter(date=DATE).delete()  # 既存タスクを消去

                    # タスクデータが空の場合、全タスクを削除
                    if not TASK:
                        return JsonResponse({"message": "All tasks cleared successfully!"})

                    # タスクの行ごとに作成                    
                    tasks = []
                    for t in task_list:
                        is_checked = False
                        selected_data = Task.objects.filter(date=DATE, task=t).first()
                        if selected_data:
                            is_checked = selected_data.is_checked
                        tasks.append(Task(date=DATE, task=t, is_checked=is_checked))

                    # bulk_create(): 複数データを一気に保存
                    Task.objects.bulk_create(tasks)

            return JsonResponse({
                "message": "Tasks saved successfully!",
                "saved_tasks": [{"task": t.task, "is_checked": t.is_checked} for t in tasks]
            })
        else:
            # 他のHTTPメソッドは許可しない
            return JsonResponse({'error': 'Method not allowed'}, status=405)


@method_decorator(csrf_exempt, name='dispatch')
class SaveValueChange(LoginRequiredMixin, View):
    def post(self, request):
        if request.method == "POST":            
            # postされたデータをjsonとして取得            
            jsonData = json.loads(request.body)
            latest_checkbox = jsonData.get("is_checked")
            DATE = jsonData.get("date")
            TASK = jsonData.get("task")

            # 左のdateはデータベースのキー
            # .get: 単数、.filter: 複数(QuerySet形式)
            selected_data = Task.objects.get(date=DATE, task=TASK)            
            selected_data.is_checked = latest_checkbox

            with transaction.atomic():
                selected_data.save()
                print("SaveValueChange was complete!")
            return JsonResponse({
                "message": "Tasks saved successfully!"
            })
        else:
            # 他のHTTPメソッドは許可しない
            return JsonResponse({'error': 'Method not allowed'}, status=405)

  
@method_decorator(csrf_exempt, name='dispatch')
class CountCheck(LoginRequiredMixin, View):
    def count_check(self, request):
        true_count = Task.objects.filter(is_checked=True).count()
        return JsonResponse({'true_count': true_count})


@method_decorator(csrf_exempt, name='dispatch')
class RecordsView(LoginRequiredMixin, View, CalendarBassView):
    def get(self, request):
        # ?year=~&month=~ のパラメータを取得
        year = int(request.GET.get("year", datetime.today().year))
        month = int(request.GET.get("month", datetime.today().month))
        view_type = request.GET.get("view", "default")  # 分岐処理

        # 年の範囲を制限
        if year < 1900 or year > 2200:
            return JsonResponse({"error": "Year out of range"}, status=400)

        day_info_and_records = self._get_study_time(year, month)

        if view_type == "records-json":
            return JsonResponse({
                "day_info_and_records": day_info_and_records,
                "year": year,
                "month": month,
            })
        else:
            return render(request, 'taskmanage/time_record.html', {
                'day_info_and_records': day_info_and_records,
                'year': year,
                'month': month,
            })
    
    def _get_study_time(self, year, month):
        """DBから指定された年月のstudy_timeを全て取得"""
        day_info = self._get_day_info(year, month)  # 戻り値をインスタンス化
        
        records = Record.objects.filter(date__year=year, date__month=month)

        records_by_date = {}  # 構造 {day, ["study_time":~]}
        # get_study_time()はmodelsに記載
        for record in records:
            records_by_date[record.date.day] = record.get_study_time()
        
        # 各日付を追加
        for i in day_info:
            day = i["day"]  # 'day'の値を取得
            # dayが一致するstudy_timeをセット、第二引数はデフォルト値
            i["study_time"] = records_by_date.get(day, 0)

        day_info_and_records = day_info

        return day_info_and_records


class SaveStudyTime(LoginRequiredMixin, View):
    def post(self, request):
        if request.method == "POST":
            jsonData = json.loads(request.body)

            DATE = jsonData.get("date")
            optimized_DATE = datetime.strptime(DATE, "%Y-%m-%d").date()
            
            STUDY_TIME = jsonData.get("study_time")

            try:
                if ":" in STUDY_TIME:  # 1:00のような形式の場合
                    hours, minutes = map(int, STUDY_TIME.split(":"))
                    STUDY_TIME = timedelta(hours=hours, minutes=minutes)
                else:  # 45など分数だけの形式の場合
                    STUDY_TIME = timedelta(minutes=int(STUDY_TIME))
            except ValueError:
                return JsonResponse({"error": "Invalid study_time value"}, status=400)

            data_study_time = Record(date=optimized_DATE, study_time=STUDY_TIME)
            with transaction.atomic():
                # 上書きor新規作成
                Record.objects.update_or_create(
                    date=optimized_DATE,
                    defaults={"study_time": STUDY_TIME}
                )
                print("study_time was saved!")
                return JsonResponse({
                    "message": "study_time saved successfully!"
                })
        else:
            # 他のHTTPメソッドは許可しない
            return JsonResponse({'error': 'Method not allowed'}, status=405)
        

index = IndexView.as_view()
page_cal = CalendarView.as_view()
save_tasks = SaveTasks.as_view()
save_value_change = SaveValueChange.as_view()
count_check = CountCheck.as_view()
records_view = RecordsView.as_view()
save_study_time = SaveStudyTime.as_view()