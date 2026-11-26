"""Word files often pad columns with non-breaking spaces; extracted text must not keep them."""

import os
import tempfile

from django.test import SimpleTestCase
from docx import Document as DocxDocument

from capture.services import OCRService


class DocxExtractionSpacingTests(SimpleTestCase):
    def test_extracted_text_has_no_non_breaking_spaces(self):
        document = DocxDocument()
        document.add_paragraph("To: General Manager ICT" + "\u00a0" * 6 + "Date: 22 June 2026")
        document.add_paragraph("From: Asst. General Manager" + "\u00a0" * 3 + "Ref.: HQ/ICT/01")
        table = document.add_table(rows=1, cols=2)
        table.cell(0, 0).text = "Item\u00a0\u00a0Amount"
        table.cell(0, 1).text = "1,200.00"

        handle, path = tempfile.mkstemp(suffix=".docx")
        os.close(handle)
        try:
            document.save(path)
            text = OCRService.extract_text_from_docx(path)["extracted_text"]
        finally:
            os.unlink(path)

        self.assertNotIn("\u00a0", text)
        self.assertIn("To: General Manager ICT Date: 22 June 2026", text)
        self.assertIn("From: Asst. General Manager Ref.: HQ/ICT/01", text)
        # Column padding collapses inside a cell but cells stay separated.
        self.assertIn("Item Amount | 1,200.00", text)
