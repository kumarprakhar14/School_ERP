# Super Admin Guide

The Super Admin is the platform-level owner of SchoolChakra. You are responsible for registering schools on the platform, managing their subscription, and overseeing the health of the entire system. You are not tied to any single school — you see everything.

When you log in, you land on the **Super Admin Dashboard** which gives you a bird's-eye view of all schools registered on the platform.

---

## Your Sidebar at a Glance

| Sidebar Item | What it does |
|---|---|
| **Dashboard** | Overview of all schools and platform health |
| **Schools** | Register, manage, and control all school accounts |
| **Administrators** | Create and manage other Super Admin accounts |
| **Bug Reports** | View and action bug reports submitted by users |

---

## Dashboard

The Super Admin Dashboard is your command center. It shows you a summary of all schools on the platform, including how many are active, inactive, or archived. From here you can quickly navigate to any school's detail page.

---

## Schools

This is the most important section for a Super Admin. Here you can see every school registered on the platform listed as a card with its name, status, and subscription details.

### What you can do here

**Register a new school**
Click the **New School** button and fill in the school details:
- School Name — the full name of the school.
- School Code — a short unique code (e.g., "ABC") used to generate ERP IDs for that school's users.
- Valid Until — the subscription expiry date. After this date, non-admin users of that school will not be able to log in.
- Theme Color — choose a brand color for the school's interface.
- Description — an optional short description.
- Admin Name & Password — if you fill these in, the system automatically creates the school's first Admin account with the ERP ID `{code}001` (e.g., `ABC001`). This is the easiest way to set up a new school.

**View a school's details**
Click on any school card to open its full detail page. From there you can see all the users, classes, and settings for that school.

**Control a school's status**
Each school has three independent controls:
- **Disable / Enable** — Disabling a school marks it as INACTIVE. All users except the admin can no longer log in. Enabling it restores access.
- **Archive / Restore** — Archiving soft-deletes the school and hides it from listings. No one can log in to an archived school. You can restore it later.
- **Delete** — This permanently and irreversibly deletes the school along with all its data (users, classes, attendance records, fees, etc.). Use this only as a last resort and only when you are absolutely sure.

**Edit a school's details**
You can update the school's name, subscription expiry date, and appearance settings at any time.

---

## Administrators

This section shows all Super Admin accounts on the platform. You can create additional Super Admin users here if you need more than one person to manage the platform.

- Each Super Admin has a system-wide ERP ID and can log in without being tied to any school.
- You can view each Super Admin's profile, update their information, and manage their account status.
- The **primary** Super Admin account cannot be disabled or archived. To transfer the primary status to another account, edit that account's profile and enable the "Set as Primary" option.

---

## Bug Reports

All users — regardless of their school — can submit bug reports directly from the sidebar using the "Report an Issue" button. Those reports all land here.

### What you can do here

- View all submitted bug reports, including who reported it, which school they belong to, and any screenshots they attached.
- Change the **status** of a bug report:
  - **Open** — newly submitted, not yet reviewed.
  - **In Progress** — acknowledged and being worked on.
  - **Closed** — resolved.
- You can filter reports and paginate through them if there are many.

This section helps you stay on top of user-reported issues across all schools without needing to contact each school individually.
