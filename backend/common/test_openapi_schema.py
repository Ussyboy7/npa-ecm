from django.test import SimpleTestCase
from rest_framework.views import APIView
from drf_spectacular.types import OpenApiTypes

from common.openapi import LenientAutoSchema, UNSPECIFIED_JSON_OBJECT_SCHEMA


class UnspecifiedAPIView(APIView):
    pass


class LenientAutoSchemaTests(SimpleTestCase):
    def setUp(self):
        self.schema = LenientAutoSchema()
        self.schema.view = UnspecifiedAPIView()

    def test_request_body_uses_free_form_object_when_no_serializer_is_declared(self):
        self.assertEqual(
            self.schema.get_request_serializer(),
            OpenApiTypes.OBJECT,
        )

    def test_response_uses_documented_free_form_json_when_no_serializer_is_declared(self):
        self.schema.method = "POST"
        response = self.schema.get_response_serializers()

        self.assertEqual(response.response, UNSPECIFIED_JSON_OBJECT_SCHEMA)
        self.assertIn("not declared by a serializer", response.description)
