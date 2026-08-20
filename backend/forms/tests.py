from types import SimpleNamespace

from django.test import SimpleTestCase

from forms.pdf_generator import format_currency
from forms.pdf_signature_merge import (
    infer_signature_role,
    merge_signatures_into_pdf_data,
    resolve_signature_roles,
)


def _sig(**kwargs):
    defaults = {
        "field_name": "approval_signature",
        "signer_name": "",
        "signer_pn": "",
        "signer_designation": "",
        "signed_date": None,
        "signature_file": None,
        "assigned_to_user": None,
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


class PdfSignatureMergeTests(SimpleTestCase):
    def test_infer_role_from_username(self):
        user = SimpleNamespace(
            username="gmaudit",
            email="gm.audit@npa.gov.ng",
            get_full_name=lambda: "Gofwan",
            division=None,
            department=None,
        )
        self.assertEqual(infer_signature_role(_sig(assigned_to_user=user)), "audit")

    def test_resolve_unique_roles(self):
        users = [
            SimpleNamespace(
                username="gmict",
                email="gmict@npa.gov.ng",
                get_full_name=lambda: "B",
                division=None,
                department=None,
            ),
            SimpleNamespace(
                username="gmprocurement",
                email="gm.procurement@npa.gov.ng",
                get_full_name=lambda: "A",
                division=None,
                department=None,
            ),
            SimpleNamespace(
                username="gmaudit",
                email="gm.audit@npa.gov.ng",
                get_full_name=lambda: "G",
                division=None,
                department=None,
            ),
        ]
        sigs = [_sig(assigned_to_user=u, signer_name=u.get_full_name()) for u in users]
        roles = resolve_signature_roles(sigs)
        self.assertEqual({role for _, role in roles}, {"pm", "procurement", "audit"})

    def test_merge_writes_role_fields(self):
        user = SimpleNamespace(
            username="gmprocurement",
            email="gm.procurement@npa.gov.ng",
            get_full_name=lambda: "Adedapo",
            division=None,
            department=None,
        )
        sig = _sig(
            assigned_to_user=user,
            signer_name="Adedapo Adekunle",
            signer_designation="General Manager",
        )
        data = merge_signatures_into_pdf_data({}, [sig])
        self.assertEqual(data["procurement_name"], "Adedapo Adekunle")
        self.assertTrue(data["procurement_signature"])


class FormatCurrencyTests(SimpleTestCase):
    def test_formats_number(self):
        self.assertEqual(format_currency(55000000), "₦55,000,000.00")

    def test_formats_string(self):
        self.assertEqual(format_currency("55000000"), "₦55,000,000.00")


class FormSerialParseTests(SimpleTestCase):
    def test_parse_plain_and_prefixed(self):
        from forms.form_serials import _parse_serial_int

        self.assertEqual(_parse_serial_int("00042"), 42)
        self.assertEqual(_parse_serial_int("CHQ-0017"), 17)
        self.assertEqual(_parse_serial_int(""), 0)


class PdfVersionCleanupTests(SimpleTestCase):
    def test_supersedes_tiny_generated_only(self):
        from forms.pdf_version_cleanup import supersede_incomplete_generated_pdfs

        saved = []

        class FakeVersion:
            def __init__(self, vid, size, notes):
                self.id = vid
                self.file_size = size
                self.notes = notes

            def save(self, update_fields=None):
                saved.append((self.id, self.notes, update_fields))

        tiny = FakeVersion("a", 4096, "Generated PDF from completed form with signatures")
        keep = FakeVersion("b", 4096, "Generated PDF from completed form with signatures")
        big = FakeVersion("c", 900_000, "Generated PDF from completed form with signatures")
        upload = FakeVersion("d", 3000, "User upload")

        class FakeQS(list):
            def filter(self, **kwargs):
                items = list(self)
                if "file_size__lt" in kwargs:
                    items = [v for v in items if v.file_size < kwargs["file_size__lt"]]
                if kwargs.get("file_type") == "application/pdf":
                    pass
                return FakeQS(items)

        document = SimpleNamespace(
            versions=FakeQS([tiny, keep, big, upload]),
        )
        # Filter chain: document.versions.filter(file_type=..., file_size__lt=...)
        document.versions.filter = lambda **kw: FakeQS(
            [v for v in [tiny, keep, big, upload] if v.file_size < kw.get("file_size__lt", 10**12)]
        )

        n = supersede_incomplete_generated_pdfs(document, keep_version_id="b")
        self.assertEqual(n, 1)
        self.assertIn("superseded", tiny.notes.lower())
        self.assertNotIn("superseded", keep.notes.lower())
        self.assertEqual(upload.notes, "User upload")
