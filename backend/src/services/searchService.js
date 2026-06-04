import prisma from '../utils/db.js';

/**
 * Standardize search result format for the frontend
 */
const formatResult = (id, type, title, subtitle = undefined) => ({
  id,
  type,
  title,
  subtitle,
});

/**
 * Prioritize results: Exact ERP ID > Exact Name/Title > Starts With > Contains
 */
const prioritizeResults = (results, query, titleField, erpIdField = null) => {
  const q = query.toLowerCase();

  return results.sort((a, b) => {
    const aTitle = a[titleField]?.toLowerCase() || '';
    const bTitle = b[titleField]?.toLowerCase() || '';
    const aErp = erpIdField && a[erpIdField] ? a[erpIdField].toLowerCase() : '';
    const bErp = erpIdField && b[erpIdField] ? b[erpIdField].toLowerCase() : '';

    const getScore = (title, erp) => {
      if (erp && erp === q) return 4; // Exact ERP ID match
      if (title === q) return 3; // Exact name/title match
      if (erp && erp.startsWith(q)) return 2; // ERP starts with
      if (title.startsWith(q)) return 1; // Name starts with
      return 0; // Contains
    };

    return getScore(bTitle, bErp) - getScore(aTitle, aErp);
  }).slice(0, 10); // Limit to top 10 per entity
};

class SearchService {
  async globalSearch(user, query) {
    const { role, schoolId } = user;

    // The grouped result payload
    const grouped = {
      students: [],
      teachers: [],
      admins: [],
      notices: [],
      assignments: [],
      invoices: [],
      payments: [],
      schools: [],
      accounts: [],
    };

    const searchQueries = [];

    // Helper for contains query
    const containsQ = { contains: query, mode: 'insensitive' };
    
    // Limits
    const takeAmount = 20; // Fetch 20, sort, then slice to 10

    // ----------------------------------------------------
    // ROLE: SUPER_ADMIN
    // ----------------------------------------------------
    if (role === 'SUPER_ADMIN') {
      searchQueries.push(
        prisma.school.findMany({
          where: { OR: [{ name: containsQ }, { code: containsQ }] },
          take: takeAmount,
        }).then(schools => {
          const sorted = prioritizeResults(schools, query, 'name', 'code');
          grouped.schools = sorted.map(s => formatResult(s.id, 'school', s.name, `Code: ${s.code}`));
        })
      );

      searchQueries.push(
        prisma.user.findMany({
          where: { 
            role: { in: ['SUPER_ADMIN', 'ADMIN'] },
            OR: [{ name: containsQ }, { erpId: containsQ }] 
          },
          take: takeAmount,
        }).then(users => {
          const sorted = prioritizeResults(users, query, 'name', 'erpId');
          grouped.admins = sorted.map(u => formatResult(u.id, 'admin', u.name, `ERP: ${u.erpId} | ${u.role}`));
        })
      );
    }

    // ----------------------------------------------------
    // ROLE: ADMIN
    // ----------------------------------------------------
    if (role === 'ADMIN') {
      searchQueries.push(
        prisma.user.findMany({
          where: { schoolId, OR: [{ name: containsQ }, { erpId: containsQ }] },
          take: takeAmount,
        }).then(users => {
          const sorted = prioritizeResults(users, query, 'name', 'erpId');
          users.forEach(u => {
            const formatted = formatResult(u.id, u.role.toLowerCase(), u.name, `ERP: ${u.erpId}`);
            if (u.role === 'STUDENT') grouped.students.push(formatted);
            else if (u.role === 'TEACHER') grouped.teachers.push(formatted);
            else if (u.role === 'ADMIN') grouped.admins.push(formatted);
            else if (u.role === 'ACCOUNTS') grouped.accounts.push(formatted);
          });
          // Sort the arrays because they might have exceeded 10 per sub-type initially
          grouped.students = grouped.students.slice(0, 10);
          grouped.teachers = grouped.teachers.slice(0, 10);
          grouped.admins = grouped.admins.slice(0, 10);
          grouped.accounts = grouped.accounts.slice(0, 10);
        })
      );

      searchQueries.push(
        prisma.feeInvoice.findMany({
          where: { schoolId, OR: [{ invoiceNumber: containsQ }, { student: { name: containsQ } }, { student: { erpId: containsQ } }] },
          include: { student: true },
          take: takeAmount,
        }).then(invoices => {
          const sorted = prioritizeResults(invoices, query, 'invoiceNumber');
          grouped.invoices = sorted.map(i => formatResult(i.id, 'invoice', `Invoice: ${i.invoiceNumber}`, `Student: ${i.student.name} | ERP: ${i.student.erpId}`));
        })
      );

      searchQueries.push(
        prisma.payment.findMany({
          where: { schoolId, OR: [{ id: containsQ }, { invoice: { invoiceNumber: containsQ } }, { invoice: { student: { name: containsQ } } }] },
          include: { invoice: { include: { student: true } } },
          take: takeAmount,
        }).then(payments => {
          const sorted = prioritizeResults(payments, query, 'id');
          grouped.payments = sorted.map(p => formatResult(p.id, 'payment', `Payment: ₹${(p.amount / 100).toFixed(2)}`, `Invoice: ${p.invoice.invoiceNumber}`));
        })
      );

      searchQueries.push(
        prisma.notice.findMany({
          where: { schoolId, title: containsQ },
          take: takeAmount,
        }).then(notices => {
          const sorted = prioritizeResults(notices, query, 'title');
          grouped.notices = sorted.map(n => formatResult(n.id, 'notice', n.title, 'Notice'));
        })
      );
    }

    // ----------------------------------------------------
    // ROLE: ACCOUNTS
    // ----------------------------------------------------
    if (role === 'ACCOUNTS') {
      searchQueries.push(
        prisma.user.findMany({
          where: { schoolId, role: 'STUDENT', OR: [{ name: containsQ }, { erpId: containsQ }] },
          take: takeAmount,
        }).then(students => {
          const sorted = prioritizeResults(students, query, 'name', 'erpId');
          grouped.students = sorted.map(s => formatResult(s.id, 'student', s.name, `ERP: ${s.erpId}`));
        })
      );

      searchQueries.push(
        prisma.feeInvoice.findMany({
          where: { schoolId, OR: [{ invoiceNumber: containsQ }, { student: { name: containsQ } }, { student: { erpId: containsQ } }] },
          include: { student: true },
          take: takeAmount,
        }).then(invoices => {
          const sorted = prioritizeResults(invoices, query, 'invoiceNumber');
          grouped.invoices = sorted.map(i => formatResult(i.id, 'invoice', `Invoice: ${i.invoiceNumber}`, `Student: ${i.student.name}`));
        })
      );

      searchQueries.push(
        prisma.payment.findMany({
          where: { schoolId, OR: [{ id: containsQ }, { invoice: { invoiceNumber: containsQ } }] },
          include: { invoice: { include: { student: true } } },
          take: takeAmount,
        }).then(payments => {
          const sorted = prioritizeResults(payments, query, 'id');
          grouped.payments = sorted.map(p => formatResult(p.id, 'payment', `Payment: ₹${(p.amount / 100).toFixed(2)}`, `Invoice: ${p.invoice.invoiceNumber}`));
        })
      );
    }

    // ----------------------------------------------------
    // ROLE: TEACHER
    // ----------------------------------------------------
    if (role === 'TEACHER') {
      searchQueries.push(
        prisma.user.findMany({
          where: { schoolId, role: { in: ['STUDENT', 'TEACHER'] }, OR: [{ name: containsQ }, { erpId: containsQ }] },
          take: takeAmount,
        }).then(users => {
          const sorted = prioritizeResults(users, query, 'name', 'erpId');
          users.forEach(u => {
            const formatted = formatResult(u.id, u.role.toLowerCase(), u.name, `ERP: ${u.erpId}`);
            if (u.role === 'STUDENT') grouped.students.push(formatted);
            else if (u.role === 'TEACHER') grouped.teachers.push(formatted);
          });
          grouped.students = grouped.students.slice(0, 10);
          grouped.teachers = grouped.teachers.slice(0, 10);
        })
      );

      searchQueries.push(
        prisma.notice.findMany({
          where: { schoolId, title: containsQ, targetRoles: { hasSome: ['TEACHER'] } }, // Simplified permission for search context
          take: takeAmount,
        }).then(notices => {
          const sorted = prioritizeResults(notices, query, 'title');
          grouped.notices = sorted.map(n => formatResult(n.id, 'notice', n.title, 'Notice'));
        })
      );

      searchQueries.push(
        prisma.assignment.findMany({
          where: { schoolId, createdBy: user.id, title: containsQ },
          take: takeAmount,
        }).then(assignments => {
          const sorted = prioritizeResults(assignments, query, 'title');
          grouped.assignments = sorted.map(a => formatResult(a.id, 'assignment', a.title, 'Assignment'));
        })
      );
    }

    // ----------------------------------------------------
    // ROLE: STUDENT
    // ----------------------------------------------------
    if (role === 'STUDENT') {
      searchQueries.push(
        prisma.notice.findMany({
          where: { schoolId, title: containsQ, targetRoles: { hasSome: ['STUDENT'] } },
          take: takeAmount,
        }).then(notices => {
          const sorted = prioritizeResults(notices, query, 'title');
          grouped.notices = sorted.map(n => formatResult(n.id, 'notice', n.title, 'Notice'));
        })
      );

      // We only fetch assignments belonging to sections the student is in
      // To save complex queries, we fetch the student's profile section first, or do a relational lookup
      searchQueries.push(
        prisma.studentProfile.findUnique({ where: { userId: user.id } })
          .then(profile => {
            if (profile) {
              return prisma.assignment.findMany({
                where: { schoolId, sectionId: profile.sectionId, title: containsQ },
                take: takeAmount,
              }).then(assignments => {
                const sorted = prioritizeResults(assignments, query, 'title');
                grouped.assignments = sorted.map(a => formatResult(a.id, 'assignment', a.title, 'Assignment'));
              });
            }
          })
      );
    }

    // Wait for all queries to resolve
    await Promise.all(searchQueries.filter(Boolean)); // filter Boolean in case some are undefined

    // Filter out empty arrays to send a cleaner payload
    const finalGrouped = Object.fromEntries(
      Object.entries(grouped).filter(([key, val]) => val.length > 0)
    );

    return finalGrouped;
  }
}

export default new SearchService();
