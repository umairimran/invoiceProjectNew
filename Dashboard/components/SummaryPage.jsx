import React from "react";

// ==========================
// Types (data is provided via props; no fetching here)
// ==========================
export const Money = Number;

export const PeriodBlock = {
  "Number of Compliant JO Invoices": Number,
  "Number of of Non-Compliant JO Invoices": Number,
  "Value of the Compliant JO Invoices (SAR)": Money,
  "Value of Non-Compliant JO Invoices  (SAR)": Money, // note the two spaces before (SAR)
};

export const SummaryFirstTableRowGrouped = {
  "BU/Markets": String, // e.g., "A/E", "APAC", "DOMESTIC", "COE", "MEA", "TOTAL"
  "Year-to-date": PeriodBlock, // optional at runtime; we will guard
  lastTwoWeeks: PeriodBlock,     // optional at runtime; we will guard
};

export const SummaryNoteTotals = {
  "Year-to-date": {
    "Total # of JOs": Number,
    "Total amount (SAR)": Money,
  },
  lastTwoWeeks: {
    "Total # of JOs": Number,
    "Total amount (SAR)": Money,
  },
};

// ==========================
// Helpers
// ==========================
const fmtInt = (n) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(v);
};

const fmtMoney = (n) => {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

const BlankPeriod = {
  "Number of Compliant JO Invoices": 0,
  "Number of of Non-Compliant JO Invoices": 0,
  "Value of the Compliant JO Invoices (SAR)": 0,
  "Value of Non-Compliant JO Invoices  (SAR)": 0,
};

const getPeriod = (row, key) => {
  if (!row) return BlankPeriod;
  if (key === "Year-to-date") return row["Year-to-date"] ?? BlankPeriod;
  return row.lastTwoWeeks ?? BlankPeriod;
};

// ==========================
// Page Component (robust to undefined props)
// ==========================
export default function SummaryPage({
  title = "INVOICES VALIDATION SUMMARY",
  rows = [],
  lastTwoWeeksLabel = "Last two weeks (13/08/2025- 20/08/2025)",
  noteTotals,
  onClose
}) {
  // Guard rows to always be an array
  const safeRows = Array.isArray(rows) ? rows : [];

  // Split non-total and total for styling clarity (TOTAL must be last in render)
  const nonTotal = safeRows.filter((r) => r && r["BU/Markets"] !== "TOTAL");
  const totalRow = safeRows.find((r) => r && r["BU/Markets"] === "TOTAL");

  // Safe note totals fallback (renders zeros until real data is wired)
  const nt = noteTotals ?? {
    "Year-to-date": { "Total # of JOs": 0, "Total amount (SAR)": 0 },
    lastTwoWeeks: { "Total # of JOs": 0, "Total amount (SAR)": 0 },
  };

  return (
    <div className="space-y-6">
      {/* Table Card */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full border-separate border-spacing-0">
            <thead>
              {/* Top header row with colspans */}
              <tr>
                <th
                  scope="col"
                  className="sticky top-0 z-10 bg-red-600 text-left text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom"
                >
                  BU/Markets
                </th>
                <th
                  scope="col"
                  colSpan={4}
                  className="sticky top-0 z-10 bg-red-600 text-center text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom"
                >
                  Year-to-date
                </th>
                <th
                  scope="col"
                  colSpan={4}
                  className="sticky top-0 z-10 bg-red-600 text-center text-sm font-helveticaBold text-white border-b border-red-700 px-3 py-3 align-bottom"
                >
                  {lastTwoWeeksLabel}
                </th>
              </tr>
              {/* Second header row with exact labels */}
              <tr>
                <th scope="col" className="sticky top-[44px] z-10 bg-red-600 text-left text-xs font-helveticaBold text-white border-b border-red-700 px-3 py-2">BU/Markets</th>

                {/* YTD labels (with asterisks and exact spacing) */}
                <th scope="col" className="sticky top-[44px] z-10 bg-red-600 text-right text-xs font-helveticaBold text-white border-b border-red-700 px-3 py-2">Number of Compliant JO Invoices</th>
                <th scope="col" className="sticky top-[44px] z-10 bg-red-600 text-right text-xs font-helveticaBold text-white border-b border-red-700 px-3 py-2">Number of of Non-Compliant JO Invoices</th>
                <th scope="col" className="sticky top-[44px] z-10 bg-red-600 text-right text-xs font-helveticaBold text-white border-b border-red-700 px-3 py-2">Value of the Compliant JO Invoices (SAR)*</th>
                <th scope="col" className="sticky top-[44px] z-10 bg-red-600 text-right text-xs font-helveticaBold text-white border-b border-red-700 px-3 py-2">Value of Non-Compliant JO Invoices  (SAR)*</th>

                {/* Last two weeks labels (no asterisks, same inner labels) */}
                <th scope="col" className="sticky top-[44px] z-10 bg-red-600 text-right text-xs font-helveticaBold text-white border-b border-red-700 px-3 py-2">Number of Compliant JO Invoices</th>
                <th scope="col" className="sticky top-[44px] z-10 bg-red-600 text-right text-xs font-helveticaBold text-white border-b border-red-700 px-3 py-2">Number of of Non-Compliant JO Invoices</th>
                <th scope="col" className="sticky top-[44px] z-10 bg-red-600 text-right text-xs font-helveticaBold text-white border-b border-red-700 px-3 py-2">Value of the Compliant JO Invoices (SAR)</th>
                <th scope="col" className="sticky top-[44px] z-10 bg-red-600 text-right text-xs font-helveticaBold text-white border-b border-red-700 px-3 py-2">Value of Non-Compliant JO Invoices  (SAR)</th>
              </tr>
            </thead>

            <tbody className="align-top">
              {nonTotal.map((r) => {
                const ytd = getPeriod(r, "Year-to-date");
                const l2w = getPeriod(r, "lastTwoWeeks");
                return (
                  <tr key={r["BU/Markets"]} className="odd:bg-white even:bg-gray-50">
                    <th scope="row" className="text-left text-sm font-helvetica text-gray-900 px-3 py-2 border-b border-gray-100">
                      {r["BU/Markets"]}
                    </th>

                    {/* YTD cells */}
                    <td className="text-right text-sm font-helvetica text-gray-900 px-3 py-2 border-b border-gray-100">{fmtInt(ytd["Number of Compliant JO Invoices"])}</td>
                    <td className="text-right text-sm font-helvetica text-gray-900 px-3 py-2 border-b border-gray-100">{fmtInt(ytd["Number of of Non-Compliant JO Invoices"])}</td>
                    <td className="text-right text-sm font-helvetica text-gray-900 px-3 py-2 border-b border-gray-100">{fmtMoney(ytd["Value of the Compliant JO Invoices (SAR)"])}</td>
                    <td className="text-right text-sm font-helvetica text-gray-900 px-3 py-2 border-b border-gray-100">{fmtMoney(ytd["Value of Non-Compliant JO Invoices  (SAR)"])}</td>

                    {/* Last two weeks cells */}
                    <td className="text-right text-sm font-helvetica text-gray-900 px-3 py-2 border-b border-gray-100">{fmtInt(l2w["Number of Compliant JO Invoices"])}</td>
                    <td className="text-right text-sm font-helvetica text-gray-900 px-3 py-2 border-b border-gray-100">{fmtInt(l2w["Number of of Non-Compliant JO Invoices"])}</td>
                    <td className="text-right text-sm font-helvetica text-gray-900 px-3 py-2 border-b border-gray-100">{fmtMoney(l2w["Value of the Compliant JO Invoices (SAR)"])}</td>
                    <td className="text-right text-sm font-helvetica text-gray-900 px-3 py-2 border-b border-gray-100">{fmtMoney(l2w["Value of Non-Compliant JO Invoices  (SAR)"])}</td>
                  </tr>
                );
              })}

              {totalRow && (() => {
                const ytdT = getPeriod(totalRow, "Year-to-date");
                const l2wT = getPeriod(totalRow, "lastTwoWeeks");
                return (
                  <tr key="TOTAL" className="bg-gray-50">
                    <th scope="row" className="text-left text-sm font-helveticaBold text-gray-900 px-3 py-2 border-t border-gray-200">
                      TOTAL
                    </th>
                    {/* YTD totals */}
                    <td className="text-right text-sm font-helveticaBold text-gray-900 px-3 py-2 border-t border-gray-200">{fmtInt(ytdT["Number of Compliant JO Invoices"])}</td>
                    <td className="text-right text-sm font-helveticaBold text-gray-900 px-3 py-2 border-t border-gray-200">{fmtInt(ytdT["Number of of Non-Compliant JO Invoices"])}</td>
                    <td className="text-right text-sm font-helveticaBold text-gray-900 px-3 py-2 border-t border-gray-200">{fmtMoney(ytdT["Value of the Compliant JO Invoices (SAR)"])}</td>
                    <td className="text-right text-sm font-helveticaBold text-gray-900 px-3 py-2 border-t border-gray-200">{fmtMoney(ytdT["Value of Non-Compliant JO Invoices  (SAR)"])}</td>

                    {/* Last two weeks totals */}
                    <td className="text-right text-sm font-helveticaBold text-gray-900 px-3 py-2 border-t border-gray-200">{fmtInt(l2wT["Number of Compliant JO Invoices"])}</td>
                    <td className="text-right text-sm font-helveticaBold text-gray-900 px-3 py-2 border-t border-gray-200">{fmtInt(l2wT["Number of of Non-Compliant JO Invoices"])}</td>
                    <td className="text-right text-sm font-helveticaBold text-gray-900 px-3 py-2 border-t border-gray-200">{fmtMoney(l2wT["Value of the Compliant JO Invoices (SAR)"])}</td>
                    <td className="text-right text-sm font-helveticaBold text-gray-900 px-3 py-2 border-t border-gray-200">{fmtMoney(l2wT["Value of Non-Compliant JO Invoices  (SAR)"])}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note Block */}
      <div className="card">
        <div className="space-y-4">
          <p className="text-sm font-helvetica text-red-600">
            *Value based on the full invoice amount (including the 20% last invoice)
          </p>

          {/* Two mini summaries: YTD and Last two weeks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Year-to-date */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-helveticaBold text-white bg-red-600 px-3 py-3 mb-2 border-b border-red-700">Year-to-date</div>
              <dl className="space-y-1">
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-helveticaBold text-gray-700">Total # of JOs</dt>
                  <dd className="text-sm font-helveticaBold text-gray-900">{fmtInt(nt["Year-to-date"]["Total # of JOs"])}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-helveticaBold text-gray-700">Total amount (SAR)</dt>
                  <dd className="text-sm font-helveticaBold text-gray-900">{fmtMoney(nt["Year-to-date"]["Total amount (SAR)"])}</dd>
                </div>
              </dl>
            </div>

            {/* Last two weeks */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-sm font-helveticaBold text-white bg-red-600 px-3 py-3 mb-2 border-b border-red-700">{lastTwoWeeksLabel}</div>
              <dl className="space-y-1">
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-helveticaBold text-gray-700">Total # of JOs</dt>
                  <dd className="text-sm font-helveticaBold text-gray-900">{fmtInt(nt.lastTwoWeeks["Total # of JOs"])}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-helveticaBold text-gray-700">Total amount (SAR)</dt>
                  <dd className="text-sm font-helveticaBold text-gray-900">{fmtMoney(nt.lastTwoWeeks["Total amount (SAR)"])}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
