"""Starter checks exercise basic setup. They are not complete acceptance coverage."""
import tempfile
import unittest
from pathlib import Path
from ledger import storage, reporting, importing


class SmokeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.db = storage.connect(Path(self.tmp.name) / 'demo.sqlite3')
        storage.seed(self.db)

    def tearDown(self):
        self.db.close()
        self.tmp.cleanup()

    def test_seed_is_repeatable(self):
        storage.seed(self.db)
        self.assertEqual(len(reporting.invoices(self.db)), 6)

    def test_seed_summary(self):
        summary = reporting.overview(self.db)['summary']
        self.assertEqual(summary['invoice_count'], 6)
        self.assertEqual(summary['outstanding'], 3209.99)

    def test_one_valid_invoice(self):
        result = importing.import_csv(self.db, 'customer_id,invoice_number,amount,due_date\nHARBOR,SMOKE-1,25.00,2026-09-09\n', 'invoices')
        self.assertEqual(result['imported'], 1)

    def test_payment_reference_when_amount_is_unique(self):
        result = importing.import_csv(self.db, 'payment_id,customer_id,invoice_number,amount\nSMOKE-P1,HARBOR,INV-100,20.00\n', 'payments')
        self.assertEqual(result['imported'], 1)
        invoice = next(r for r in reporting.invoices(self.db) if r['invoice_number'] == 'INV-100')
        self.assertEqual(invoice['paid'], 20.00)

    def test_duplicate_invoice_is_skipped(self):
        csv_text = (
            'customer_id,invoice_number,amount,due_date\n'
            'HARBOR,INV-100,1250.00,2026-09-01\n'
        )

        result = importing.import_csv(self.db, csv_text, 'invoices')

        self.assertEqual(result['imported'], 0)
        self.assertEqual(result['skipped'], 1)
        self.assertEqual(result['rejected'], 0)

        invoices = reporting.invoices(self.db)
        matching = [
            r for r in invoices
            if r['customer_id'] == 'HARBOR'
            and r['invoice_number'] == 'INV-100'
        ]
        self.assertEqual(len(matching), 1)

    def test_duplicate_invoice_with_different_details_is_rejected(self):
        csv_text = (
            'customer_id,invoice_number,amount,due_date\n'
            'HARBOR,INV-100,1300.00,2026-09-01\n'
        )

        result = importing.import_csv(self.db, csv_text, 'invoices')

        self.assertEqual(result['imported'], 0)
        self.assertEqual(result['skipped'], 0)
        self.assertEqual(result['rejected'], 1)

    def test_payment_matches_customer_and_invoice_not_amount(self):
        csv_text = (
            'payment_id,customer_id,invoice_number,amount\n'
            'MATCH-P1,HARBOR,INV-100,19.99\n'
        )

        result = importing.import_csv(self.db, csv_text, 'payments')

        self.assertEqual(result['imported'], 1)

        invoices = reporting.invoices(self.db)

        harbor_invoice = next(
            r for r in invoices
            if r['customer_id'] == 'HARBOR'
            and r['invoice_number'] == 'INV-100'
        )

        north_invoice = next(
            r for r in invoices
            if r['customer_id'] == 'NORTH'
            and r['invoice_number'] == 'INV-300'
        )

        self.assertEqual(harbor_invoice['paid'], 19.99)
        self.assertEqual(north_invoice['paid'], 10.00)

    def test_open_filter_contains_only_open_invoices(self):
        open_invoices = reporting.invoices(self.db, status='open')

        self.assertEqual(len(open_invoices), 5)
        self.assertTrue(all(r['status'] == 'open' for r in open_invoices))

    def test_money_and_export_preserve_cents(self):
        invoice = next(
            r for r in reporting.invoices(self.db)
            if r['invoice_number'] == 'INV-300'
        )

        self.assertEqual(invoice['amount'], 19.99)
        self.assertEqual(invoice['paid'], 10.00)
        self.assertEqual(invoice['balance'], 9.99)

        exported = reporting.export_csv(self.db)

        self.assertIn(
            'NORTH,INV-300,19.99,10.00,9.99,open',
            exported,
        )

    def test_export_has_header(self):
        self.assertTrue(reporting.export_csv(self.db).startswith('customer_id,invoice_number,amount,paid,balance,status'))


if __name__ == '__main__':
    unittest.main()
