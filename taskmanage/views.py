from django.db import transaction
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views import View
from .forms import PageForm
from .models import Page, Task
from datetime import datetime
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


class PageCreateView(LoginRequiredMixin, View):
    def get(self, request):
        form = PageForm()
        return render(request, "taskmanage/page_form.html", {"form": form})

    def post(self, request):
        form = PageForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect("taskmanage:index")
            # アプリ名:パス、taskmanage/urls.py内に記載したパスname
        return render(request, "taskmanage/page_form.html", {"form": form})


class PageListView(LoginRequiredMixin, View):
    def get(self, request):
        page_list = Page.objects.order_by("-page_date")
        return render(request, "taskmanage/page_list.html", {"page_list": page_list})
 

class PageDetailView(LoginRequiredMixin, View):
    def get(self, request, id):
        page = get_object_or_404(Page, id=id)
        return render(request, "taskmanage/page_detail.html", {"page": page})


class PageUpdateView(LoginRequiredMixin, View):
    def get(self, request, id):
        page = get_object_or_404(Page, id=id)
        form = PageForm(instance=page)
        return render(request, "taskmanage/page_update.html", {"form": form})

    def post(self, request, id):
        page = get_object_or_404(Page, id=id)
        form = PageForm(request.POST, request.FILES, instance=page)
        if form.is_valid():
            form.save()
            return redirect("taskmanage:page_detail", id=id)
        return render(request, "taskmanage/page_update.html", {"form": form})


class PageDeleteView(LoginRequiredMixin, View):
    def get(self, request, id):
        page = get_object_or_404(Page, id=id)
        return render(request, "taskmanage/page_confirm_delete.html", {"page": page})

    def post(self, request, id):
        page = get_object_or_404(Page, id=id)
        page.delete()
        return redirect("taskmanage:page_list")


# カレンダーの土台。クラス継承で渡す
class CalendarBassView():
    def get_tasks_by_date(self, year, month):
        """DBから指定された年月のタスクを全て取得"""
        tasks = Task.objects.filter(date__year=year, date__month=month)
        tasks_by_date = {}  # 構造 {day, ["task":~, "is_checked":~]}
        for task in tasks:
            tasks_by_date.setdefault(task.date.day, []).append({
                "task": task.task,
                "is_checked": task.is_checked,
            })

        days_in_month = calendar.monthrange(year, month)[1]
        first_weekday = calendar.monthrange(year, month)[0] + 1  # 開始曜日（+1で調整）
        jp_holidays = holidays.Japan(years=year)
        weekdays = ["月", "火", "水", "木", "金", "土", "日"]

        # カレンダーの日付データを生成
        calendar_days = []

        # 空セルを埋める（開始曜日に応じた調整）
        for _ in range(first_weekday % 7):  # 7で割って余分なセルが生成されないように調整
            calendar_days.append({"day": None, "is_holiday": False, "holiday_name": None, "tasks": []})

        # 各日付を追加
        for day in range(1, days_in_month + 1):
            date = datetime(year, month, day)
            is_holiday = date.strftime("%Y-%m-%d") in jp_holidays
            holiday_name = jp_holidays.get(date.strftime("%Y-%m-%d"), None)
            calendar_days.append({
                "day": day,
                "weekday": weekdays[date.weekday()],
                "is_holiday": is_holiday,
                "holiday_name": holiday_name,
                "tasks": tasks_by_date.get(day, []),
            })

        return calendar_days


# calendar_daysはCalendarBassViewからの戻り値
# 構造 ["day": ~,  "is_holiday": ~, "holiday_name": ~, "tasks": ["task": ~, "is_checked: ~"]]
class CalendarView(LoginRequiredMixin, View, CalendarBassView):
    def get(self, request):
        year = int(request.GET.get("year", datetime.today().year))
        month = int(request.GET.get("month", datetime.today().month))
        view_type = request.GET.get("view", "default")  # 分岐処理

        # 年の範囲を制限
        if year < 1900 or year > 2200:
            return JsonResponse({"error": "Year out of range"}, status=400)

        calendar_days = self.get_tasks_by_date(year, month)

        # 分岐
        if view_type == "tasks-json":
            return JsonResponse({
                "calendar_days": calendar_days,
                "year": year,
                "month": month,
            })
        elif view_type == "time-record":
            return render(request, 'taskmanage/time_record.html', {
                'calendar_days': calendar_days,
                'year': year,
                'month': month,
            })
        else:
            print("view_typeの指定がありませんでした")
            # html：テンプレートファイル、その後に渡すデータ(辞書型)を記述
            return render(request, 'taskmanage/calendar.html', {
                'calendar_days': calendar_days,
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
        

class CountCheck(LoginRequiredMixin, View):
    def count_check(self, request):
        true_count = Task.objects.filter(is_checked=True).count()
        return JsonResponse({'true_count': true_count})
        

index = IndexView.as_view()
page_create = PageCreateView.as_view()
page_list = PageListView.as_view()
page_detail = PageDetailView.as_view()
page_update = PageUpdateView.as_view()
page_delete = PageDeleteView.as_view()
page_cal = CalendarView.as_view()
save_tasks = SaveTasks.as_view()
save_value_change = SaveValueChange.as_view()
count_check = CountCheck.as_view()