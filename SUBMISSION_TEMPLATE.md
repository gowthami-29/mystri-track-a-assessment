# Handover

* Name: Gowthami Kanchi
* Email used for this application: **internvasu2004@gmail.com**
* Chosen track: Track A — Repair the register
* Why this track (one or two sentences): I chose Track A to investigate an existing invoice application, repair the broken business rules, verify the fixes against changed inputs, and add a small useful product improvement.
* Approximate total time, including setup and handover: **4 hr**

## Run and verify

Prerequisite: Python 3.10+ and a browser. No credentials or additional dependencies were added.

```powershell
python restore_fixture.py --replace
python app.py
```

In another terminal:

```powershell
python -m unittest discover -s tests -v
```

Expected test result: `Ran 10 tests ... OK`.

The browser application is available at `http://127.0.0.1:8787`.

## What I delivered

I repaired the invoice register's identity, payment matching, validation, reporting, and import behaviour.

Key repairs:

* Invoice duplicates are skipped when identity and details match and rejected when details conflict.
* Payments are matched using both `customer_id` and `invoice_number`, rather than amount alone.
* Invalid data rows are rejected individually while valid rows continue processing.
* Invalid CSV headers reject the complete import.
* Money values preserve cents and correct open/paid status, including overpayments.
* API status filtering and browser import feedback were corrected.

I also added a search field for filtering invoices by customer or invoice number as a separate product improvement.

Relevant code/tests:

* `ledger/matching.py`
* `ledger/importing.py`
* `ledger/storage.py`
* `ledger/reporting.py`
* `tests/test_smoke.py`
* `web/app.js`
* `web/index.html`

## Evidence and limits

I ran the automated test suite and obtained **10/10 passing tests**.

A failing-before/passing-after reproduction was the payment matching case: the original implementation could match a payment by amount before checking its customer/invoice identity. After the fix, `MAPLE,INV-100,1250.00` remained an unmatched payment instead of being attached to HARBOR's `INV-100`.

I also tested partial validation with one valid invoice and two invalid rows. The result was `imported: 1`, `rejected: 2`, with line numbers and reasons returned.

The supplied existing register was restored and verified with **9 invoices, 7 open invoices, outstanding 3698.19, and 1 unmatched payment**. The browser search and Open/Paid filtering were also checked.

Known limitation: the application remains a small local assessment application; I did not expand it beyond the stated requirements.

A consequential question I would investigate in a real project is whether monetary values should be stored internally as integer cents or another exact monetary representation rather than floating-point values.

## Tools and judgment

* **ChatGPT (GPT-5.6 Luna)** suggested investigation paths and candidate fixes. I verified decisions by running the automated tests and changed-input API cases rather than accepting suggestions without testing.
* The original payment-matching approach used amount-based matching. I rejected that approach after comparing it with the stated identity rule and created a regression test for customer/invoice matching.
* I used PowerShell, Python `unittest`, the local API and browser to verify behaviour after changes, including restart/persistence and a final clean fixture restore.
