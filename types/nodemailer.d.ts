declare module "nodemailer" {
  export interface SendMailOptions {
    from?: string
    to?: string | string[]
    subject?: string
    html?: string
    text?: string
  }

  export interface SentMessageInfo {
    messageId?: string
  }

  export interface Transporter {
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>
  }

  export interface TransportOptions {
    service?: string
    auth?: {
      user?: string
      pass?: string
    }
  }

  export function createTransport(options: TransportOptions): Transporter

  const nodemailer: {
    createTransport: typeof createTransport
  }

  export default nodemailer
}
