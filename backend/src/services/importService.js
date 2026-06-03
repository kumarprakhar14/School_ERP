import xlsx from 'xlsx';
import prisma from '../utils/db.js';
import crypto from 'crypto';
import { generateBatchErpIds } from './erpService.js';
import bcrypt from 'bcryptjs';

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
    // Replace newlines with spaces so Excel doesn't hide the text
    const errString = String(e.error || '').replace(/\r?\n|\r/g, ' ');
    const err = `"${errString.replace(/"/g, '""')}"`;
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

  // Validate each row
  data.forEach((row, index) => {
    const rowNum = index + 2; // +1 for 0-index, +1 for header
    const name = String(row['Student Name'] || '').trim();
    const className = String(row['Class'] || '').trim();
    const sectionName = String(row['Section'] || '').trim();
    const contact = String(row['Contact'] || '').trim();
    
    let admissionDate = new Date();
    if (row['Admission Date']) {
      if (typeof row['Admission Date'] === 'number') {
        admissionDate = new Date((row['Admission Date'] - 25569) * 86400 * 1000);
      } else {
        const parsed = new Date(row['Admission Date']);
        if (!isNaN(parsed.getTime())) {
          admissionDate = parsed;
        }
      }
    }

    if (!name) errors.push({ row: rowNum, field: 'Student Name', error: 'Required field missing' });
    if (!className) errors.push({ row: rowNum, field: 'Class', error: 'Required field missing' });

    if (name && className) {
      validRows.push({
        name,
        className,
        sectionName,
        contactDetails: contact || null,
        admissionDate
      });
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
      
      let currentClasses = await tx.class.findMany({
        where: { schoolId },
        include: { sections: true }
      });

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        // Resolve or create Class and Section on the fly
        let cls = currentClasses.find(c => c.name.toLowerCase() === row.className.toLowerCase());
        if (!cls) {
          cls = await tx.class.create({ data: { schoolId, name: row.className }, include: { sections: true } });
          currentClasses.push(cls);
        }

        let sec = null;
        if (row.sectionName) {
          sec = cls.sections.find(s => s.name.toLowerCase() === row.sectionName.toLowerCase());
          if (!sec) {
            sec = await tx.section.create({ data: { classId: cls.id, name: row.sectionName } });
            cls.sections.push(sec);
          }
        }
        
        row.classId = cls.id;
        row.sectionId = sec ? sec.id : null;
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
                sectionId: row.sectionId,
                admissionDate: row.admissionDate
              }
            }
          }
        });
      }
    }, {
      maxWait: 10000,
      timeout: 180000 // 120 seconds
    });
    
    return { success: true, count: validRows.length };
  } catch (error) {
    console.error("IMPORT DB ERROR:", error);
    const errorMsg = error.message || error.toString();
    return { 
      success: false, 
      errors: [{ row: 'All', field: 'Database', error: errorMsg }],
      report: buildErrorReport([{ row: 'All', field: 'Database', error: errorMsg }])
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

  // Section reference format expected: "ClassName-SectionName, ClassName-SectionName"
  // e.g. "10-A, 10-B"
  
  data.forEach((row, index) => {
    const rowNum = index + 2;
    const name = String(row['Teacher Name'] || '').trim();
    const designation = String(row['Designation'] || '').trim();
    const contact = String(row['Contact'] || '').trim();
    const sectionsStr = String(row['Assigned Sections'] || '').trim();

    if (!name) errors.push({ row: rowNum, field: 'Teacher Name', error: 'Required field missing' });

    let pendingSections = [];
    if (sectionsStr) {
      const sectionRefs = sectionsStr.split(',').map(s => s.trim()).filter(Boolean);
      for (const ref of sectionRefs) {
        if (ref.toLowerCase().includes('all section')) {
          continue; // Gracefully bypass strict section validation for global roles
        }
        const parts = ref.split('-');
        if (parts.length !== 2) {
          errors.push({ row: rowNum, field: 'Assigned Sections', error: `Invalid format for section "${ref}". Expected "Class-Section".` });
          continue;
        }
        const [cName, sName] = parts;
        if (!cName.trim() || !sName.trim()) {
          errors.push({ row: rowNum, field: 'Assigned Sections', error: `Invalid format for section "${ref}". Expected "Class-Section".` });
          continue;
        }
        pendingSections.push({ className: cName.trim(), sectionName: sName.trim() });
      }
    }

    if (name && errors.filter(e => e.row === rowNum).length === 0) {
      validRows.push({
        name,
        designation: designation || 'Teacher',
        contactDetails: contact || null,
        pendingSections
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

      let currentClasses = await tx.class.findMany({
        where: { schoolId },
        include: { sections: true }
      });

      let academicYear = await tx.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
      if (!academicYear && validRows.some(r => r.pendingSections.length > 0)) {
        academicYear = await tx.academicYear.create({
          data: {
            schoolId,
            name: 'Default Year',
            startDate: new Date(),
            endDate: new Date(),
            isCurrent: true
          }
        });
      }

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        
        row.assignedSectionIds = [];
        for (const pSec of row.pendingSections) {
          let cls = currentClasses.find(c => c.name.toLowerCase() === pSec.className.toLowerCase());
          if (!cls) {
            cls = await tx.class.create({ data: { schoolId, name: pSec.className }, include: { sections: true } });
            currentClasses.push(cls);
          }
          let sec = cls.sections.find(s => s.name.toLowerCase() === pSec.sectionName.toLowerCase());
          if (!sec) {
            sec = await tx.section.create({ data: { classId: cls.id, name: pSec.sectionName } });
            cls.sections.push(sec);
          }
          row.assignedSectionIds.push(sec.id);
        }
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
                teacherAssignments: (row.assignedSectionIds.length > 0 && academicYear) ? {
                  create: row.assignedSectionIds.map(id => ({ sectionId: id, academicYearId: academicYear.id }))
                } : undefined
              }
            }
          }
        });
      }
    }, {
      maxWait: 10000,
      timeout: 120000 // 120 seconds
    });
    return { success: true, count: validRows.length };
  } catch (error) {
    console.error("IMPORT DB ERROR:", error);
    const errorMsg = error.message || error.toString();
    return { 
      success: false, 
      errors: [{ row: 'All', field: 'Database', error: errorMsg }],
      report: buildErrorReport([{ row: 'All', field: 'Database', error: errorMsg }])
    };
  }
};


export { importStudents,
  importTeachers
 };
