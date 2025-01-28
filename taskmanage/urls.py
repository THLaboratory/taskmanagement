from django.urls import path
from taskmanage import views

# アプリの名前空間を定義、これで他のアプリと区別できる
app_name = "taskmanage"

urlpatterns = [
    path("", views.index, name="index"),
    path("page/create/", views.page_create, name="page_create"),
    path("pages/", views.page_list, name="page_list"),
    path("page/<uuid:id>/", views.page_detail, name="page_detail"),
    path("page/<uuid:id>/update/", views.page_update, name="page_update"),
    path("page/<uuid:id>/delete/", views.page_delete, name="page_delete"),
    path("calendar/", views.page_cal, name="page_cal"),
    path("save-tasks/", views.save_tasks, name="save_tasks"),
    path("save-value-change/", views.save_value_change, name="save_value_change"),
    path('calendar-data/', views.calendar_data_view, name='calendar_data'),
    path('count-check/', views.count_check, name='count_check'),
    path('diary/', views.diary, name='diary'),
]
