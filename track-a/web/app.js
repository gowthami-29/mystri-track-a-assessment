const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR'
});

const money = n => currency.format(n);

let currentInvoices = [];

const text = (tag, value, className = '') => {
  const node = document.createElement(tag);
  node.textContent = value;
  node.className = className;
  return node;
};


function renderInvoices() {
  const search = document.querySelector('#invoice-search')
    .value
    .trim()
    .toLowerCase();

  const body = document.querySelector('#invoices');

  const filteredRows = currentInvoices.filter(invoice => {
    if (!search) {
      return true;
    }

    return [
      invoice.customer_id,
      invoice.customer_name,
      invoice.invoice_number
    ].some(value =>
      String(value).toLowerCase().includes(search)
    );
  });

  body.replaceChildren();

  if (!filteredRows.length) {
    const row = document.createElement('tr');
    const cell = text(
      'td',
      'No invoices match your search.',
      'empty-state'
    );

    cell.colSpan = 7;
    row.append(cell);
    body.append(row);
    return;
  }

  filteredRows.forEach(invoice => {
    const row = document.createElement('tr');

    [
      invoice.customer_name,
      invoice.invoice_number,
      invoice.due_date
    ].forEach(value => {
      row.append(text('td', value));
    });

    [
      invoice.amount,
      invoice.paid,
      invoice.balance
    ].forEach(value => {
      row.append(text('td', money(value), 'number'));
    });

    row.append(text('td', invoice.status));

    body.append(row);
  });
}


async function refresh() {
  const status = document.querySelector('#status').value;

  const responses = await Promise.all([
    fetch('/api/overview'),
    fetch(`/api/invoices?status=${status}`)
  ]);

  if (responses.some(response => !response.ok)) {
    throw new Error('Could not refresh the register.');
  }

  const [data, rows] = await Promise.all(
    responses.map(response => response.json())
  );

  currentInvoices = rows;

  document.querySelector('#invoice-count').textContent =
    data.summary.invoice_count;

  document.querySelector('#open-count').textContent =
    data.summary.open_count;

  document.querySelector('#outstanding').textContent =
    money(data.summary.outstanding);

  renderInvoices();

  const unmatched = document.querySelector('#unmatched');

  unmatched.replaceChildren(
    ...data.unmatched_payments.map(payment =>
      text(
        'li',
        `${payment.payment_id} · ${payment.customer_id} / ${payment.invoice_number} · ${money(payment.amount)}`
      )
    )
  );

  if (!data.unmatched_payments.length) {
    unmatched.append(
      text('li', 'No unmatched payments.')
    );
  }

  document.querySelector('#page-error').textContent = '';
}


async function submitImport(form) {
  const feedback = form.querySelector('.feedback');
  const button = form.querySelector('button');
  const fileInput = form.querySelector('input[type="file"]');

  button.disabled = true;
  feedback.textContent = 'Importing...';

  try {
    const file = fileInput.files[0];

    if (!file) {
      throw new Error('Please choose a CSV file.');
    }

    const csv = await file.text();

    const response = await fetch(
      `/api/import?kind=${form.dataset.kind}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv'
        },
        body: csv
      }
    );

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error('The server returned an invalid response.');
    }

    if (!response.ok) {
      throw new Error(
        result.error || 'Import failed.'
      );
    }

    const message = [
      `Imported: ${result.imported}`,
      `Skipped: ${result.skipped}`,
      `Rejected: ${result.rejected}`
    ];

    if (result.errors && result.errors.length) {
      const errors = result.errors
        .map(error =>
          `Line ${error.line}: ${error.reason}`
        )
        .join(' | ');

      message.push(errors);
    }

    feedback.textContent = message.join(' · ');

    await refresh();

  } catch (error) {
    feedback.textContent =
      `Import failed: ${error.message}`;

  } finally {
    button.disabled = false;
  }
}


document
  .querySelector('#status')
  .addEventListener('change', () => {
    refresh().catch(error => {
      document.querySelector('#page-error').textContent =
        error.message;
    });
  });


document
  .querySelector('#invoice-search')
  .addEventListener('input', renderInvoices);


document
  .querySelectorAll('form[data-kind]')
  .forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault();
      submitImport(form);
    });
  });


refresh().catch(error => {
  document.querySelector('#page-error').textContent =
    error.message;
});

