const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkReports() {
  try {
    const reports = await prisma.report.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${reports.length} reports in the database:`);
    console.log(JSON.stringify(reports, null, 2));
  } catch (error) {
    console.error('Error checking reports:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReports();
