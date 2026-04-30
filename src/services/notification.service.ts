import { env } from '../config/env';
import { IProduct } from '../models/Product';
import { User } from '../models/User';
import { sendEmail } from './email.service';

export const sendVerificationEmail = async (email: string, token: string): Promise<void> => {
  const verifyLink = `${env.appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  await sendEmail(
    email,
    'Verifica tu cuenta en Mr. Rouben',
    `
      <h2>Bienvenido a Mr. Rouben</h2>
      <p>Para activar tu cuenta y evitar registros automatizados, verifica tu email en el siguiente enlace:</p>
      <p><a href="${verifyLink}">${verifyLink}</a></p>
      <p>Si no solicitaste esta cuenta, ignora este correo.</p>
    `
  );
};

export const sendPasswordResetEmail = async (email: string, token: string): Promise<void> => {
  const resetLink = `${env.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await sendEmail(
    email,
    'Recuperar contraseña – Mr. Rouben',
    `
      <h2>Recuperá tu contraseña</h2>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en Mr. Rouben.</p>
      <p>Hacé clic en el siguiente enlace para crear una nueva contraseña. El enlace es válido por <strong>1 hora</strong>.</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Si no solicitaste este cambio, podés ignorar este correo. Tu contraseña actual no se modificará.</p>
    `
  );
};

export const sendCatalogUpdateEmails = async (
  product: IProduct,
  updateType: 'new_product' | 'restock'
): Promise<void> => {
  const users = await User.find({
    isEmailVerified: true,
    marketingOptIn: true
  }).select('email username');

  if (!users.length) {
    return;
  }

  const subject =
    updateType === 'new_product'
      ? `Nuevo producto en catálogo: ${product.name}`
      : `Volvió el stock: ${product.name}`;

  const intro =
    updateType === 'new_product'
      ? 'Acabamos de sumar un nuevo producto al catálogo.'
      : 'Se renovó el stock de un producto que te puede interesar.';

  await Promise.all(
    users.map((user) =>
      sendEmail(
        user.email,
        subject,
        `
          <h3>Hola ${user.username},</h3>
          <p>${intro}</p>
          <p><strong>${product.name}</strong></p>
          <p>${product.description}</p>
          <p>Precio actual: $${product.price}</p>
          <p><a href="${env.appBaseUrl}/catalogo">Ver catálogo</a></p>
        `
      )
    )
  );
};
