const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  // Sample ProductTrend data (views and purchases for a few products over last 10 days)
  const productTrends = [
    { productId: 'prod-1', date: new Date('2025-08-28'), views: 50, purchases: 2 },
    { productId: 'prod-1', date: new Date('2025-09-01'), views: 120, purchases: 5 },
    { productId: 'prod-1', date: new Date('2025-09-05'), views: 80, purchases: 3 },
    { productId: 'prod-2', date: new Date('2025-08-30'), views: 30, purchases: 1 },
    { productId: 'prod-2', date: new Date('2025-09-02'), views: 90, purchases: 4 },
    { productId: 'prod-2', date: new Date('2025-09-06'), views: 60, purchases: 2 },
  ];

  // Sample VisitorLog data (visits over last 7 days)
  const visitorLogs = [
    { sessionId: 'sess-1', ip: '192.168.1.1', userAgent: 'Chrome', path: '/products', country: 'US', createdAt: new Date('2025-09-01T10:00:00Z') },
    { sessionId: 'sess-1', ip: '192.168.1.1', userAgent: 'Chrome', path: '/cart', country: 'US', createdAt: new Date('2025-09-01T10:05:00Z') },
    { sessionId: 'sess-2', ip: '192.168.1.2', userAgent: 'Firefox', path: '/products', country: 'US', createdAt: new Date('2025-09-02T12:00:00Z') },
    { sessionId: 'sess-3', ip: '192.168.1.3', userAgent: 'Safari', path: '/home', country: 'CA', createdAt: new Date('2025-09-03T14:00:00Z') },
    { sessionId: 'sess-4', ip: '192.168.1.4', userAgent: 'Edge', path: '/products', country: 'US', createdAt: new Date('2025-09-04T16:00:00Z') },
    { sessionId: 'sess-5', ip: '192.168.1.5', userAgent: 'Chrome', path: '/checkout', country: 'UK', createdAt: new Date('2025-09-05T18:00:00Z') },
    { sessionId: 'sess-6', ip: '192.168.1.6', userAgent: 'Firefox', path: '/products', country: 'US', createdAt: new Date('2025-09-06T20:00:00Z') },
    { sessionId: 'sess-7', ip: '192.168.1.7', userAgent: 'Safari', path: '/home', country: 'CA', createdAt: new Date('2025-09-07T22:00:00Z') },
  ];

  await prisma.productTrend.createMany({ data: productTrends });
  await prisma.visitorLog.createMany({ data: visitorLogs });

  console.log('Seeded sample data for ProductTrend and VisitorLog');
}

seed().catch(console.error).finally(() => prisma.$disconnect());