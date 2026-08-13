import { connectDB } from '../config/db';
import { Product } from '../models/Product';
import { Order } from '../models/Order';

const shouldApply = process.argv.includes('--apply');

const normalize = (v?: string) => {
  if (!v) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (s.startsWith('http') || s.startsWith('/')) return s;
  return `/uploads/${s}`;
};

const run = async (): Promise<void> => {
  await connectDB();

  console.log('Scanning products for non-normalized imageUrl...');
  const prods = await Product.find({ imageUrl: { $exists: true, $ne: '' } }).lean();
  const prodUpdates: Array<{ id: string; before: string; after: string }> = [];

  for (const p of prods) {
    const before = p.imageUrl || '';
    const after = normalize(before);
    if (before && before !== after) {
      prodUpdates.push({ id: String(p._id), before, after });
    }
  }

  console.log(`Found ${prodUpdates.length} product(s) to update.`);

  console.log('Scanning orders for non-normalized paymentProofUrl...');
  const orders = await Order.find({ paymentProofUrl: { $exists: true, $ne: '' } }).lean();
  const orderUpdates: Array<{ id: string; before: string; after: string }> = [];

  for (const o of orders) {
    const before = o.paymentProofUrl || '';
    const after = normalize(before);
    if (before && before !== after) {
      orderUpdates.push({ id: String(o._id), before, after });
    }
  }

  console.log(`Found ${orderUpdates.length} order(s) to update.`);

  if (!shouldApply) {
    console.log('Dry run. Re-run with `--apply` to perform updates.');
    if (prodUpdates.length) console.table(prodUpdates.slice(0, 20));
    if (orderUpdates.length) console.table(orderUpdates.slice(0, 20));
    process.exit(0);
  }

  console.log('Applying updates...');
  for (const u of prodUpdates) {
    await Product.updateOne({ _id: u.id }, { $set: { imageUrl: u.after } });
  }
  for (const u of orderUpdates) {
    await Order.updateOne({ _id: u.id }, { $set: { paymentProofUrl: u.after } });
  }

  console.log('Updates applied.');
  process.exit(0);
};

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
