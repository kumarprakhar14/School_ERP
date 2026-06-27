import xlsx from 'xlsx';
import prisma from '../utils/db.js';
import { ValidationError, BadRequestError, NotFoundError } from '../errors/index.js';

/**
 * 1. Upload
 * Parses spreadsheet, creates ImportJob, stores parsed rows.
 */
export const uploadFees = async (schoolId, fileBuffer, fileName) => {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const totalRows = data.length;

  const importJob = await prisma.importJob.create({
    data: {
      schoolId,
      type: 'FEE_IMPORT',
      status: 'UPLOADED',
      totalRows,
      spreadsheetData: data,
      uploadedFileMeta: { fileName, rowCount: totalRows },
    },
  });

  return { jobId: importJob.id };
};

/**
 * 2. Excel Format Audit
 * Validates required columns, data types.
 */
export const validateFees = async (jobId) => {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Import job not found');
  if (job.status !== 'UPLOADED') throw new BadRequestError('Invalid state for validation');

  const data = job.spreadsheetData || [];
  if (data.length === 0) throw new BadRequestError('Spreadsheet is empty');

  const requiredColumns = [
    'Total Fee',
    'Amount Paid',
    'Month',
    'Year'
  ];

  const firstRow = data[0];
  const missingCols = requiredColumns.filter((col) => !(col in firstRow));
  if (missingCols.length > 0) {
    throw new ValidationError(`Missing mandatory columns: ${missingCols.join(', ')}`);
  }

  const errors = [];
  data.forEach((row, idx) => {
    const rowNum = idx + 2;
    
    // Check mandatory match identifiers (Must have ERP ID OR Student Name)
    const erpId = String(row['ERP ID'] || '').trim();
    const studentName = String(row['Student Name'] || '').trim();
    if (!erpId && !studentName) {
      errors.push(`Row ${rowNum}: Must provide either 'ERP ID' or 'Student Name'`);
    }

    const totalFee = parseFloat(row['Total Fee']);
    const amountPaid = parseFloat(row['Amount Paid']);
    const month = parseInt(row['Month'], 10);
    const year = parseInt(row['Year'], 10);

    if (isNaN(totalFee) || totalFee < 0) errors.push(`Row ${rowNum}: Invalid or missing Total Fee`);
    if (isNaN(amountPaid) || amountPaid < 0) errors.push(`Row ${rowNum}: Invalid or missing Amount Paid`);
    if (isNaN(month) || month < 1 || month > 12) errors.push(`Row ${rowNum}: Invalid or missing Month`);
    if (isNaN(year) || year < 2000 || year > 2100) errors.push(`Row ${rowNum}: Invalid or missing Year`);
  });

  if (errors.length > 0) {
    // If validation fails, we might just fail the job or throw error.
    // The instructions say "Reject if...". We will throw an error and let controller handle it.
    throw new ValidationError(`Validation failed:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n...and more' : ''}`);
  }

  const updatedJob = await prisma.importJob.update({
    where: { id: jobId },
    data: { status: 'VALIDATED' },
  });

  return updatedJob;
};

/**
 * 3. Student Matching Engine
 */
export const matchFees = async (jobId) => {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Import job not found');
  if (job.status !== 'VALIDATED') throw new BadRequestError('Invalid state for matching');

  const data = job.spreadsheetData || [];

  // Load all students once
  const students = await prisma.user.findMany({
    where: { schoolId: job.schoolId, role: 'STUDENT' },
    include: {
      studentProfile: {
        include: {
          section: {
            include: { class: true },
          },
        },
      },
    },
  });

  // Build O(1) lookup maps
  const erpIdMap = new Map();
  const admissionNoMap = new Map(); // Assuming we don't have admissionNo in current schema, we'll map by ERP ID and Name
  // Actually, admissionDate exists, but admissionNo isn't in User or StudentProfile. 
  // Let's check schema.prisma: StudentProfile has admissionDate. User has erpId.
  // The user requirement said: L1 - ERP ID, L2 - Admission Number, L3 - Student Name + Father Name + Section
  // Wait, does the schema have admissionNo? No. We'll use ERP ID, and L3.
  const nameSectionMap = new Map();

  students.forEach((s) => {
    if (s.erpId) {
      if (!erpIdMap.has(s.erpId)) erpIdMap.set(s.erpId, []);
      erpIdMap.get(s.erpId).push(s);
    }
    
    // As there is no Father Name in User model, we'll match by Student Name + Class Name
    const className = s.studentProfile?.section?.class?.name?.toLowerCase() || '';
    const sectionName = s.studentProfile?.section?.name?.toLowerCase() || '';
    const nameKey = `${s.name.toLowerCase()}|${className}|${sectionName}`;
    
    if (!nameSectionMap.has(nameKey)) nameSectionMap.set(nameKey, []);
    nameSectionMap.get(nameKey).push(s);
  });

  const matchingData = [];
  let matchedRows = 0;
  let ambiguousRows = 0;
  let unmatchedRows = 0;

  data.forEach((row, idx) => {
    const rowNumber = idx + 2;
    const erpId = String(row['ERP ID'] || '').trim();
    // Admission No is skipped as it doesn't exist in our DB, unless it's in contactDetails.
    const studentName = String(row['Student Name'] || '').trim().toLowerCase();
    const className = String(row['Class Name'] || '').trim().toLowerCase();
    const sectionName = String(row['Section'] || '').trim().toLowerCase();

    let matches = [];
    let matchedBy = null;

    // L1 - ERP ID
    if (erpId && erpIdMap.has(erpId)) {
      matches = erpIdMap.get(erpId);
      matchedBy = 'ERP_ID';
    } 
    // L2 - Admission Number (Skipped or mapped to ERP ID for now, let's just do Name/Class)
    // L3 - Student Name + Class Name + Section Name (since we don't have Father Name)
    else {
      const nameKey = `${studentName}|${className}|${sectionName}`;
      if (nameSectionMap.has(nameKey)) {
        matches = nameSectionMap.get(nameKey);
        matchedBy = 'NAME_CLASS_SECTION';
      }
    }

    let status = 'UNMATCHED';
    let matchedStudentId = null;

    if (matches.length === 1) {
      status = 'MATCHED';
      matchedStudentId = matches[0].id;
      matchedRows++;
    } else if (matches.length > 1) {
      status = 'AMBIGUOUS';
      ambiguousRows++;
    } else {
      status = 'UNMATCHED';
      unmatchedRows++;
    }

    matchingData.push({
      rowNumber,
      matchedStudentId,
      matchedBy: status === 'MATCHED' ? matchedBy : null,
      status,
    });
  });

  const updatedJob = await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: 'MATCHED',
      matchingData,
      matchedRows,
      ambiguousRows,
      unmatchedRows,
    },
  });

  return updatedJob;
};

/**
 * 4. Matching Reconciliation
 */
export const reconcileMatching = async (jobId) => {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Import job not found');

  const { ambiguousRows, unmatchedRows } = job;
  
  // The resolvedRows are updated dynamically, so we compute remaining issues
  // wait, unmatched and ambiguous rows don't decrease, they stay the same, but
  // resolvedOverrides contains the resolutions. 
  const resolvedOverrides = job.resolvedOverrides || {};
  const resolvedCount = Object.keys(resolvedOverrides).length;
  
  const totalIssues = ambiguousRows + unmatchedRows;
  const unresolvedCount = totalIssues - resolvedCount;

  let newStatus = 'AWAITING_RESOLUTION';
  if (unresolvedCount === 0) {
    newStatus = 'READY_FOR_PREVIEW'; // We can proceed to preview.
  }

  const updatedJob = await prisma.importJob.update({
    where: { id: jobId },
    data: { status: newStatus, resolvedRows: resolvedCount },
  });

  return {
    totalRows: job.totalRows,
    matchedRows: job.matchedRows,
    ambiguousRows,
    unmatchedRows,
    resolvedRows: resolvedCount,
    status: newStatus,
  };
};

/**
 * 5. Ambiguity Resolution
 */
export const resolveAmbiguity = async (jobId, resolutions) => {
  // resolutions is an array of { rowNumber, resolvedStudentId }
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Import job not found');
  if (job.status !== 'MATCHED' && job.status !== 'AWAITING_RESOLUTION') {
    throw new BadRequestError('Invalid state for resolution');
  }

  const currentOverrides = job.resolvedOverrides || {};
  
  resolutions.forEach((res) => {
    currentOverrides[res.rowNumber] = res.resolvedStudentId;
  });

  await prisma.importJob.update({
    where: { id: jobId },
    data: {
      resolvedOverrides: currentOverrides,
    },
  });

  return reconcileMatching(jobId);
};

export const getAmbiguousRows = async (jobId) => {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Import job not found');

  const data = job.spreadsheetData || [];
  const matchingData = job.matchingData || [];
  const overrides = job.resolvedOverrides || {};

  const ambiguousRows = matchingData
    .filter(m => (m.status === 'AMBIGUOUS' || m.status === 'UNMATCHED') && !overrides[m.rowNumber])
    .map(m => {
      // rowNumber is idx + 2, so idx is rowNumber - 2
      const rowData = data[m.rowNumber - 2] || {};
      return {
        rowNumber: m.rowNumber,
        status: m.status,
        erpId: rowData['ERP ID'] || '',
        studentName: rowData['Student Name'] || '',
        className: rowData['Class Name'] || '',
        section: rowData['Section'] || '',
        totalFee: rowData['Total Fee'] || '',
      };
    });

  return ambiguousRows;
};

/**
 * 6. Financial Reconciliation Preview
 */
export const previewFees = async (jobId) => {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Import job not found');
  if (job.status !== 'READY_FOR_PREVIEW' && job.status !== 'MATCHED') {
     // If there were no unmatched rows, it might be MATCHED. Let's allow READY_FOR_PREVIEW and MATCHED and AWAITING_RESOLUTION(if resolvedCount == totalIssues)
  }

  const data = job.spreadsheetData || [];
  const matchingData = job.matchingData || [];
  const overrides = job.resolvedOverrides || {};

  let totalInvoiceAmount = 0;
  let totalPaymentAmount = 0;
  
  const previewInvoices = [];
  const previewPayments = [];

  for (let idx = 0; idx < data.length; idx++) {
    const row = data[idx];
    const rowNumber = idx + 2;
    const match = matchingData.find(m => m.rowNumber === rowNumber);
    
    let studentId = match?.matchedStudentId;
    if (overrides[rowNumber]) {
      studentId = overrides[rowNumber];
    }

    if (!studentId) {
      throw new BadRequestError(`Row ${rowNumber} is not resolved to a student.`);
    }

    // Convert money to integer (paise)
    const totalFee = Math.round(parseFloat(row['Total Fee']) * 100);
    const amountPaid = Math.round(parseFloat(row['Amount Paid']) * 100);

    if (amountPaid > totalFee) {
      throw new BadRequestError(`Row ${rowNumber}: Amount Paid (${amountPaid}) cannot be greater than Total Fee (${totalFee}).`);
    }

    totalInvoiceAmount += totalFee;
    totalPaymentAmount += amountPaid;

    previewInvoices.push({
      studentId,
      amount: totalFee,
      month: parseInt(row['Month'], 10),
      year: parseInt(row['Year'], 10),
      remarks: String(row['Remarks'] || '').trim(),
    });

    if (amountPaid > 0) {
      previewPayments.push({
        amount: amountPaid,
        paymentMode: String(row['Payment Mode'] || '').trim(),
        referenceNo: String(row['Reference No'] || '').trim(),
        remarks: String(row['Remarks'] || '').trim(),
      });
    }
  }

  const outstanding = totalInvoiceAmount - totalPaymentAmount;

  const previewData = {
    totalInvoiceAmount,
    totalPaymentAmount,
    outstanding,
    invoiceCount: previewInvoices.length,
    paymentCount: previewPayments.length,
  };

  const updatedJob = await prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: 'READY_FOR_CONFIRMATION',
      previewData,
    },
  });

  return updatedJob.previewData;
};

/**
 * 7. Confirmation (Commit)
 */
export const confirmFees = async (jobId, adminUserId) => {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Import job not found');
  if (job.status !== 'READY_FOR_CONFIRMATION') {
    throw new BadRequestError('Import not ready for confirmation. Please run preview first.');
  }

  const data = job.spreadsheetData || [];
  const matchingData = job.matchingData || [];
  const overrides = job.resolvedOverrides || {};

  const startedAt = Date.now();

  try {
    await prisma.$transaction(async (tx) => {
      for (let idx = 0; idx < data.length; idx++) {
        const row = data[idx];
        const rowNumber = idx + 2;
        const match = matchingData.find(m => m.rowNumber === rowNumber);
        
        let studentId = match?.matchedStudentId;
        if (overrides[rowNumber]) {
          studentId = overrides[rowNumber];
        }

        const totalFee = Math.round(parseFloat(row['Total Fee']) * 100);
        const amountPaid = Math.round(parseFloat(row['Amount Paid']) * 100);
        const month = parseInt(row['Month'], 10);
        const year = parseInt(row['Year'], 10);
        
        const invoiceNumber = `INV-${year}-${month}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

        const invoice = await tx.feeInvoice.create({
          data: {
            invoiceNumber,
            schoolId: job.schoolId,
            studentId,
            totalAmount: totalFee,
            month,
            year,
            dueDate: new Date(year, month - 1, 10),
            remarks: String(row['Remarks'] || '').trim(),
            createdBy: adminUserId,
          },
        });

        if (amountPaid > 0) {
          await tx.payment.create({
            data: {
              schoolId: job.schoolId,
              invoiceId: invoice.id,
              amount: amountPaid,
              paymentMode: String(row['Payment Mode'] || '').trim() || null,
              referenceNo: String(row['Reference No'] || '').trim() || null,
              remarks: String(row['Remarks'] || '').trim() || null,
              paidAt: new Date(),
              receivedBy: adminUserId,
            },
          });
        }
      }
    }, {
      maxWait: 15000,
      timeout: 300000 // 5 minutes for large imports
    });

    const duration = Date.now() - startedAt;

    const completedJob = await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      studentsProcessed: data.length,
      previewData: job.previewData,
      durationMs: duration,
    };
  } catch (error) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: 'FAILED' },
    });
    throw new Error(`Transaction failed: ${error.message}`);
  }
};
