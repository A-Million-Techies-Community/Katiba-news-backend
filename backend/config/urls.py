from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Master Django Admin Control Room Panel
    path("admin/", admin.site.urls),
    
    # Colleague's Authentication API App
    path("api/users/", include("apps.users.urls")),
    
    # Colleague's Sourced News API App
    path("api/news/", include("apps.news.urls")),
    
    # YOUR APPS: Clean, direct app-level path linkages mapping directly to avoid duplication
    path("api/articles/", include("apps.articles.urls")),
    path("api/blogs/", include("apps.blogs.urls")),
]
