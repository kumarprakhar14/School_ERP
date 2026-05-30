const generateNextErpId = async (prisma, schoolId, schoolCode) => {
  const maxUser = await prisma.user.findFirst({
    where: {
      schoolId,
      erpId: { startsWith: schoolCode }
    },
    orderBy: { erpId: 'desc' }
  });

  if (maxUser && maxUser.erpId) {
    const maxIdNum = parseInt(maxUser.erpId, 10);
    if (!isNaN(maxIdNum)) {
      return (maxIdNum + 1).toString();
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
  const startingIdNum = parseInt(startingErpIdStr, 10);
  
  const erpIds = [];
  for (let i = 0; i < count; i++) {
    erpIds.push((startingIdNum + i).toString());
  }
  
  return erpIds;
};

module.exports = {
  generateNextErpId,
  generateBatchErpIds
};
