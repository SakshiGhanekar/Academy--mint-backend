const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper: build buckets between start and end (inclusive) by interval (days)
function buildBuckets(startISO, endISO, intervalDays) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const buckets = [];
  let cur = new Date(start);
  while (cur <= end) {
    const bucketStart = new Date(cur);
    const bucketEnd = new Date(cur);
    bucketEnd.setDate(bucketEnd.getDate() + intervalDays);
    if (bucketEnd > end) bucketEnd.setTime(end.getTime());
    buckets.push({ startDate: bucketStart.toISOString().split('T')[0], endDate: bucketEnd.toISOString().split('T')[0] });
    cur.setDate(cur.getDate() + intervalDays);
  }
  return buckets;
}

// /dashboard/products?startDate=2025-09-01&endDate=2025-09-07&bucket=day
async function dashboardProducts(req, res) {
  try {
    const { startDate, endDate, bucket = 'day' } = req.query;
    const start = startDate || '2025-09-01';
    const end = endDate || '2025-09-07';
    const intervalDays = bucket === 'week' ? 7 : bucket === 'month' ? 30 : 1;
    const buckets = buildBuckets(start, end, intervalDays);

    // Current total products (total Product records)
    const currentTotal = await prisma.product.count();

    const trend = [];
    for (const b of buckets) {
      const from = new Date(b.startDate);
      const to = new Date(b.endDate);

      // Total products with trends in this period
      const totalProducts = await prisma.productTrend.count({
        where: { date: { gte: from, lte: to } },
      });

      // Products added (new ProductTrend created in period)
      const productsAdded = await prisma.productTrend.count({
        where: { date: { gte: from, lte: to } },
      }); // Assuming added means new trends, adjust if needed

      // Products removed (placeholder, set to 0)
      const productsRemoved = 0; // Not implemented, as no delete tracking

      trend.push({
        startDate: b.startDate,
        endDate: b.endDate,
        totalProducts,
        productsAdded,
        productsRemoved,
      });
    }

    return res.json({ currentTotal, trend });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error building product dashboard' });
  }
}

// /dashboard/visitors?startDate=2025-09-01&endDate=2025-09-07&bucket=day
async function dashboardVisitors(req, res) {
  try {
    const { startDate, endDate, bucket = 'day' } = req.query;
    const start = startDate || '2025-09-01';
    const end = endDate || '2025-09-07';
    const intervalDays = bucket === 'week' ? 7 : bucket === 'month' ? 30 : 1;
    const buckets = buildBuckets(start, end, intervalDays);

    // Total visitors (total VisitorLog records)
    const totalVisitors = await prisma.visitorLog.count();

    const visitorsByBucket = [];
    for (const b of buckets) {
      const from = new Date(b.startDate);
      const to = new Date(b.endDate);

      // Visitors in this bucket (total visits)
      const visitors = await prisma.visitorLog.count({ where: { createdAt: { gte: from, lte: to } } });

      visitorsByBucket.push({
        startDate: b.startDate,
        endDate: b.endDate,
        visitors,
      });
    }

    return res.json({ totalVisitors, visitorsByBucket });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error building visitor dashboard' });
  }
}

module.exports = { dashboardProducts, dashboardVisitors };