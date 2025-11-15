import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const currencies = [
  { id: 1, cur_symbol: '$', cur_name: 'US Dollar' },
  { id: 2, cur_symbol: '€', cur_name: 'Euro' },
  { id: 3, cur_symbol: '£', cur_name: 'British Pound' },
  { id: 4, cur_symbol: '¥', cur_name: 'Japanese Yen' },
  { id: 5, cur_symbol: '¥', cur_name: 'Chinese Yuan' },
  { id: 6, cur_symbol: 'A$', cur_name: 'Australian Dollar' },
  { id: 7, cur_symbol: 'C$', cur_name: 'Canadian Dollar' },
  { id: 8, cur_symbol: 'CHF', cur_name: 'Swiss Franc' },
  { id: 9, cur_symbol: '₹', cur_name: 'Indian Rupee' },
  { id: 10, cur_symbol: 'S$', cur_name: 'Singapore Dollar' },
  { id: 11, cur_symbol: 'HK$', cur_name: 'Hong Kong Dollar' },
  { id: 12, cur_symbol: 'NZ$', cur_name: 'New Zealand Dollar' },
  { id: 13, cur_symbol: '₩', cur_name: 'South Korean Won' },
  { id: 14, cur_symbol: 'Mex$', cur_name: 'Mexican Peso' },
  { id: 15, cur_symbol: 'R$', cur_name: 'Brazilian Real' },
  { id: 16, cur_symbol: 'R', cur_name: 'South African Rand' },
  { id: 17, cur_symbol: 'kr', cur_name: 'Swedish Krona' },
  { id: 18, cur_symbol: 'kr', cur_name: 'Norwegian Krone' },
  { id: 19, cur_symbol: 'kr', cur_name: 'Danish Krone' },
  { id: 20, cur_symbol: 'zł', cur_name: 'Polish Zloty' },
  { id: 21, cur_symbol: '฿', cur_name: 'Thai Baht' },
  { id: 22, cur_symbol: 'Rp', cur_name: 'Indonesian Rupiah' },
  { id: 23, cur_symbol: 'RM', cur_name: 'Malaysian Ringgit' },
  { id: 24, cur_symbol: '₱', cur_name: 'Philippine Peso' },
  { id: 25, cur_symbol: '₽', cur_name: 'Russian Ruble' },
  { id: 26, cur_symbol: '₺', cur_name: 'Turkish Lira' },
  { id: 27, cur_symbol: 'د.إ', cur_name: 'UAE Dirham' },
  { id: 28, cur_symbol: '﷼', cur_name: 'Saudi Riyal' },
  { id: 29, cur_symbol: '$', cur_name: 'Argentine Peso' },
  { id: 30, cur_symbol: '$', cur_name: 'Chilean Peso' },
];

async function main() {
  console.log('Starting currency seed...');

  // Use upsert to avoid duplicates (update if exists, create if not)
  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { id: currency.id },
      update: {
        cur_symbol: currency.cur_symbol,
        cur_name: currency.cur_name,
      },
      create: {
        id: currency.id,
        cur_symbol: currency.cur_symbol,
        cur_name: currency.cur_name,
      },
    });
  }

  console.log(`✅ Successfully seeded ${currencies.length} currencies`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
