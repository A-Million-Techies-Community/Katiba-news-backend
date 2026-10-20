from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.content.workflow import ContentListCreate, ContentDetail
from .serializers import ArticleSerializer

class ArticleListCreateAPIView(ContentListCreate):
    serializer_class = ArticleSerializer
    # ADDED: Allows the endpoint to accept multipart form data for the image upload during creation
    parser_classes = [MultiPartParser, FormParser, JSONParser]

class ArticleDetailView(ContentDetail):
    serializer_class = ArticleSerializer
    # ADDED: Allows the endpoint to accept multipart form data for the image upload during updates (PATCH/PUT)
    parser_classes = [MultiPartParser, FormParser, JSONParser]