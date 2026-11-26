"""Search snippets must not carry stored layout characters into results."""

from django.test import SimpleTestCase

from search.services import SearchService


class ExtractSnippetSpacingTests(SimpleTestCase):
    def test_nbsp_layout_gap_does_not_leak_into_the_snippet(self):
        text = "General Manager ICT" + "\u00a0" * 33 + "Date: 22 June 2026"
        snippet = SearchService.extract_snippet(text, "Date")
        self.assertNotIn("\u00a0", snippet)
        self.assertIn("General Manager ICT Date: 22 June 2026", snippet)

    def test_nbsp_entity_text_is_not_shown_to_the_user(self):
        snippet = SearchService.extract_snippet("Approved&nbsp;by the General Manager", "General")
        self.assertNotIn("&nbsp;", snippet)
        self.assertIn("Approved by the General Manager", snippet)

    def test_query_typed_with_a_non_breaking_space_still_matches(self):
        snippet = SearchService.extract_snippet(
            "General Manager Date: 22 June",
            "Manager\u00a0Date",
        )
        self.assertIn("Manager Date", snippet)

    def test_plain_snippets_are_unchanged(self):
        self.assertEqual(
            SearchService.extract_snippet("Please review the memo", "review"),
            "Please review the memo",
        )
