from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAuthor, IsEditor, IsReader
from .serializers import UserRegistrationSerializer, UserSerializer


class RegisterView(APIView):
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)

        if serializer.is_valid():
            user = serializer.save()

            return Response(
                {
                    "message": "User registered successfully.",
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "role": user.role,
                    },
                },
                status=status.HTTP_201_CREATED,
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )



class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class ReaderOnlyView(APIView):
    permission_classes = [IsReader]

    def get(self, request):
        return Response({"message": "Reader access granted."})


class AuthorOnlyView(APIView):
    permission_classes = [IsAuthor]

    def get(self, request):
        return Response({"message": "Author access granted."})


class EditorOnlyView(APIView):
    permission_classes = [IsEditor]

    def get(self, request):
        return Response({"message": "Editor access granted."})