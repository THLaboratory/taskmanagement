from django.db import transaction
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.mixins import LoginRequiredMixin
from django.conf import settings
from django.http import JsonResponse
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


class CalenderBassView():
    def get_tasks_by_date(self, year, month):
        """指定された月のタスクを取得して整理"""
        tasks = Task.objects.filter(date__year=year, date__month=month)
        tasks_by_date = {}
        for task in tasks:
            tasks_by_date.setdefault(task.date.day, []).append({
                "content": task.content,
                "is_checked": task.is_checked,
            })

        days_in_month = calendar.monthrange(year, month)[1]
        first_weekday = calendar.monthrange(year, month)[0] + 1  # 開始曜日（+1で調整）
        jp_holidays = holidays.Japan(years=year)

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
                "is_holiday": is_holiday,
                "holiday_name": holiday_name,
                "tasks": tasks_by_date.get(day, []),
            })

        return calendar_days


class CalenderView(LoginRequiredMixin, View, CalenderBassView):
    def get(self, request):
        year = int(request.GET.get("year", datetime.today().year))
        month = int(request.GET.get("month", datetime.today().month))

        calendar_days = self.get_tasks_by_date(year, month)

        return render(request, 'taskmanage/calendar.html', {
            'calendar_days': calendar_days,
            'year': year,
            'month': month,
        })


class CalenderDataView(LoginRequiredMixin, View, CalenderBassView):
    def get(self, request):
        year = int(request.GET.get("year", datetime.today().year))
        month = int(request.GET.get("month", datetime.today().month))

        # 年の範囲を制限
        if year < 1900 or year > 2200:
            return JsonResponse({"error": "Year out of range"}, status=400)

        calendar_days = self.get_tasks_by_date(year, month)

        return JsonResponse({
            "calendar_days": calendar_days,
            "year": year,
            "month": month,
        })


# データベースに保存
# "date","task"(入力フォーム),"is_checked": htmlのname属性
@method_decorator(csrf_exempt, name='dispatch')
class SaveTaskView(LoginRequiredMixin, View):
    def post(self, request):
        print("POST data:", request.POST)
        print("Body:", request.body)

        date = request.POST.get("date")
        task_content = request.POST.get("task")
        is_checked_list = request.POST.getlist("toCheck")

        if not date:
            return JsonResponse({"error": "Date is required."}, status=400)

        try:
            # トランザクションを使用
            with transaction.atomic():
                # 既存タスクを削除
                Task.objects.filter(date=date).delete()

                # タスクデータが空の場合、全タスクを削除するだけ
                if not task_content:
                    return JsonResponse({"message": "All tasks cleared successfully!"})

                # タスクの行ごとに作成
                task_lines = task_content.split("\n")
                tasks = []
                for index, content_line in enumerate(task_lines):
                    content_line = content_line.strip()
                    if content_line:  # 空行は無視
                        is_checked = (str(index) in is_checked_list)  # チェック状態をリストから判定
                        tasks.append(Task(date=date, content=content_line, is_checked=is_checked))

                # バルクインサートで効率的に保存
                Task.objects.bulk_create(tasks)

                return JsonResponse({
                    "message": "Tasks saved successfully!",
                    "saved_tasks": [{"content": t.content, "is_checked": t.is_checked} for t in tasks]
                })
        except Exception as e:
            print(f"Error saving task: {e}")
            return JsonResponse({"error": "Failed to save task."}, status=500)


index = IndexView.as_view()
page_create = PageCreateView.as_view()
page_list = PageListView.as_view()
page_detail = PageDetailView.as_view()
page_update = PageUpdateView.as_view()
page_delete = PageDeleteView.as_view()
page_cal = CalenderView.as_view()
save_task = SaveTaskView.as_view()
calender_data_view = CalenderDataView.as_view()
