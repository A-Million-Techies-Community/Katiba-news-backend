from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

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

# Serves the uploaded media images locally when DEBUG is True
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)