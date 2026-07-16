import crypto from 'crypto';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { User } from '../models/User';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/notification.service';
import { signToken } from '../services/jwt.service';

const TOKEN_COOKIE_NAME = 'token';

const disposableDomains = new Set([
  'mailinator.com',
  'guerrillamail.com',
  'tempmail.com',
  '10minutemail.com',
  'yopmail.com',
  'dispostable.com'
]);

const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

const clearAuthCookie = (res: Response): void => {
  res.clearCookie(TOKEN_COOKIE_NAME);
};

const buildUserPayload = (user: {
  _id: unknown;
  username: string;
  email: string;
  role: 'user' | 'admin';
}) => ({
  id: user._id,
  username: user.username,
  email: user.email,
  role: user.role
});

const isLikelyPersonalEmail = (email: string): boolean => {
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) {
    return false;
  }

  const domain = parts[1];
  if (disposableDomains.has(domain)) {
    return false;
  }

  return true;
};

const issueVerification = async (email: string): Promise<string> => {
  const token = crypto.randomBytes(24).toString('hex');
  await sendVerificationEmail(email, token);
  return token;
};

const normalizePhone = (countryCodeRaw: string, phoneRaw: string): string | null => {
  const ccDigits = String(countryCodeRaw || '').replace(/\D/g, '');
  const phoneDigits = String(phoneRaw || '').replace(/\D/g, '');

  if (!ccDigits || phoneDigits.length < 6 || phoneDigits.length > 14) {
    return null;
  }

  return `+${ccDigits}${phoneDigits}`;
};

export const register = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { username, email, password, phone, countryCode, marketingOptIn } = req.body;

    if (!username || !email || !password || !phone) {
      return res.status(400).json({
        message: 'username, email, password y phone son obligatorios'
      });
    }

    const normalizedPhone = normalizePhone(String(countryCode || ''), String(phone));
    if (!normalizedPhone) {
      return res.status(400).json({
        message: 'Telefono invalido. Selecciona codigo de pais y numero valido.'
      });
    }

    if (!isLikelyPersonalEmail(String(email))) {
      return res.status(400).json({
        message: 'Debes registrarte con un email personal válido para evitar bots'
      });
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const role = User.assignRoleByIdentity(String(username), String(email));
    
    // IMPORTANTE: Enviar email PRIMERO, antes de crear el usuario
    // Si el email falla, no se crea el usuario
    let verificationToken = '';
    if (role !== 'admin') {
      verificationToken = await issueVerification(String(email).toLowerCase());
    }

    // SOLO si el email se envió exitosamente (o es admin), crear el usuario
    const user = await User.create({
      username,
      email: String(email).toLowerCase(),
      phone: normalizedPhone,
      password,
      role,
      marketingOptIn: marketingOptIn !== false,
      isEmailVerified: role === 'admin',
      emailVerificationToken: role === 'admin' ? '' : verificationToken
    });

    const token = signToken({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    });

    setAuthCookie(res, token);

    return res.status(201).json({
      message:
        role === 'admin'
          ? 'Usuario admin registrado correctamente'
          : 'Usuario registrado. Revisa tu email para verificar la cuenta.',
      token,
      user: buildUserPayload(user)
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[Register Error]', errorMessage);
    
    // Si falla el envío de email, devolver error específico
    if (errorMessage.includes('email') || errorMessage.includes('mail') || errorMessage.includes('Resend')) {
      return res.status(500).json({ 
        message: 'No pudimos enviar el email de verificación. Por favor, intenta de nuevo más tarde.',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }

    return res.status(500).json({ message: 'Error al registrar usuario', error: errorMessage });
  }
};

export const login = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email y password son obligatorios' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (!user.isEmailVerified && user.role !== 'admin') {
      return res.status(403).json({
        message: 'Debes verificar tu email antes de iniciar sesión'
      });
    }

    const token = signToken({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    });

    setAuthCookie(res, token);

    return res.status(200).json({
      message: 'Login exitoso',
      token,
      user: buildUserPayload(user)
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al iniciar sesión', error });
  }
};

export const loginWeb = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
    if (!user) {
      res.status(401).render('pages/login', {
        title: 'Ingresar',
        error: 'Credenciales inválidas',
        notice: '',
        formData: { email }
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).render('pages/login', {
        title: 'Ingresar',
        error: 'Credenciales inválidas',
        notice: '',
        formData: { email }
      });
      return;
    }

    if (!user.isEmailVerified && user.role !== 'admin') {
      res.status(403).render('pages/login', {
        title: 'Ingresar',
        error: 'Debes verificar tu email antes de iniciar sesión.',
        notice: '',
        formData: { email }
      });
      return;
    }

    const token = signToken({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    });

    setAuthCookie(res, token);

    if (user.role === 'admin' && user.username.toLowerCase() === 'nadine') {
      res.redirect('/admin');
      return;
    }

    res.redirect('/');
  } catch {
    res.status(500).render('pages/login', {
      title: 'Ingresar',
      error: 'No se pudo iniciar sesión. Intentá nuevamente.',
      notice: '',
      formData: { email: '' }
    });
  }
};

export const registerWeb = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, phone, countryCode } = req.body;
    const marketingOptIn = req.body.marketingOptIn === 'on';

    if (!username || !email || !password || !phone) {
      res.status(400).render('pages/register', {
        title: 'Crear cuenta',
        error: 'Completá todos los campos',
        notice: '',
        formData: { username, email, countryCode: countryCode || '+54', phone, marketingOptIn }
      });
      return;
    }

    const normalizedPhone = normalizePhone(String(countryCode || ''), String(phone));
    if (!normalizedPhone) {
      res.status(400).render('pages/register', {
        title: 'Crear cuenta',
        error: 'Número inválido. Elegí código de país y un teléfono válido.',
        notice: '',
        formData: { username, email, countryCode: countryCode || '+54', phone, marketingOptIn }
      });
      return;
    }

    if (!isLikelyPersonalEmail(String(email))) {
      res.status(400).render('pages/register', {
        title: 'Crear cuenta',
        error: 'Usa un email personal válido para evitar bots.',
        notice: '',
        formData: { username, email, countryCode: countryCode || '+54', phone, marketingOptIn }
      });
      return;
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      res.status(409).render('pages/register', {
        title: 'Crear cuenta',
        error: 'Ese email ya está en uso',
        notice: '',
        formData: { username, email, countryCode: countryCode || '+54', phone, marketingOptIn }
      });
      return;
    }

    const role = User.assignRoleByIdentity(String(username), String(email));
    const verificationToken = role === 'admin' ? '' : await issueVerification(String(email).toLowerCase());

    const user = await User.create({
      username,
      email: String(email).toLowerCase(),
      phone: normalizedPhone,
      password,
      role,
      marketingOptIn,
      isEmailVerified: role === 'admin',
      emailVerificationToken: verificationToken
    });

    const token = signToken({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role
    });

    setAuthCookie(res, token);

    if (user.role === 'admin' && user.username.toLowerCase() === 'nadine') {
      res.redirect('/admin');
      return;
    }

    res.redirect('/login?notice=Revisa tu email y verifica la cuenta para completar el alta');
  } catch {
    res.status(500).render('pages/register', {
      title: 'Crear cuenta',
      error: 'No se pudo crear la cuenta. Intentá nuevamente.',
      notice: '',
      formData: {
        username: '',
        email: '',
        countryCode: '+54',
        phone: '',
        marketingOptIn: true
      }
    });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const token = String(req.query.token || '');

  if (!token) {
    res.status(400).render('pages/verify-email', {
      title: 'Verificación de Email',
      success: false,
      message: 'Token inválido o faltante.'
    });
    return;
  }

  const user = await User.findOne({ emailVerificationToken: token });

  if (!user) {
    res.status(404).render('pages/verify-email', {
      title: 'Verificación de Email',
      success: false,
      message: 'No encontramos un registro válido para ese token.'
    });
    return;
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = '';
  await user.save();

  res.render('pages/verify-email', {
    title: 'Verificación de Email',
    success: true,
    message: 'Tu email fue verificado correctamente. Ya puedes iniciar sesión.'
  });
};

export const logout = (_req: Request, res: Response): void => {
  clearAuthCookie(res);
  res.redirect('/');
};

export const resendVerification = async (req: Request, res: Response): Promise<Response> => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email requerido' });
  }

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  if (user.isEmailVerified) {
    return res.status(200).json({ message: 'Este email ya está verificado' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  user.emailVerificationToken = token;
  await user.save();

  await sendVerificationEmail(user.email, token);

  return res.status(200).json({ message: 'Email de verificación reenviado' });
};

export const requestPasswordResetWeb = async (req: Request, res: Response): Promise<void> => {
  const renderForm = (error = '', notice = '') =>
    res.render('pages/forgot-password', {
      title: '¿Olvidaste tu contraseña?',
      error,
      notice
    });

  if (req.method === 'GET') {
    renderForm();
    return;
  }

  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      renderForm('Ingresá un email válido.');
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Respuesta genérica: no revelamos si el email existe o no
    if (!user) {
      renderForm('', 'Si ese email está registrado, recibirás un enlace en breve.');
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = expires;
    await user.save();

    await sendPasswordResetEmail(user.email, resetToken);

    renderForm('', 'Si ese email está registrado, recibirás un enlace en breve.');
  } catch {
    renderForm('Error al procesar la solicitud. Intentá nuevamente.');
  }
};

export const resetPasswordWeb = async (req: Request, res: Response): Promise<void> => {
  const token = String(req.query.token || req.body.token || '');

  const renderForm = (error = '', success = false) =>
    res.render('pages/reset-password', {
      title: 'Nueva contraseña',
      error,
      success,
      token
    });

  if (req.method === 'GET') {
    if (!token) {
      res.redirect('/forgot-password');
      return;
    }
    renderForm();
    return;
  }

  try {
    const { password, passwordConfirm } = req.body;

    if (!token) {
      renderForm('Enlace inválido o expirado. Solicitá uno nuevo.');
      return;
    }

    if (!password || password.length < 8) {
      renderForm('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== passwordConfirm) {
      renderForm('Las contraseñas no coinciden.');
      return;
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      renderForm('El enlace expiró o ya fue usado. Solicitá uno nuevo.');
      return;
    }

    user.password = password;
    user.passwordResetToken = '';
    user.passwordResetExpires = null;
    // El usuario demostró acceso al email al usar el link → marcar como verificado
    user.isEmailVerified = true;
    user.emailVerificationToken = '';
    await user.save();

    renderForm('', true);
  } catch {
    renderForm('Error al actualizar la contraseña. Intentá nuevamente.');
  }
};
