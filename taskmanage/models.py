from django.db import models
import uuid
from datetime import timedelta

# データベースモデルの管理ファイル。テーブルの形式を定義
  
    
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


class Record(models.Model):
    date = models.DateField()
    study_time = models.DurationField()
    
    def save_study_time(self, hours, minutes):
        """AA時間BB分のデータを保存するためのメソッド"""
        self.study_time = timedelta(hours=hours, minutes=minutes)
        self.save()

    def get_study_time(self):
        """AA:BB 形式で取得"""
        total_seconds = int(self.study_time.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60  # %で時間部分を除いた分数だけ取得
        return f"{hours:02}:{minutes:02}"