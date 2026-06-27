# Admin Guide

The Admin is the school administrator — the person who runs the day-to-day digital operations of the school. You have full access to everything within your school: adding users, setting up classes, managing the timetable, viewing fees, publishing notices, and more.

When you log in for the first time, the Dashboard shows a **Setup Checklist** to guide you through the recommended steps to get your school ready. Once you have completed the initial setup, you will see the full operational dashboard instead.

---

## Your Sidebar at a Glance

| Sidebar Item | What it does |
|---|---|
| **Dashboard** | School-wide overview, stats, action items, and the notice board |
| **Users** | Add and manage all staff and student accounts |
| **Data Import** | Bulk-upload students, teachers, or fee records from CSV files |
| **Academics** | Manage classes and sections |
| **Time Table** | Set up subjects, periods, and the class schedule |
| **Fees** | View fee summaries and verify UPI payments submitted by students |
| **School Settings** | Update your school's name, logo, theme color, and description |

---

## Dashboard

The Admin Dashboard is your daily operational view. Here is what you will find:

- **Key Stats** — Total students, teachers, classes, today's attendance rate, total fees collected, and total pending fees — all at a glance.
- **School Operational Snapshot** — A quick health summary showing attendance status, fee collection rate, teacher activity, and recent import activity.
- **Today's Action Center** — A focused list of things that need your attention: how many classes have not marked attendance yet, how many fee invoices are still pending, recent notices, and the latest data import status.
- **Recent Campus Activities** — A live timeline of what has happened recently: new users added, payments received, attendance submitted, notices published, and bulk imports completed.
- **Student Class Distribution** — A chart showing how many students are enrolled in each class.
- **Attendance Trend** — A 7-day line chart showing how attendance has been tracking across the school.
- **Financial Snapshot** — Collected vs. pending fees with a collection rate percentage.
- **Notice Board** — All published announcements are shown here in reverse chronological order. Each notice shows the title, full message, the person who posted it, and when it was posted.

### Posting a Notice

You can publish an announcement directly from the Dashboard. Scroll down to the **Post a Notice** section (or click the "Post Notice" action in the Action Center) and fill in the form:

- **Title** — A short, clear headline for the announcement (e.g., "Parent-Teacher Meeting on June 10th").
- **Message** — The full content of the notice. You can write multiple lines.
- **Audience** — Choose who should see this notice using the checkboxes provided:
  - **Everyone** (default) — Visible to all users: students, teachers, and accounts staff. Select this checkbox to target the entire school.
  - **Students** — Only students will see this notice on their dashboard.
  - **Teachers** — Only teachers will see this notice.
  - **Accounts** — Only accounts staff will see this notice.
  - You can **select multiple roles at once** by checking multiple boxes (e.g., Students and Teachers but not Accounts).
  - If you select all roles individually, the system automatically treats it as **Everyone**.

Click **Publish Notice** and it will appear immediately on the dashboards of all users who match the selected audience.

> Notices stay visible until they are deleted. Users will only ever see notices that were addressed to their role (or to everyone) — they never see notices meant for other roles.

### Editing a Notice

You can edit a published notice at any time by clicking the **Edit** button on a notice card. You can update the title, message, or audience. After saving, a subtle **Edited** label will appear on the notice to let readers know it was updated after its original publication.

### Deleting a Notice

To permanently remove a notice, click the **Delete** button on the notice card. This action cannot be undone.

---

## Users

This is where you manage everyone in your school — teachers, students, and accounts staff.

### Viewing Users
The Users page shows all accounts in your school. You can filter the list by role (Teacher, Student, Accounts, Admin) and search by name or ERP ID. Each user card shows their role, ERP ID, class/section (for students), and current status.

### Adding a New User
Click **Add User** and fill in the form:
- **Name** — the person's full name.
- **Role** — choose Teacher, Student, Accounts, or Admin.
- **Password** — set an initial password (minimum 6 characters). If left blank, the default password `password123` is used.
- **For Students** — you must also select which class section to enroll them in, and optionally set an admission date.
- **For Teachers** — you can optionally set a designation (e.g., "Mathematics Teacher"). To assign the teacher to sections, use the **checkbox-based section selector**: classes are shown as expandable groups, and you tick each section the teacher should be assigned to. You can assign a teacher to multiple sections across different classes at once.

The ERP ID is automatically generated by the system based on your school code. You do not need to set it manually.

### Editing a User
Click on any user to open their full profile page. From there you can:
- Update their name, ERP ID, password, contact details, and profile picture.
- Change their section enrollment (students) or designation and section assignments (teachers). Section assignments for teachers use the same **checkbox-based multi-select interface** — simply check or uncheck sections to update the assignment.
- Transfer the "primary admin" flag to another admin account.

### Managing User Status
Each user can be individually:
- **Disabled** — The user's account is deactivated. They cannot log in but their data is kept intact. You can re-enable them at any time.
- **Archived** — The user is soft-deleted. They disappear from default listings and cannot log in. You can restore them later.

> The **primary** admin account cannot be disabled or archived to prevent accidental lockout.

---

## Data Import

The Data Import page lets you bulk-upload multiple records at once instead of adding them one by one. This is ideal when onboarding a new school year.

### Downloading a Template
Before uploading, always download the correct template file first. The template shows you exactly which columns are required and in what format. Templates are available for:
- **Students** — columns: Student Name, Class, Section, Contact, Admission Date
- **Teachers** — columns: Teacher Name, Designation, Contact, Assigned Sections
- **Fees** — columns: ERP ID, Student Name, Father Name, Class Name, Section, Total Fee, Amount Paid, Month, Year, Payment Mode, Reference No, Remarks

### Importing Students or Teachers
1. Click **Import Students** (or Teachers).
2. Upload your filled CSV file.
3. The system processes it and shows you how many records were successfully imported.
4. If some rows fail, a CSV error report is automatically downloaded listing which rows had problems and why.

### Importing Fees (Multi-Step Wizard)
Fee import is a guided multi-step process to make sure records match correctly before anything is saved:
1. **Upload** — Upload your fees CSV file.
2. **Validate** — The system checks the data for format errors.
3. **Match** — The system tries to match each row to an existing student by ERP ID and name.
4. **Reconcile** — Additional automatic matching pass.
5. **Resolve Ambiguities** — If any rows could not be matched automatically, you are shown a list and asked to manually pick the correct student for each.
6. **Preview** — Review exactly what will be created (invoices and payments) before anything is saved.
7. **Confirm** — Commit the import. All matched fee records are created in the system.

---

## Academics

This page shows the full academic structure of your school — all classes and their sections.

### What you can do here
- **Add a Class** — Click "Add Class" and give it a name (e.g., `10`, `11`, `LKG`). Class names must be unique within your school.
- **Add a Section** — Inside any class card, click "Add Section" to create a section (e.g., `A`, `B`, `Science`). Section names must be unique within a class.
- **Edit a Class or Section** — Click the Edit button on any class or section to rename it.
- **Delete a Section** — Click the delete icon on a section to remove it. Note: a section can only be deleted if it has no students or timetable entries linked to it.

---

## Time Table

The Timetable section is where you build the weekly class schedule. It has three layers:

### Subjects
First, define the subjects taught in your school (e.g., Mathematics, English, Science). Each subject can optionally have a short code (e.g., MATH).
- Click **Add Subject** to create one.
- To remove a subject, click the delete icon next to it. Subjects with active timetable entries cannot be removed.

### Periods
Periods are the time slots in a school day (e.g., Period 1: 8:00 AM – 8:45 AM, Lunch Break: 1:00 PM – 1:30 PM).
- Click **Add Period** to create a time slot with a name, start time, and end time.
- You can edit or delete periods as needed.

### Timetable Entries
With classes, sections, subjects, teachers, and periods all set up, you can now create timetable entries — each entry connects:
- A **Class + Section** (e.g., Class 10 – Section A)
- A **Subject** (e.g., Mathematics)
- A **Teacher** (e.g., Mr. Rajesh Gupta)
- A **Period** (e.g., Period 1)
- A **Day of the Week** (e.g., Monday)

The system prevents double-booking: a teacher cannot be scheduled in two places at the same time, and a section cannot have two subjects in the same period on the same day.

You can filter the timetable view by class, section, or teacher.

---

## School Settings

This page lets you customize how your school appears in the application.

- **Theme Color** — Choose a brand color that will be used as the accent color across the interface.
- **Description** — Add a short description of your school.
- **Logo URL** — Paste a URL to your school's logo image. The logo will appear in the sidebar and on the login screen.

> Changes here only affect the visual appearance. No user data or academic records are impacted.

---

## Fees

As an Admin, you have visibility into the school's fee data and can also verify UPI payments submitted by students.

### UPI Payment Verification

When a student submits a UPI payment proof (UTR number and optional screenshot) through the app, it appears in a **Pending UPI Payments** queue.

To review and action it:
1. Open the **Fees** section from the sidebar.
2. Navigate to the **Pending UPI Payments** area.
3. Each entry shows the student's name, invoice details, UTR number, amount, and any attached screenshot.
4. Cross-check the UTR with your bank/UPI records.
5. Click **Approve** to confirm — the invoice will be marked as paid and the student is notified.
   Or click **Reject** if the payment cannot be verified.

> Only payments with status **Pending Verification** appear in this queue. Approved and rejected payments move out of the queue automatically.

### Editing and Deleting Fee Records

If a fee record needs to be corrected, you can edit or delete it directly:

- **Edit Invoice** — Update the amount, month, year, due date, or remarks on an existing invoice.
- **Delete Invoice** — Permanently removes the invoice and **all its associated payments**. This cannot be undone.
- **Edit Payment** — Update the amount, payment mode, reference number, or remarks on a recorded payment.
- **Delete Payment** — Removes a single payment record without affecting the invoice.

### Viewing and Downloading Invoices & Receipts

Every row in the Transaction History has a **document icon** (📄) on the right. Clicking it opens a formatted PDF document:

- For an **Invoice** row — opens the full fee invoice showing the student's name, class, invoice number, billing period, amount, balance due, and payment status watermark (PAID / PARTIALLY PAID / PENDING). The invoice includes the school logo and a QR code for authenticity verification.
- For a **Payment** row — opens the payment receipt with the same details plus the payment mode and reference number.

On desktop, the PDF is previewed directly in the browser. On mobile, a **Download PDF** button is provided instead. Both views include a **Download PDF** button to save or print the document.

> For full day-to-day fee management (creating invoices, recording payments), the **Accounts** role has dedicated tools in their panel.


