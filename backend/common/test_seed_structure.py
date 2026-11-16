from django.test import SimpleTestCase

from common.management.commands.seed_demo_data import parse_structure_data


class ParseStructureDataTests(SimpleTestCase):
    def test_ignores_standalone_section_headers(self):
        content = """{
    MD
    "DIRECTORATES": [{"id": "dir-1", "name": "Operations"}]
}"""

        parsed = parse_structure_data(content)

        self.assertEqual(parsed["DIRECTORATES"][0]["id"], "dir-1")

    def test_ignores_headers_containing_ampersands_and_parentheses(self):
        content = """{
    ED F&A
    HR (ADMIN)
    "DIRECTORATES": []
}"""

        self.assertEqual(parse_structure_data(content), {"DIRECTORATES": []})

    def test_adds_a_missing_opening_brace(self):
        content = '"DIRECTORATES": []\n}'

        self.assertEqual(parse_structure_data(content), {"DIRECTORATES": []})
