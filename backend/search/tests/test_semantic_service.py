"""Tests for semantic search utilities."""

from django.test import SimpleTestCase

from search.semantic_service import cosine_similarity, embed_text, expand_query, rerank_documents


class SemanticSearchTests(SimpleTestCase):
    def test_expand_query_adds_synonyms(self):
        expanded = expand_query("approval memo")
        self.assertIn("memorandum", expanded.lower())

    def test_rerank_prefers_closer_document(self):
        class Doc:
            def __init__(self, title, description=""):
                self.title = title
                self.description = description
                self.reference_number = ""
                self.tags = []

        docs = [
            Doc("Port operations report", "terminal throughput analysis"),
            Doc("Staff leave policy", "human resources annual leave"),
        ]
        ranked = rerank_documents("port terminal report", docs, limit=2)
        self.assertEqual(ranked[0].title, "Port operations report")

    def test_cosine_similarity_identical_vectors(self):
        vector = embed_text("policy circular guidance")
        self.assertAlmostEqual(cosine_similarity(vector, vector), 1.0, places=5)
