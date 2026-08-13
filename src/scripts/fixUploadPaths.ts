import fs from 'fs';
import path from 'path';
import { connectDB } from '../config/db';
import { Product } from '../models/Product';
import { Order } from '../models/Order';

const getFilesSet = (dir: string): Set<string> => {
  try {
    return new Set(fs.readdirSync(dir));
  } catch (err) {
    return new Set();
  }
};

const run = async (): Promise<void> => {
  await connectDB();

  const root = path.resolve(__dirname, '..', '..');
  const productsDir = path.join(root, 'uploads', 'products');
  const proofsDir = path.join(root, 'uploads', 'proofs');

  const productsFiles = getFilesSet(productsDir);
  const proofsFiles = getFilesSet(proofsDir);

  console.log('Found', productsFiles.size, 'files in uploads/products');
  console.log('Found', proofsFiles.size, 'files in uploads/proofs');

  const prods = await Product.find().lean();
  let prodChanges = 0;

  for (const p of prods) {
    let updated = false;
    // main image
    if (p.imageUrl && typeof p.imageUrl === 'string') {
      const m = String(p.imageUrl).trim().match(/^\/uploads\/(.+)$/);
      if (m) {
        const fname = m[1];
        if (productsFiles.has(fname)) {
          await Product.updateOne({ _id: p._id }, { $set: { imageUrl: `/uploads/products/${fname}` } });
          updated = true;
        }
      }
    }

    // variant options
    if (p.variantSelector && Array.isArray(p.variantSelector.options)) {
      const options = p.variantSelector.options as any[];
      const newOptions = options.map((opt) => {
        if (!opt || !opt.imageUrl || typeof opt.imageUrl !== 'string') return opt;
        const m = String(opt.imageUrl).trim().match(/^\/uploads\/(.+)$/);
        if (m) {
          const fname = m[1];
          if (productsFiles.has(fname)) {
            return { ...opt, imageUrl: `/uploads/products/${fname}` };
          }
        }
        return opt;
      });

      // compare
      if (JSON.stringify(newOptions) !== JSON.stringify(options)) {
        await Product.updateOne({ _id: p._id }, { $set: { 'variantSelector.options': newOptions } });
        updated = true;
      }
    }

    if (updated) prodChanges += 1;
  }

  console.log('Products updated:', prodChanges);

  // Orders: paymentProofUrl
  const orders = await Order.find().lean();
  let orderChanges = 0;

  for (const o of orders) {
    if (o.paymentProofUrl && typeof o.paymentProofUrl === 'string') {
      const m = String(o.paymentProofUrl).trim().match(/^\/uploads\/(.+)$/);
      if (m) {
        const fname = m[1];
        if (proofsFiles.has(fname)) {
          await Order.updateOne({ _id: o._id }, { $set: { paymentProofUrl: `/uploads/proofs/${fname}` } });
          orderChanges += 1;
        }
      }
    }
  }

  console.log('Orders updated:', orderChanges);

  console.log('Done. Please restart the server and verify uploaded images now resolve.');
  process.exit(0);
};

run().catch((err) => {
  console.error('fixUploadPaths failed:', err);
  process.exit(1);
});
