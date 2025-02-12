from django.urls import path
from taskmanage import views

# アプリの名前空間を定義、これで他のアプリと区別できる
# URLのルートにすべてtaskmanage/が追加される
app_name = "taskmanage"

urlpatterns = [
    path("", views.index, name="index"),
    path('api/get_username/', views.get_username, name='get_username'),
    path("guest-login/", views.guest_login, name="guest_login"),
    path("guest-logout/", views.guest_logout, name="guest_logout"),
    path("calendar/", views.page_cal, name="page_cal"),
    path("save-tasks/", views.save_tasks, name="save_tasks"),
    path("save-value-change/", views.save_value_change, name="save_value_change"),
    path('count-check/', views.count_check, name='count_check'),
    path('records-view/', views.records_view, name='records_view'),
    path('save-study-time/', views.save_study_time, name='save_study_time'),
]
