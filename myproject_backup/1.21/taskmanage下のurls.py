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
    path("page/cal/", views.page_cal, name="page_cal"),
    path("save-task/", views.save_task, name="save_task"),
    path('calendar-data/', views.calender_data_view, name='calendar_data'),
]
