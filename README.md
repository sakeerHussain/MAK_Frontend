# Car rental admin frontend

React + Vite + Tailwind CSS 4 admin shell inspired by the Paces dashboard layout and palette. All 18 requested sidebar destinations are present. Dashboard, Fleet, Drivers, Employees, Vendors, Maintenance, Bookings, Corporate Trips, Invoices, and Billings have working frontend flows; the remaining sections are ready for their page requirements.

## Run

```bash
npm install
npm run dev
```

Keep the Spring Boot backend running on `http://localhost:8080`. Vite proxies `/api` requests to it. Open the Vite address shown in the terminal (normally `http://localhost:5173`) and visit Fleet. For deployments with a separate API origin, set `VITE_API_BASE_URL` to that origin plus `/api` before building, and allow the frontend origin in the backend CORS setting.

## Check

```bash
npm run lint
npm run test
npm run build
```

## Source layout

```text
src/
  app/                 App shell, navigation, and shared app icons
  features/
    dashboard/         Dashboard view
    fleet/             Vehicles, forms, documents, and imports
    drivers/           Driver roster, profiles, and imports
    employees/         Employee roster, profiles, and imports
    bookings/          Customer booking workflow
    corporate-trips/   Company trip workflow
    vendors/           Vendor directory, profile, form, and attachments
    maintenance/       Service and repair jobs, form, status rules, and fleet sync
    invoices/          Invoice list, editor, detail, billing workbench, and export
  shared/
    components/        Form captions and personnel fields
    lib/               CSV download and upload helpers
    vendor/            Licensed spreadsheet parser
  styles/              Global styles
  main.jsx             React entry point
```

Files stay with the feature that owns them. Reused UI and file helpers live under `shared`. `app/App.jsx` coordinates the sidebar, hash routes, and in-memory demo records; each feature owns its page and styles. New modules can be added as siblings under `features`.

Fleet and Drivers are connected to the Spring Boot API and persist records, statuses, attachments, and bulk imports in PostgreSQL and backend file storage. The other modules still use frontend demo data and have no persistent API. Authentication is not implemented. Changes to vehicles or drivers made indirectly from those demo modules are not saved to the backend.

Fleet includes five responsive KPI cards, the vehicle table, a detailed Add Car/Edit Car form, and a CSV/XLSX/XLS bulk importer. Bulk upload validates rows and detects duplicate registration numbers and vehicle IDs before import. The template includes all supported columns and an example, and validation errors can be downloaded as CSV. Add Car supports up to eight car images, with thumbnails and removal controls. Document types are Istimara, Insurance, Fahas, and Others; the first three are required for Complete. Any expired attached document shows Expired.

Fleet utilization remains unavailable until booking vehicle-hours are stored in the backend; the UI displays a dash instead of a sample percentage. The current Fleet page loads all backend vehicles for shared use by the frontend's existing modules, then filters and paginates them in the browser. Server-side pagination should replace this when the fleet becomes large.

The View action opens a full Vehicle Details page at `#/fleet/<id>`. It shows a vehicle photo gallery, status and rates, specifications, ownership, booking visibility, maintenance due readings, and document cards. Back to Fleet, browser Back, and the Fleet breadcrumb return to the list. Edit Car, Update Status, and Upload Documents remain available from the detail page.

Spreadsheet parsing uses a vendored copy of SheetJS 0.18.5 in `src/shared/vendor/xlsx.mjs`; its Apache 2.0 license is included in `src/shared/vendor/LICENSE.sheetjs.txt`. The parser loads only when bulk upload is used.

The Drivers module follows the Paces sellers list pattern with a compact identity column, searchable/filterable table, and row action menu. The Add/Edit form captures identity, employment, daily rate, and documents through one document-type selector and uploader. Document types are Iqama, Passport copy, Contract copy, Home Address Proof, License copy, PCC, Medical, and Others. Certifications have their own name, issue date, expiry date, and compact optional file upload. Clicking a name opens a Driver Profile page. Compliance is calculated from Iqama and License copy records with expiry dates. Delete requires confirmation; records with booking or payment history can be deactivated instead.

Driver bulk upload supports CSV, XLSX, and XLS. Download the template, preview and validate rows, then import the valid rows. Employee ID and phone are checked for duplicates. The result shows successful and failed counts, with a downloadable CSV error report.

The Drivers list loads saved records from the backend and uses SAR daily rates. Certification records can include a manually entered name, issue date, expiry date, and optional uploaded file. The Delete action archives a driver and removes them from the roster; the backend refuses deletion when booking or payment history exists. Those history counts remain zero until the booking and payment APIs are connected. The frontend currently loads all driver pages for shared use by the existing demo modules, then filters and paginates in the browser.

The Employees module uses the same roster, profile, action-menu, and bulk-import pattern. Its form captures employee identity, department, job title, employment type, manager, monthly salary in SAR, status, join date, and ID/Iqama number. Employee documents can be attached with an optional expiry date; a contract copy marks the record Complete, while any expired document marks it Expired. Bulk import accepts CSV, XLSX, and XLS with preview, duplicate checks, and an error report. Employees with payroll history are deactivated instead of deleted.

The Vendors module uses the same compact roster style. It lists vendor ID, name, primary contact, phone, commission percentage, status, and a three-dot menu for View Profile, Edit, Activate/Deactivate, and Delete. Search, type/status filters, and pagination are included. The Add/Edit form captures business or individual type, CR and 15-digit VAT numbers, national address, business classification, repeatable contact rows, commission percentage, credit terms, contract dates, bank details, and the five requested attachment categories. The first contact is the table contact. Uploads accept PNG, JPG, WebP, or PDF files up to 5 MB and stay in memory; attached originals can be downloaded from the profile. Deletion requires confirmation and is prevented while Fleet, Driver, or Employee records refer to that vendor. Renaming a vendor updates those references in the preview.

Active vendor records also appear in the Fleet Add Car vendor selector; existing selections remain available when editing a car.

Maintenance records begin empty and can be added from the Maintenance page. The form links a Fleet car to a Maintenance Log or Accident & Repair Log item, job status, service or repair date, odometer, and workshop. Maintenance work can also set the next service date and odometer. Open and in-progress jobs put the car Under Maintenance; completing or cancelling the last active job releases it to its prior status. A completed job requires an odometer reading. When status is Completed, the form shows Tasks completed checkboxes for General service, Oil, Tyres, and Brakes. Only checked tasks reset their matching Fleet last-reading counters. If a checked task also matches the selected work item, a next-service odometer updates that task's interval. Active bookings and trips block opening a new job for their car. Jobs and Fleet changes remain in memory until refresh.
Maintenance jobs also include optional Notes and repeatable Expense Lines. Each expense line records Spare Parts, Workshop Labor, Workshop Other, or Other; a positive SAR amount; a description; and an optional PNG, JPG, WebP, or PDF receipt up to 5 MB. The form, list, and job details display the calculated total in SAR. Receipt files can be downloaded from the form and job details during the browser session.

Inspections has a searchable, filterable log with inspection ID, car, type, condition, date, inspector, odometer, fuel level, and View/Edit actions. New and edited records include optional booking linkage (limited to bookings assigned to the chosen car), damage/condition notes, and up to 10 inspection photos with previews (PNG/JPG/WebP, 5 MB per image). The details view shows the linked booking and photos. Inspection entries are observations: they do not automatically change Fleet status or maintenance counters. As with the other modules, inspection records and photos remain in memory until refresh.

Driver and Employee add/edit forms share expanded personnel sections: Personal Details (nationality, designation, Iqama expiry, experience, blood group, and a profile photo), Category & Employment (including a vendor name when employment type is Vendor, company ID, joining date, and official number), Charges (hourly, daily, and monthly in SAR), Identity/Contract/Insurance (numbers and expiry dates), Emergency Contacts (KSA and home country), and a Home Address Proof Needed choice. The detail pages display these saved values. When address proof is marked needed, the document indicator remains Missing until it is uploaded; any expired identity, contract, licence, or insurance date marks it Expired. Existing driver daily rate and employee monthly salary remain required; the other charge periods are optional.

The `build` script uses Vite's native config loader, which also works in restricted Windows environments.

Bookings includes five KPI cards, date and status filters, a priority-sorted list, quick and advance booking forms, payments, and pickup and destination fields with unit pricing in SAR. Advance bookings hold a requested vehicle class and assign a specific vehicle and driver on the trip day. Completed bookings can be linked to a new invoice draft.

Corporate Trips extends that pattern for company bookings. It includes five corporate KPI cards, a searchable and filterable priority list, quick and scheduled trip forms, assignment and handover on the trip day, and a detailed trip view. The form is organized as Corporate Account, Project, Passengers, Itinerary, Vehicle & Assignment, and Charges. It records a project manager, project code, and remarks; an expected passenger count with individual names and phone numbers; ordered pickup, intermediate stops, and drop-off with waiting minutes at each location; and unit price, quantity, waiting rate, tax percentage, and a calculated SAR total. Cost Centre and PO/Reference have been removed. Scheduled trips may have a partial passenger list until handover, while quick trips require every passenger. Vehicle and driver conflict checks consider both corporate trips and regular bookings. Email-update intent can be recorded, but no email is sent without a notification service. Completed corporate trips can be invoiced individually or consolidated for one company.

Corporate Trips has an **Add Company** dialog with company name, separate registration and tax numbers, billing contact and address, optional payment terms, and waiting defaults (SAR/hour, included minutes, and 5/15/30/60-minute billing increments). Required fields are validated before saving. The Company Name field on trips accepts typed names and suggests saved companies; selecting one copies its waiting defaults into the trip, where they can be adjusted. Trip contact details stay separate from billing contact details. Waiting beyond the included minutes rounds up to the selected increment. Saving a trip with a new typed company name creates a basic company entry with billing fields empty, so use Add Company when full billing details are needed. Company members are not included. Both Bookings and Corporate Trips offer **Download Details** for a single record (a printable HTML file that can be saved as PDF from a browser) and **Export List CSV** for the currently filtered rows. These exports are distinct from the sample invoice. CSV values are escaped to reduce spreadsheet formula injection risk. Company records and booking edits remain in memory until refresh.

Invoices includes a five-card KPI overview (total invoices, drafts, due in seven days, overdue, and outstanding balance), searchable/filterable invoice list, CSV export, full-page draft editor, invoice detail view, and printable HTML download. List filters cover invoice type, payment status, customer, balance, relative/custom dates, date basis, sorting, and page size. Row actions have consistent icons. The Billings workbench lists completed uninvoiced bookings and trips, lets one company’s trips be grouped into a consolidated draft, and provides company billing profile editing. Drafts support multiple line items, per-line discount and tax, and review before issue. Issued invoice amounts are a saved snapshot; payments and refunds update their balance. This frontend preview uses in-memory records and does not email invoices, create compliant tax invoices, or persist data.

The invoice row action menu contains View Invoice and Download; the separate View button has been removed. Invoice drafts now capture P.O. number, transaction type, structured seller and buyer addresses, VAT and other IDs, a payment contact, and bank account details. Invoice number and issue date are assigned when issued. The detail view and HTML download include the invoice metadata, numbered line items with taxable and VAT amounts, grouped tax summary, totals, notes, payment contact, and account details. Total Amount Due is the total before payments; Balance Due accounts for payments and refunds. These added fields are optional unless marked required in the editor. The preview is not a production tax invoice generator.

## Add to an existing React/Vite/Tailwind project

To use this archive in another React/Vite/Tailwind project, copy the `src` folder and `eslint.config.js` into matching paths, preserving the folders above. Run `npm run dev` from that project directory.
