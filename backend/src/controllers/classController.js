const prisma = require('../utils/db');

// Get all classes and sections for the school
const getClasses = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        sections: {
          include: {
            teachers: { include: { user: { select: { id: true, name: true, erpId: true } } } },
            students: { include: { user: { select: { id: true, name: true, erpId: true } } } }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new class
const createClass = async (req, res) => {
  try {
    const { name } = req.body;
    const schoolId = req.user.schoolId;

    const newClass = await prisma.class.create({
      data: { name, schoolId },
      include: { sections: true }
    });
    res.status(201).json(newClass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Create a new section under a class
const createSection = async (req, res) => {
  try {
    const { classId } = req.params;
    const { name } = req.body;

    const section = await prisma.section.create({
      data: { name, classId }
    });
    res.status(201).json(section);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a section
const deleteSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    await prisma.section.delete({
      where: { id: sectionId }
    });
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({ message: 'Cannot delete section because it contains students or is linked to other records.' });
    }
    res.status(400).json({ message: error.message });
  }
};

// Update a class
const updateClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const { name } = req.body;
    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: { name }
    });
    res.json(updatedClass);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a section
const updateSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { name } = req.body;
    const updatedSection = await prisma.section.update({
      where: { id: sectionId },
      data: { name }
    });
    res.json(updatedSection);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getClasses, createClass, createSection, deleteSection, updateClass, updateSection };
