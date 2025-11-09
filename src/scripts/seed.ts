import { PrismaClient } from "../generated/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Prisma Client
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { phone_number: "+911234567890" },
    update: {},
    create: {
      firebase_uid: "test-user-firebase-uid-12345",
      phone_number: "+911234567890",
      name: "Test User",
      is_admin: false,
    },
  });

  console.log("Created test user:", testUser);

  // Create test admin
  const testAdmin = await prisma.user.upsert({
    where: { phone_number: "+919876543210" },
    update: {},
    create: {
      firebase_uid: "test-admin-firebase-uid-67890",
      phone_number: "+919876543210",
      name: "Test Admin",
      is_admin: true,
    },
  });

  console.log("Created test admin:", testAdmin);

  // Create a test event
  let testEvent = await prisma.event.findFirst({
    where: { name: "Test Event 2025" },
  });

  if (!testEvent) {
    testEvent = await prisma.event.create({
      data: {
        name: "Test Event 2025",
        description: "This is a test event for demonstration purposes",
      },
    });
  }

  console.log("Created test event:", testEvent);

  // Create some test tickets
  const testTickets = ["TEST001", "TEST002", "TEST003", "TEST004", "TEST005"];

  for (const ticketNumber of testTickets) {
    await prisma.ticket.upsert({
      where: { ticket_number: ticketNumber },
      update: {},
      create: {
        ticket_number: ticketNumber,
        event_id: testEvent.id,
      },
    });
  }

  console.log("Created test tickets:", testTickets);

  // Link one ticket to test user
  const ticket = await prisma.ticket.findUnique({
    where: { ticket_number: "TEST001" },
  });

  if (ticket) {
    await prisma.userTicket.upsert({
      where: { ticket_id: ticket.id },
      update: {},
      create: {
        user_id: testUser.id,
        ticket_id: ticket.id,
      },
    });
    console.log("Linked TEST001 to test user");
  }

  // Create some test coupons
  const testCoupons = [
    {
      title: "Early Bird Discount",
      description: "Get 20% off on all purchases",
      code: "EARLY20",
      discount: 20,
    },
    {
      title: "VIP Access",
      description: "Exclusive VIP access coupon",
      code: "VIP2025",
      discount: 15,
    },
    {
      title: "Student Discount",
      description: "Special discount for students",
      code: "STUDENT10",
      discount: 10,
    },
  ];

  for (const coupon of testCoupons) {
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        event_id: testEvent.id,
        code: coupon.code,
      },
    });

    if (!existingCoupon) {
      await prisma.coupon.create({
        data: {
          event_id: testEvent.id,
          title: coupon.title,
          description: coupon.description,
          code: coupon.code,
          discount: coupon.discount,
        },
      });
    }
  }

  console.log("Created test coupons:", testCoupons);

  console.log("\n✅ Seeding completed!");
  console.log("\nTest User Credentials:");
  console.log("  Phone: +911234567890");
  console.log("  Name: Test User");
  console.log("  Firebase UID: test-user-firebase-uid-12345");
  console.log("  Has ticket: TEST001");
  console.log("\nTest Admin Credentials:");
  console.log("  Phone: +919876543210");
  console.log("  Name: Test Admin");
  console.log("  Firebase UID: test-admin-firebase-uid-67890");
  console.log("  Is Admin: true");
  console.log("\nTest Tickets:");
  console.log("  TEST001 (linked to test user)");
  console.log("  TEST002, TEST003, TEST004, TEST005 (available)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
