import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function hash(pw: string) {
  return argon2.hash(pw, { type: argon2.argon2id });
}

async function main() {
  console.log('Seeding database...');

  const plans = await Promise.all([
    prisma.subscriptionPlan.upsert({ where: { name: 'BASIC' }, create: { name: 'BASIC', maxBranches: 1, maxUsers: 3, priceMonthly: 500 }, update: {} }),
    prisma.subscriptionPlan.upsert({ where: { name: 'PRO' }, create: { name: 'PRO', maxBranches: 3, maxUsers: 10, priceMonthly: 1200 }, update: {} }),
    prisma.subscriptionPlan.upsert({ where: { name: 'ENTERPRISE' }, create: { name: 'ENTERPRISE', maxBranches: 99, maxUsers: 99, priceMonthly: 3000 }, update: {} }),
  ]);
  console.log('  ' + plans.length + ' subscription plans');

  const superAdminPw = process.env.SUPER_ADMIN_PASSWORD ?? 'SuperAdmin@2024!';
  const superAdmin = await prisma.user.upsert({
    where: { username: process.env.SUPER_ADMIN_USERNAME ?? 'superadmin' },
    create: {
      username: process.env.SUPER_ADMIN_USERNAME ?? 'superadmin',
      passwordHash: await hash(superAdminPw),
      fullName: 'Super Administrator',
      role: Role.SUPER_ADMIN,
      isSuperAdmin: true,
      isActive: true,
    },
    update: {},
  });
  console.log('  Super Admin: ' + superAdmin.username);

  const restaurant = await prisma.restaurant.upsert({
    where: { code: 'DEMO001' },
    create: {
      code: 'DEMO001', name: 'مطعم الشرق', phone: '01000000000', governorate: 'القاهرة',
      subscriptionStatus: 'TRIAL',
      subscriptionStart: new Date(),
      subscriptionEnd: new Date(Date.now() + 30 * 86400000),
      planId: plans[1].id,
    },
    update: {},
  });
  console.log('  Restaurant: ' + restaurant.name);

  let branch = await prisma.branch.findFirst({ where: { restaurantId: restaurant.id, name: 'الفرع الرئيسي' } });
  if (!branch) {
    branch = await prisma.branch.create({ data: { restaurantId: restaurant.id, name: 'الفرع الرئيسي', address: 'المهندسين، الجيزة' } });
  }
  console.log('  Branch: ' + branch.name);

  const admin = await prisma.user.upsert({
    where: { username: 'admin_demo' },
    create: {
      restaurantId: restaurant.id, username: 'admin_demo',
      passwordHash: await hash('Admin@1234'), fullName: 'مدير المطعم',
      role: Role.RESTAURANT_ADMIN, isActive: true, permissions: ['*'],
    },
    update: {},
  });
  console.log('  Restaurant Admin: ' + admin.username);

  const cashier = await prisma.user.upsert({
    where: { username: 'cashier_demo' },
    create: {
      restaurantId: restaurant.id, branchId: branch.id, username: 'cashier_demo',
      passwordHash: await hash('Cashier@1234'), fullName: 'كاشير 1',
      role: Role.CASHIER, isActive: true,
      permissions: ['CREATE_ORDER', 'VIEW_ORDERS', 'PRINT_ORDER', 'SEND_INVOICE'],
    },
    update: {},
  });
  console.log('  Cashier: ' + cashier.username);

  const catDefs: [string, number][] = [
    ['دليفري', 0], ['باستا', 1], ['مقبلات', 2], ['وجبات', 3],
    ['فطير حادق', 4], ['فطير حلو', 5], ['كريسبى', 6],
  ];
  const cats = [];
  for (const [name, order] of catDefs) {
    let c = await prisma.category.findFirst({ where: { restaurantId: restaurant.id, name } });
    if (!c) {
      c = await prisma.category.create({ data: { restaurantId: restaurant.id, name, displayOrder: order } });
    }
    cats.push(c);
  }
  console.log('  ' + cats.length + ' categories');

  const products = [
    { name: 'فيرونا باستا', catIdx: 1, basePrice: 220, sizes: [{ name: 'وسط', price: 220 }, { name: 'كبير', price: 300 }] },
    { name: 'الفورنو باستا', catIdx: 1, basePrice: 280, sizes: [{ name: 'كبير', price: 280 }] },
    { name: 'مطير شرقي سحلق', catIdx: 4, basePrice: 265, sizes: [{ name: 'ص', price: 265 }, { name: 'و', price: 310 }, { name: 'ك', price: 355 }] },
    { name: 'مطير شرقي مشروم', catIdx: 4, basePrice: 230, sizes: [{ name: 'ص', price: 230 }, { name: 'و', price: 275 }, { name: 'ك', price: 315 }] },
    { name: 'كول سلو سلاد', catIdx: 2, basePrice: 50, sizes: [] },
    { name: 'راش صوص', catIdx: 2, basePrice: 35, sizes: [] },
  ];
  let created = 0;
  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { restaurantId: restaurant.id, name: p.name } });
    if (!exists) {
      await prisma.product.create({ data: { restaurantId: restaurant.id, categoryId: cats[p.catIdx].id, name: p.name, basePrice: p.basePrice, sizes: p.sizes, isActive: true } });
      created++;
    }
  }
  console.log('  ' + created + ' new products');

  const driverExists = await prisma.driver.findFirst({ where: { restaurantId: restaurant.id, name: 'أحمد السائق' } });
  if (!driverExists) {
    await prisma.driver.create({ data: { restaurantId: restaurant.id, branchId: branch.id, name: 'أحمد السائق', phone: '01111111111', isActive: true } });
  }
  console.log('  Demo driver');

  console.log('');
  console.log('Seed complete!');
  console.log('WARNING: development credentials only - change in production');
}

main().catch(console.error).finally(() => prisma.$disconnect());
