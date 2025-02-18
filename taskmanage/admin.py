from django.contrib import admin
from .models import Task, Record


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    # 管理画面で表示するフィールド
    list_display = ['id', "date", "task", "is_checked"]
    # フィルタリング可能にするフィールド
    list_filter = ["is_checked", "date"]
    # 検索可能なフィールド
    search_fields = ['id', "task"]


@admin.register(Record)
class RecordAdmin(admin.ModelAdmin):
    # 管理画面で表示するフィールド
    list_display = ['id', "date", "study_time"]
    # フィルタリング可能にするフィールド
    list_filter = ["study_time"]
    # 検索可能なフィールド
    search_fields = ['id', "study_time"]