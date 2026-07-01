-- CreateEnum
CREATE TYPE "CalendarDayStatus" AS ENUM ('WORKING', 'HOLIDAY', 'VACATION');

-- CreateTable
CREATE TABLE "AcademicCalendarOverride" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "CalendarDayStatus" NOT NULL,
    "reason" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicCalendarOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicCalendarOverride_schoolId_idx" ON "AcademicCalendarOverride"("schoolId");

-- CreateIndex
CREATE INDEX "AcademicCalendarOverride_schoolId_startDate_endDate_idx" ON "AcademicCalendarOverride"("schoolId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "AcademicCalendarOverride" ADD CONSTRAINT "AcademicCalendarOverride_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicCalendarOverride" ADD CONSTRAINT "AcademicCalendarOverride_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
