from django.contrib import admin
from .models import Page, Task


@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    readonly_fields = ["id", "created_at", "appdated_at"]

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['id', "date", "task", "is_checked"]  # 管理画面で表示するフィールド
    list_filter = ["is_checked", "date"]  # フィルタリング可能にするフィールド
    search_fields = ['id', "task"]  # 検索可能なフィールド