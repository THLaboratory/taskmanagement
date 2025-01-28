from django.db import models
import uuid

# データベースモデルの管理ファイル。テーブルの形式を定義


class Page(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name="ID")
    title = models.CharField(max_length=100, verbose_name="タイトル")
    body = models.TextField(max_length=2000, verbose_name="本文")
    page_date = models.DateField(verbose_name="日付")
    picture = models.ImageField(
        upload_to="taskmanage/picture/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="作成日時")
    appdated_at = models.DateTimeField(auto_now=True, verbose_name="更新日時")

    def __str__(self):
        return self.title
  
    
class Task(models.Model):
    date = models.DateField()
    task = models.TextField()
    is_checked = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.date}: {self.task} - {'Checked' if self.is_checked else 'Unchecked'}"
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['date', 'task'], name='unique_task_per_date')
        ]