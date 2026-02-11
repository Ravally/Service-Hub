const sgMail = require('@sendgrid/mail');
const { Resend } = require('resend');

// Initialize email providers
let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Email Service for sending emails via Resend or SendGrid
 * Prefers Resend if available, falls back to SendGrid
 */
class EmailService {
  /**
   * Render email template by replacing variables
   * @param {string} template - Template string with {{variables}}
   * @param {object} variables - Variables to replace
   * @returns {string} Rendered template
   */
  renderTemplate(template, variables) {
    let rendered = template;
    Object.keys(variables).forEach(key => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(placeholder, variables[key] || '');
    });
    return rendered;
  }

  /**
   * Send an email via Resend or SendGrid
   * @param {object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.from - Sender email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content
   * @returns {Promise} Email provider response
   */
  async sendEmail({ to, from, subject, html, text }) {
    try {
      const fromEmail = from || process.env.SENDGRID_FROM_EMAIL || 'noreply@servicehub.com';

      // Prefer Resend if available
      if (resend) {
        console.log('Sending email via Resend:', { to, from: fromEmail, subject });
        const response = await resend.emails.send({
          from: fromEmail,
          to,
          subject,
          html,
          text: text || this.htmlToText(html),
        });
        console.log('Resend API Response:', JSON.stringify(response, null, 2));
        console.log('Email sent successfully via Resend - ID:', response.data?.id);
        return response;
      }

      // Fallback to SendGrid
      console.log('Sending email via SendGrid:', { to, subject });
      const msg = {
        to,
        from: fromEmail,
        subject,
        html,
        text: text || this.htmlToText(html),
      };

      const response = await sgMail.send(msg);
      console.log('Email sent successfully via SendGrid');
      return response;
    } catch (error) {
      console.error('Email send error:', error);
      if (error.response) {
        console.error('Provider error response:', error.response.body || error.response);
      }
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Simple HTML to text conversion
   * @param {string} html - HTML content
   * @returns {string} Plain text
   */
  htmlToText(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Send quote email to client
   * @param {object} params - Email parameters
   * @param {string} params.to - Client email
   * @param {object} params.quote - Quote data
   * @param {object} params.client - Client data
   * @param {object} params.company - Company settings
   * @param {object} params.templates - Email templates
   * @returns {Promise} Email send result
   */
  async sendQuoteEmail({ to, quote, client, company, templates }) {
    const variables = {
      clientName: client.name || 'Valued Customer',
      companyName: company.name || 'Service Hub',
      quoteNumber: quote.quoteNumber || quote.id.substring(0, 8),
      total: this.formatCurrency(quote.total),
      quoteLink: quote.approvalLink || '',
    };

    const subject = this.renderTemplate(
      templates.quoteSubject || 'Quote {{quoteNumber}} from {{companyName}}',
      variables
    );

    const html = this.renderTemplate(
      templates.quoteBody || this.getDefaultQuoteTemplate(),
      variables
    );

    // Use verified sender email from env, fallback to company email
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || company.email || 'noreply@servicehub.com';

    return this.sendEmail({
      to,
      from: fromEmail,
      subject,
      html,
    });
  }

  /**
   * Send invoice email to client
   * @param {object} params - Email parameters
   * @param {string} params.to - Client email
   * @param {object} params.invoice - Invoice data
   * @param {object} params.client - Client data
   * @param {object} params.company - Company settings
   * @param {object} params.templates - Email templates
   * @returns {Promise} Email send result
   */
  async sendInvoiceEmail({ to, invoice, client, company, templates }) {
    const variables = {
      clientName: client.name || 'Valued Customer',
      companyName: company.name || 'Service Hub',
      invoiceNumber: invoice.invoiceNumber || invoice.id.substring(0, 8),
      total: this.formatCurrency(invoice.total),
      dueDate: this.formatDate(invoice.dueDate),
      paymentLink: invoice.paymentLink || '',
    };

    const subject = this.renderTemplate(
      templates.invoiceSubject || 'Invoice {{invoiceNumber}} from {{companyName}}',
      variables
    );

    const html = this.renderTemplate(
      templates.invoiceBody || this.getDefaultInvoiceTemplate(),
      variables
    );

    // Use verified sender email from env, fallback to company email
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || company.email || 'noreply@servicehub.com';

    return this.sendEmail({
      to,
      from: fromEmail,
      subject,
      html,
    });
  }

  /**
   * Format currency
   * @param {number} amount - Amount to format
   * @returns {string} Formatted currency
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
    }).format(amount || 0);
  }

  /**
   * Format date
   * @param {string} date - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-NZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Default quote email template
   * @returns {string} HTML template
   */
  getDefaultQuoteTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #428bca; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #428bca; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{companyName}}</h1>
    </div>
    <div class="content">
      <h2>Hello {{clientName}},</h2>
      <p>Thank you for your interest! We've prepared a quote for you.</p>
      <p><strong>Quote Number:</strong> {{quoteNumber}}</p>
      <p><strong>Total:</strong> {{total}}</p>
      <p>Please review and approve your quote by clicking the button below:</p>
      <center>
        <a href="{{quoteLink}}" class="button">View & Approve Quote</a>
      </center>
      <p>If you have any questions, please don't hesitate to contact us.</p>
      <p>Best regards,<br>{{companyName}}</p>
    </div>
    <div class="footer">
      <p>This is an automated message from {{companyName}}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Default invoice email template
   * @returns {string} HTML template
   */
  getDefaultInvoiceTemplate() {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #428bca; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{companyName}}</h1>
    </div>
    <div class="content">
      <h2>Hello {{clientName}},</h2>
      <p>Thank you for your business! Here's your invoice.</p>
      <p><strong>Invoice Number:</strong> {{invoiceNumber}}</p>
      <p><strong>Total:</strong> {{total}}</p>
      <p><strong>Due Date:</strong> {{dueDate}}</p>
      <p>You can view and pay your invoice by clicking the button below:</p>
      <center>
        <a href="{{paymentLink}}" class="button">View & Pay Invoice</a>
      </center>
      <p>Thank you for choosing {{companyName}}!</p>
      <p>Best regards,<br>{{companyName}}</p>
    </div>
    <div class="footer">
      <p>This is an automated message from {{companyName}}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

module.exports = new EmailService();
