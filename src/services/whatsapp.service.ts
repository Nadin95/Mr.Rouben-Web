import qrcode from 'qrcode-terminal';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { env } from '../config/env';
import { IOrder } from '../models/Order';

class WhatsAppService {
  private client: Client | null = null;
  private isReady = false;

  public initialize(): void {
    if (!env.whatsappEnabled) {
      console.log('WhatsApp service disabled by config.');
      return;
    }

    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: 'mr-rouben' })
    });

    this.client.on('qr', (qr) => {
      console.log('Escanea este QR para iniciar WhatsApp bot:');
      qrcode.generate(qr, { small: true });
    });

    this.client.on('ready', () => {
      this.isReady = true;
      console.log('WhatsApp client ready');
    });

    this.client.on('auth_failure', (message) => {
      console.error('WhatsApp auth failure:', message);
    });

    this.client.initialize().catch((error) => {
      console.error('Error initializing WhatsApp client:', error);
    });
  }

  private normalizePhone(phone: string): string {
    const onlyDigits = phone.replace(/\D/g, '');
    return `${onlyDigits}@c.us`;
  }

  public async sendMessage(phone: string, message: string): Promise<void> {
    if (!this.client || !this.isReady) {
      console.log('WhatsApp not ready. Message skipped:', message);
      return;
    }

    const to = this.normalizePhone(phone);
    await this.client.sendMessage(to, message);
  }

  public async sendPaymentInstructionsToCustomer(order: IOrder): Promise<void> {
    const lines = order.items
      .map((item) => `- ${item.titleSnapshot} x${item.quantity}: $${item.unitPrice * item.quantity}`)
      .join('\n');

    const message = [
      `Hola! Gracias por tu compra en Mr. Rouben.`,
      `Pedido ID: ${order._id}`,
      'Detalle:',
      lines,
      `Total: $${order.total}`,
      `Alias para transferencia: ${env.bankTransferAlias}`,
      'Envia el comprobante por este mismo chat para validar el pago.'
    ].join('\n');

    await this.sendMessage(order.customerPhone, message);
  }

  public async notifyAdminNewOrder(order: IOrder): Promise<void> {
    if (!env.whatsappAdminPhone) {
      return;
    }

    const message = [
      'Nuevo pedido pendiente de validacion.',
      `Pedido ID: ${order._id}`,
      `Total: $${order.total}`,
      `Estado: ${order.status}`,
      `Telefono cliente: ${order.customerPhone}`
    ].join('\n');

    await this.sendMessage(env.whatsappAdminPhone, message);
  }

  public async sendPaymentApprovedToCustomer(order: IOrder): Promise<void> {
    const message = [
      'Pago recibido y validado correctamente.',
      `Pedido ID: ${order._id}`,
      'Tu pedido ya esta en preparacion. Gracias por confiar en Mr. Rouben.'
    ].join('\n');

    await this.sendMessage(order.customerPhone, message);
  }

  public async notifyAdminForumRequest(payload: {
    postId: string;
    categoryTag: string;
    productName: string;
    username: string;
  }): Promise<void> {
    if (!env.whatsappAdminPhone) {
      return;
    }

    const message = [
      'Nueva solicitud de conversacion en Comunidad.',
      `Post ID: ${payload.postId}`,
      `Categoria: ${payload.categoryTag}`,
      `Producto: ${payload.productName}`,
      `Usuario: ${payload.username}`,
      'Ingresa al panel admin para habilitar el inicio del chat.'
    ].join('\n');

    await this.sendMessage(env.whatsappAdminPhone, message);
  }
}

export const whatsappService = new WhatsAppService();
