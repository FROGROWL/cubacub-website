from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import StaffAccountSerializer
from rest_framework import status

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def my_profile(request):
    user = request.user

    if request.method == "GET":
            serializer = StaffAccountSerializer(user)
            return Response(serializer.data)

    if request.method == "PATCH":
        serializer = StaffAccountSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        "id": user.id,
        "username": user.username,
        "name": user.name,
        "role": user.role,
        "active": user.active,
        "phone": user.phone,
        "email": user.email,
        "address": user.address,
        "birthdate": user.birthdate,
        "sex": user.sex,
    })
