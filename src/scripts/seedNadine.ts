import { connectDB } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/User';

const run = async (): Promise<void> => {
  await connectDB();

  const email = env.nadineEmail.toLowerCase();

  const existing = await User.findOne({ email }).select('+password');

  if (existing) {
    existing.role = 'admin';
    existing.username = 'Nadine';
    existing.phone = existing.phone || '5491100000000';
    existing.isEmailVerified = true;
    existing.emailVerificationToken = '';
    await existing.save();
    console.log('Nadine actualizada como admin.');
    process.exit(0);
  }

  await User.create({
    username: 'Nadine',
    email,
    phone: '5491100000000',
    password: 'Nadine1234!',
    role: 'admin',
    isEmailVerified: true,
    emailVerificationToken: '',
    marketingOptIn: true
  });

  console.log('Nadine admin creada. Cambia la contraseña tras el primer login.');
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
