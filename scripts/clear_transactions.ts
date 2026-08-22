import prisma from '../src/lib/prisma';

async function main() {
  console.log('Clearing transaction tables...');
  
  // Delete in order to respect foreign key constraints
  await prisma.estimateItem.deleteMany();
  await prisma.orderAcceptance.deleteMany();
  await prisma.deliveryItem.deleteMany();
  await prisma.invoiceItem.deleteMany();
  
  await prisma.estimate.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.invoice.deleteMany();
  
  await prisma.project.deleteMany();
  
  // Also reset sequence tracker
  await prisma.sequenceTracker.deleteMany();
  
  console.log('Transaction tables cleared successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // We cannot disconnect the global instance gracefully if it's tied to an adapter, but this should be fine in a script.
    process.exit(0);
  });
