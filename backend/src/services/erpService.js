const generateNextErpId = async (prisma, schoolId, schoolCode) => {
  // For SUPER_ADMIN, schoolId and schoolCode will be null/undefined.
  if (!schoolCode) {
    const maxAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      orderBy: { erpId: 'desc' }
    });
    if (maxAdmin && maxAdmin.erpId) {
      const numericPart = maxAdmin.erpId.substring(2); // Remove "SA"
      const maxIdNum = parseInt(numericPart, 10);
      if (!isNaN(maxIdNum)) {
        return 'SA' + (maxIdNum + 1).toString().padStart(3, '0');
      }
    }
    return 'SA001';
  }

  const maxUser = await prisma.user.findFirst({
    where: {
      schoolId,
      erpId: { startsWith: schoolCode }
    },
    orderBy: { erpId: 'desc' }
  });

  if (maxUser && maxUser.erpId) {
    const numericPart = maxUser.erpId.substring(schoolCode.length);
    const maxIdNum = parseInt(numericPart, 10);
    if (!isNaN(maxIdNum)) {
      return schoolCode + (maxIdNum + 1).toString().padStart(3, '0');
    }
  }
  
  return `${schoolCode}001`;
};

/**
 * Generates an array of sequential ERP IDs for a batch operation.
 * @param {Object} prisma - Prisma transaction or client
 * @param {string} schoolId - The school ID
 * @param {string} schoolCode - The school's unique code
 * @param {number} count - Number of ERP IDs needed
 * @returns {Promise<string[]>} - Array of sequential ERP IDs
 */
const generateBatchErpIds = async (prisma, schoolId, schoolCode, count) => {
  const startingErpIdStr = await generateNextErpId(prisma, schoolId, schoolCode);
  const numericPart = startingErpIdStr.substring(schoolCode.length);
  const startingIdNum = parseInt(numericPart, 10);
  
  const erpIds = [];
  for (let i = 0; i < count; i++) {
    erpIds.push(schoolCode + (startingIdNum + i).toString().padStart(3, '0'));
  }
  
  return erpIds;
};

module.exports = {
  generateNextErpId,
  generateBatchErpIds
};
