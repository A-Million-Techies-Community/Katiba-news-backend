from django.contrib import admin
from .models import Article

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'author', 'created_at')
    prepopulated_fields = {'slug': ('title',)}
