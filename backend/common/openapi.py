"""OpenAPI fallbacks for APIViews whose response shapes are not serialized."""

from drf_spectacular.openapi import AutoSchema
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse

UNSPECIFIED_JSON_OBJECT_SCHEMA = {
    "type": "object",
    "additionalProperties": True,
}


class LenientAutoSchema(AutoSchema):
    """Keep custom views in the schema without guessing undeclared fields."""

    def _has_serializer_metadata(self) -> bool:
        view = self.view
        return bool(
            getattr(view, "serializer_class", None)
            or callable(getattr(view, "get_serializer_class", None))
            or callable(getattr(view, "get_serializer", None))
        )

    def get_request_serializer(self):
        if not self._has_serializer_metadata():
            return OpenApiTypes.OBJECT
        return super().get_request_serializer()

    def get_response_serializers(self):
        if not self._has_serializer_metadata():
            return OpenApiResponse(
                response=UNSPECIFIED_JSON_OBJECT_SCHEMA,
                description=(
                    "Free-form JSON object; response fields are not declared by a serializer."
                ),
            )
        return super().get_response_serializers()
