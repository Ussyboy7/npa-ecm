"""Plain-text extraction must survive the non-breaking spaces memos store."""

from django.test import SimpleTestCase

from common.plain_text import normalize_text_spacing, to_plain_text


class ToPlainTextTests(SimpleTestCase):
    def test_nbsp_gap_between_words_becomes_one_ordinary_space(self):
        html = "<p><strong>To:</strong> General Manager ICT" + "\u00a0" * 33 + (
            "<strong>Date:</strong> 22 June</p>"
        )
        self.assertEqual(
            to_plain_text(html),
            "To: General Manager ICT Date: 22 June",
        )

    def test_words_are_never_glued_together_by_stored_spacing(self):
        plain = to_plain_text("<p>Item\u00a0\u00a0Amount</p>")
        self.assertNotIn("\u00a0", plain)
        self.assertEqual(plain, "Item Amount")

    def test_html_entities_are_decoded_instead_of_indexed_as_text(self):
        # The memo HTML carries `&nbsp;` entities next to literal U+00A0 runs;
        # left raw they reach search text as the word "nbsp".
        self.assertEqual(to_plain_text("<p>Approved&nbsp;by the GM &amp; ICT</p>"), "Approved by the GM & ICT")

    def test_tags_and_line_breaks_collapse_to_single_spaces(self):
        self.assertEqual(to_plain_text("<p>one</p>\n\n<p>two</p>"), "one two")

    def test_adjacent_blocks_do_not_glue_words_together(self):
        self.assertEqual(to_plain_text("<p>Memorandum</p><p>To: GM</p>"), "Memorandum To: GM")
        self.assertEqual(to_plain_text("<p>one<br>two</p>"), "one two")
        self.assertEqual(to_plain_text("<p>Heading</p><ul><li>first</li><li>second</li></ul>"), "Heading first second")

    def test_adjacent_table_cells_keep_words_apart(self):
        self.assertEqual(
            to_plain_text("<table><tr><td>Item</td><td>Amount</td></tr></table>"),
            "Item Amount",
        )

    def test_style_and_script_bodies_are_not_indexed_as_prose(self):
        # Print-ready versions embed a stylesheet; its CSS must not reach search.
        html = (
            "<html><head><style>@page { size: A4; } * { box-sizing: border-box; }</style>"
            "<script>window.print()</script></head>"
            "<body><!-- internal note --><p>Board paper</p></body></html>"
        )
        self.assertEqual(to_plain_text(html), "Board paper")

    def test_blank_input_is_empty_text(self):
        self.assertEqual(to_plain_text(""), "")
        self.assertEqual(to_plain_text(None), "")


class NormalizeTextSpacingTests(SimpleTestCase):
    def test_collapses_nbsp_and_space_runs_but_keeps_lines(self):
        self.assertEqual(
            normalize_text_spacing("Line\u00a0\u00a0one\n  Line\ttwo  "),
            "Line one\nLine two",
        )

    def test_leaves_already_clean_text_unchanged(self):
        self.assertEqual(normalize_text_spacing("Line one\nLine two"), "Line one\nLine two")
