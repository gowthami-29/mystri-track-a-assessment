# Handover

* Name: Gowthami Kanchi
* Email used for this application: **internvasu2004@gmail.com**
* Chosen track: Track A — Repair the register
* Why this track (one or two sentences): I chose Track A because I enjoy building and improving software. I wanted to investigate an existing application, repair its business-rule defects, verify the fixes with tests and changed inputs, and add a useful product improvement.
* Approximate total time, including setup and handover: **4 h**

## Run and verify

Prerequisites: Python 3.10+ and a browser. No credentials or additional dependencies are required.

From the `track-a` directory:

```powershell
python restore_fixture.py --replace
python app.py
```

Open the application at:

```text
http://127.0.0.1:8787
```

Run the automated tests from another terminal:

```powershell
python -m unittest discover -s tests -v
```

Observed result:

```text
Ran 10 tests
OK
```

The supplied fixture can be restored with `restore_fixture.py`. The project does not require API keys, cloud services, or paid dependencies.

## What I delivered

I repaired the invoice register's business-rule and product issues.

Main repairs:

* Fixed invoice duplicate handling using `(customer_id, invoice_number)` as the invoice identity.
* Identical invoice re-imports are skipped without changing totals.
* Conflicting invoice details are rejected while preserving the original record.
* Fixed payment matching so a payment is matched using both `customer_id` and `invoice_number`, rather than amount alone.
* Identical payment re-imports are skipped.
* Conflicting `payment_id` details are rejected.
* Fixed row-level validation so valid rows can be imported while invalid rows are rejected individually with line numbers and reasons.
* Invalid CSV headers reject the complete import.
* Corrected money/cents handling and invoice status reporting.
* Corrected Open/Paid invoice filtering.
* Improved browser import feedback so successful, partial and failed imports are clearly reported.

Separate product improvement:

* Added invoice search by customer or invoice number alongside the existing status filter.

Relevant code and tests:

* `ledger/matching.py`
* `ledger/importing.py`
* `ledger/storage.py`
* `ledger/validation.py`
* `ledger/reporting.py`
* `tests/test_smoke.py`
* `web/app.js`
* `web/index.html`

## Evidence and limits

I ran the automated test suite and obtained **10/10 passing tests**.

### Failing-before / passing-after reproduction

The original payment matching implementation could select an invoice based on payment amount before checking the payment's customer and invoice number.

I tested:

```text
TEST-MATCH-001,MAPLE,INV-100,1250.00
```

`INV-100` belongs to HARBOR, although another invoice also has an amount of `1250.00`.

After the fix, the payment was imported successfully but remained in `unmatched_payments`. HARBOR `INV-100` remained unchanged by that payment.

A correctly identified payment:

```text
TEST-MATCH-002,HARBOR,INV-100,100.00
```

was attached correctly, changing the invoice balance from `1250.00` to `1150.00`.

### Existing-register check

After testing, I restored the supplied fixture using:

```powershell
python restore_fixture.py --replace
```

The final clean register contained:

* 9 invoices
* 7 open invoices
* Outstanding balance: 3698.19
* 5 payments
* 1 unmatched payment: `KEEP-U1`

The browser was also checked after the final restore. Search and Open/Paid filtering worked as expected.

### Changed-input verification

I tested a mixed invoice import containing one valid row and two invalid rows. The result was:

```text
Imported: 1
Rejected: 2
```

The API returned the correct line numbers and rejection reasons for the invalid customer and invalid amount.

I also tested:

* Invalid CSV header → complete import rejected.
* Duplicate payment with identical details → skipped.
* Duplicate payment with different details → rejected.
* Correct customer/invoice payment → matched.
* Overpayment → negative balance and `paid` status.
* Restart/persistence → imported data remained after restart.

Known limitation: this remains a small local assessment application and was not expanded beyond the stated requirements.

A consequential question I would investigate in a real project is whether monetary values should be represented internally using integer cents or another exact monetary representation rather than floating-point values.

## Tools and judgment

* **ChatGPT (GPT-5.6 Luna)** was used to help investigate defects, review implementation approaches and suggest tests. I verified the suggestions using the project's automated tests, API requests, browser checks and restart/persistence checks.
* The original payment matching approach used amount-based matching. I compared this behaviour against the stated identity rule, rejected the amount-only approach, fixed the matching logic and verified it with a changed-input regression test.
* **PowerShell, Python `unittest`, the local HTTP API and browser** were used to execute and verify the changes. I did not treat a suggested fix as complete until the relevant test or API/browser check passed.
