const xlsx = require('xlsx');
const prisma = require('../utils/db');
const { generateBatchErpIds } = require('./erpService');
const bcrypt = require('bcryptjs');

const parseExcel = (buffer) => {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  return data;
};

const buildErrorReport = (errors) => {
  // errors: Array of { row: number, field: string, error: string }
  let csv = 'Row,Field,Error\n';
  errors.forEach(e => {
    // Basic CSV escaping
    const row = e.row;
    const field = `"${String(e.field).replace(/"/g, '""')}"`;
    const err = `"${String(e.error).replace(/"/g, '""')}"`;
    csv += `${row},${field},${err}\n`;
  });
  return csv;
};

const importStudents = async (schoolId, fileBuffer) => {
  const data = parseExcel(fileBuffer);
  const errors = [];
  const validRows = [];
  
  if (data.length === 0) {
    return { success: false, errors: [{ row: 0, field: 'File', error: 'File is empty' }], report: buildErrorReport([{ row: 0, field: 'File', error: 'File is empty' }]) };
  }

  // Pre-fetch all classes and sections for this school
  const schoolClasses = await prisma.class.findMany({
    where: { schoolId },
    include: { sections: true }
  });

  const classMap = new Map();
  schoolClasses.forEach(c => {
    classMap.set(c.name.toLowerCase(), c);
  });

  // Validate each row
  data.forEach((row, index) => {
    const rowNum = index + 2; // +1 for 0-index, +1 for header
    const name = String(row['Student Name'] || '').trim();
    const className = String(row['Class'] || '').trim();
    const sectionName = String(row['Section'] || '').trim();
    const contact = String(row['Contact'] || '').trim();
    const admissionDate = row['Admission Date'] ? new Date(row['Admission Date']) : new Date();

    if (!name) errors.push({ row: rowNum, field: 'Student Name', error: 'Required field missing' });
    if (!className) {
      errors.push({ row: rowNum, field: 'Class', error: 'Required field missing' });
    } else {
      const matchedClass = classMap.get(className.toLowerCase());
      if (!matchedClass) {
        errors.push({ row: rowNum, field: 'Class', error: `Class "${className}" does not exist in this school` });
      } else {
        let matchedSection = null;
        if (sectionName) {
          matchedSection = matchedClass.sections.find(s => s.name.toLowerCase() === sectionName.toLowerCase());
          if (!matchedSection) {
            errors.push({ row: rowNum, field: 'Section', error: `Section "${sectionName}" does not exist in Class "${className}"` });
          }
        }
        
        if (name && matchedClass && (!sectionName || matchedSection)) {
          validRows.push({
            name,
            classId: matchedClass.id,
            sectionId: matchedSection ? matchedSection.id : null,
            contactDetails: contact || null,
            admissionDate
          });
        }
      }
    }
  });

  if (errors.length > 0) {
    return { success: false, errors, report: buildErrorReport(errors) };
  }

  // Proceed with Transactional Insert
  try {
    await prisma.$transaction(async (tx) => {
      const school = await tx.school.findUnique({ where: { id: schoolId } });
      const erpIds = await generateBatchErpIds(tx, schoolId, school.code, validRows.length);
      const passwordHash = await bcrypt.hash('password123', 10);

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const erpId = erpIds[i];

        await tx.user.create({
          data: {
            schoolId,
            erpId,
            passwordHash,
            role: 'STUDENT',
            name: row.name,
            contactDetails: row.contactDetails,
            studentProfile: {
              create: {
                classId: row.classId,
                sectionId: row.sectionId,
                admissionDate: row.admissionDate
              }
            }
          }
        });
      }
    });
    
    return { success: true, count: validRows.length };
  } catch (error) {
    return { 
      success: false, 
      errors: [{ row: 'All', field: 'Database', error: error.message }],
      report: buildErrorReport([{ row: 'All', field: 'Database', error: error.message }])
    };
  }
};

const importTeachers = async (schoolId, fileBuffer) => {
  const data = parseExcel(fileBuffer);
  const errors = [];
  const validRows = [];
  
  if (data.length === 0) {
    return { success: false, errors: [{ row: 0, field: 'File', error: 'File is empty' }], report: buildErrorReport([{ row: 0, field: 'File', error: 'File is empty' }]) };
  }

  // Pre-fetch sections for validation
  const schoolClasses = await prisma.class.findMany({
    where: { schoolId },
    include: { sections: true }
  });

  // Section reference format expected: "ClassName-SectionName, ClassName-SectionName"
  // e.g. "10-A, 10-B"
  
  data.forEach((row, index) => {
    const rowNum = index + 2;
    const name = String(row['Teacher Name'] || '').trim();
    const designation = String(row['Designation'] || '').trim();
    const contact = String(row['Contact'] || '').trim();
    const sectionsStr = String(row['Assigned Sections'] || '').trim();

    if (!name) errors.push({ row: rowNum, field: 'Teacher Name', error: 'Required field missing' });

    let assignedSectionIds = [];
    if (sectionsStr) {
      const sectionRefs = sectionsStr.split(',').map(s => s.trim());
      for (const ref of sectionRefs) {
        const parts = ref.split('-');
        if (parts.length !== 2) {
          errors.push({ row: rowNum, field: 'Assigned Sections', error: `Invalid format for section "${ref}". Expected "Class-Section".` });
          continue;
        }
        const [cName, sName] = parts;
        const matchedClass = schoolClasses.find(c => c.name.toLowerCase() === cName.toLowerCase());
        if (!matchedClass) {
          errors.push({ row: rowNum, field: 'Assigned Sections', error: `Class "${cName}" not found.` });
          continue;
        }
        const matchedSection = matchedClass.sections.find(s => s.name.toLowerCase() === sName.toLowerCase());
        if (!matchedSection) {
          errors.push({ row: rowNum, field: 'Assigned Sections', error: `Section "${sName}" not found in Class "${cName}".` });
          continue;
        }
        assignedSectionIds.push(matchedSection.id);
      }
    }

    if (name && errors.filter(e => e.row === rowNum).length === 0) {
      validRows.push({
        name,
        designation: designation || 'Teacher',
        contactDetails: contact || null,
        assignedSectionIds
      });
    }
  });

  if (errors.length > 0) {
    return { success: false, errors, report: buildErrorReport(errors) };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const school = await tx.school.findUnique({ where: { id: schoolId } });
      const erpIds = await generateBatchErpIds(tx, schoolId, school.code, validRows.length);
      const passwordHash = await bcrypt.hash('password123', 10);

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const erpId = erpIds[i];

        await tx.user.create({
          data: {
            schoolId,
            erpId,
            passwordHash,
            role: 'TEACHER',
            name: row.name,
            contactDetails: row.contactDetails,
            teacherProfile: {
              create: {
                designation: row.designation,
                assignedSections: row.assignedSectionIds.length > 0 ? {
                  connect: row.assignedSectionIds.map(id => ({ id }))
                } : undefined
              }
            }
          }
        });
      }
    });
    return { success: true, count: validRows.length };
  } catch (error) {
    return { 
      success: false, 
      errors: [{ row: 'All', field: 'Database', error: error.message }],
      report: buildErrorReport([{ row: 'All', field: 'Database', error: error.message }])
    };
  }
};

const importFees = async (schoolId, fileBuffer) => {
  const data = parseExcel(fileBuffer);
  const errors = [];
  const validRows = [];
  
  if (data.length === 0) {
    return { success: false, errors: [{ row: 0, field: 'File', error: 'File is empty' }], report: buildErrorReport([{ row: 0, field: 'File', error: 'File is empty' }]) };
  }

  // Pre-fetch all students in this school
  const students = await prisma.user.findMany({
    where: { schoolId, role: 'STUDENT' },
    include: { studentProfile: { include: { class: true } } }
  });

  const validStatuses = ['PENDING', 'PAID', 'OVERDUE'];

  data.forEach((row, index) => {
    const rowNum = index + 2;
    const studentName = String(row['Student Name'] || '').trim();
    const className = String(row['Class Name'] || '').trim();
    
    const amountStr = row['Fee Amount'];
    const amount = parseFloat(amountStr);
    
    const month = parseInt(row['Month'], 10);
    const year = parseInt(row['Year'], 10);
    const status = String(row['Status'] || 'PENDING').trim().toUpperCase();
    const paymentMode = String(row['Payment Mode'] || '').trim() || null;
    const referenceNo = String(row['Reference No'] || '').trim() || null;
    const remarks = String(row['Remarks'] || '').trim() || null;

    let matchedStudentId = null;

    if (!studentName || !className) {
      errors.push({ row: rowNum, field: 'Student Name / Class Name', error: 'Both Student Name and Class Name are required to identify the student' });
    } else {
      // Find matching students
      const matches = students.filter(s => 
        s.name.toLowerCase() === studentName.toLowerCase() && 
        s.studentProfile?.class?.name?.toLowerCase() === className.toLowerCase()
      );

      if (matches.length === 0) {
        errors.push({ row: rowNum, field: 'Student Match', error: `Could not find student "${studentName}" in class "${className}"` });
      } else if (matches.length > 1) {
        errors.push({ row: rowNum, field: 'Student Match', error: `Found multiple students named "${studentName}" in class "${className}". Cannot reliably map fee record.` });
      } else {
        matchedStudentId = matches[0].id;
      }
    }

    if (isNaN(amount) || amount < 0) errors.push({ row: rowNum, field: 'Fee Amount', error: 'Must be a valid positive number' });
    if (isNaN(month) || month < 1 || month > 12) errors.push({ row: rowNum, field: 'Month', error: 'Must be between 1 and 12' });
    if (isNaN(year) || year < 2000 || year > 2100) errors.push({ row: rowNum, field: 'Year', error: 'Must be a valid year' });
    if (!validStatuses.includes(status)) errors.push({ row: rowNum, field: 'Status', error: 'Must be PENDING, PAID, or OVERDUE' });

    if (matchedStudentId && errors.filter(e => e.row === rowNum).length === 0) {
      validRows.push({
        studentId: matchedStudentId,
        amount,
        month,
        year,
        status,
        paymentMode,
        referenceNo,
        remarks,
        paidAt: status === 'PAID' ? new Date() : null
      });
    }
  });

  if (errors.length > 0) {
    return { success: false, errors, report: buildErrorReport(errors) };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of validRows) {
        await tx.feeRecord.create({
          data: {
            schoolId,
            studentId: row.studentId,
            amount: row.amount,
            month: row.month,
            year: row.year,
            status: row.status,
            paymentMode: row.paymentMode,
            referenceNo: row.referenceNo,
            remarks: row.remarks,
            paidAt: row.paidAt
          }
        });
      }
    });
    return { success: true, count: validRows.length };
  } catch (error) {
    return { 
      success: false, 
      errors: [{ row: 'All', field: 'Database', error: error.message }],
      report: buildErrorReport([{ row: 'All', field: 'Database', error: error.message }])
    };
  }
};

module.exports = {
  importStudents,
  importTeachers,
  importFees
};
