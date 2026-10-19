from apps.content.workflow import ContentListCreate, ContentDetail
from .serializers import ArticleSerializer

class ArticleListCreateAPIView(ContentListCreate):
    serializer_class = ArticleSerializer

class ArticleDetailView(ContentDetail):
    serializer_class = ArticleSerializer
