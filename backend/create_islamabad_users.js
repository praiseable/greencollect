/**
 * Script to create Islamabad dealer and customer accounts
 * Run with: node create_islamabad_users.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Creating Islamabad test accounts...\n');

  try {
    // Find Islamabad geoZone
    const islamabadZone = await prisma.geoZone.findUnique({
      where: { slug: 'islamabad' }
    });

    if (!islamabadZone) {
      console.error('❌ Islamabad geoZone not found. Please run seed script first.');
      process.exit(1);
    }

    console.log(`✅ Found Islamabad zone: ${islamabadZone.name} (${islamabadZone.id})\n`);

    // ── 1. Create Islamabad Dealer ──
    const dealerPhone = '+923001234567';
    const dealerEmail = 'islamabad.dealer@kabariya.pk';

    // Check if dealer already exists
    const existingDealer = await prisma.user.findUnique({
      where: { phone: dealerPhone }
    });

    if (existingDealer) {
      console.log(`⚠️  Dealer with phone ${dealerPhone} already exists. Skipping...`);
    } else {
      const dealer = await prisma.user.create({
        data: {
          firstName: 'Ahmed',
          lastName: 'Islamabad Dealer',
          displayName: 'Ahmed Islamabad Dealer',
          phone: dealerPhone,
          email: dealerEmail,
          role: 'DEALER',
          city: 'Islamabad',
          geoZoneId: islamabadZone.id,
          isActive: true,
          isVerified: true,
          accountStatus: 'ACTIVE',
          cnicNumber: '12345-1234567-1',
          businessName: 'Islamabad Recycling Center',
          businessAddress: 'G-8 Markaz, Islamabad',
          simOwnerName: 'Ahmed',
          simVerified: true,
          criminalCheckStatus: 'CLEARED',
          requiredDeposit: 0,
          depositPaid: true,
          depositAmount: 5000,
          depositPaidAt: new Date(),
          kycSubmittedAt: new Date(),
          kycApprovedAt: new Date(),
        },
      });

      // Create wallet with initial balance (PKR 10,000)
      await prisma.wallet.create({
        data: {
          userId: dealer.id,
          balancePaisa: BigInt(1000000), // 10,000 PKR in paisa
          currencyId: 'PKR',
        },
      });

      // Assign territory
      await prisma.dealerTerritory.create({
        data: {
          userId: dealer.id,
          geoZoneId: islamabadZone.id,
        },
      });

      console.log('✅ Created Islamabad Dealer:');
      console.log(`   Name: ${dealer.firstName} ${dealer.lastName}`);
      console.log(`   Phone: ${dealer.phone}`);
      console.log(`   Email: ${dealer.email}`);
      console.log(`   Role: ${dealer.role}`);
      console.log(`   Wallet Balance: PKR 10,000`);
      console.log(`   Territory: ${islamabadZone.name}\n`);
    }

    // ── 2. Create Islamabad Customer ──
    const customerPhone = '+923001234568';
    const customerEmail = 'islamabad.customer@kabariya.pk';

    // Check if customer already exists
    const existingCustomer = await prisma.user.findUnique({
      where: { phone: customerPhone }
    });

    if (existingCustomer) {
      console.log(`⚠️  Customer with phone ${customerPhone} already exists. Skipping...`);
    } else {
      const customer = await prisma.user.create({
        data: {
          firstName: 'Ali',
          lastName: 'Islamabad Customer',
          displayName: 'Ali Islamabad Customer',
          phone: customerPhone,
          email: customerEmail,
          role: 'CUSTOMER',
          city: 'Islamabad',
          geoZoneId: islamabadZone.id,
          isActive: true,
          isVerified: true,
          accountStatus: 'ACTIVE',
        },
      });

      console.log('✅ Created Islamabad Customer:');
      console.log(`   Name: ${customer.firstName} ${customer.lastName}`);
      console.log(`   Phone: ${customer.phone}`);
      console.log(`   Email: ${customer.email}`);
      console.log(`   Role: ${customer.role}`);
      console.log(`   City: ${customer.city}\n`);
    }

    console.log('📱 Login Credentials:');
    console.log('\n   ── DEALER (Pro App) ──');
    console.log(`   Phone: ${dealerPhone}`);
    console.log(`   OTP: Use test OTP (check backend logs or ALLOW_TEST_OTP=true)`);
    console.log('\n   ── CUSTOMER (Customer App) ──');
    console.log(`   Phone: ${customerPhone}`);
    console.log(`   OTP: Use test OTP (check backend logs or ALLOW_TEST_OTP=true)`);
    console.log('\n✅ Done! Both accounts are ready for testing.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
