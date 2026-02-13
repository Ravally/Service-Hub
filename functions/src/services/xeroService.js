/**
 * Xero Service
 * OAuth 2.0 authentication and API sync for invoices, payments, and contacts.
 */
const { XeroClient } = require('xero-node');
const admin = require('firebase-admin');

const db = admin.firestore();

function getXeroClient() {
  return new XeroClient({
    clientId: process.env.XERO_CLIENT_ID,
    clientSecret: process.env.XERO_CLIENT_SECRET,
    redirectUris: [process.env.XERO_REDIRECT_URI],
    scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'offline_access'],
  });
}

async function getAuthorizationUrl(userId) {
  const xero = getXeroClient();
  const consentUrl = await xero.buildConsentUrl();
  // Append state param for user identification
  return `${consentUrl}&state=${userId}`;
}

async function exchangeCodeForTokens(code, userId) {
  const xero = getXeroClient();
  const tokenSet = await xero.apiCallback(`${process.env.XERO_REDIRECT_URI}?code=${code}`);
  await xero.updateTenants();
  const tenants = xero.tenants;
  const tenantId = tenants?.[0]?.tenantId || '';
  const orgName = tenants?.[0]?.tenantName || '';

  await db.doc(`users/${userId}/secrets/xero`).set({
    accessToken: tokenSet.access_token,
    refreshToken: tokenSet.refresh_token,
    idToken: tokenSet.id_token || '',
    tenantId,
    expiresAt: new Date(Date.now() + (tokenSet.expires_in || 1800) * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Update frontend-visible connection status
  const settingsRef = db.doc(`users/${userId}/settings/companyDetails`);
  const snap = await settingsRef.get();
  const settings = snap.exists ? snap.data() : {};
  const xeroSettings = settings.integrations?.xero || {};
  await settingsRef.set({
    integrations: {
      ...settings.integrations,
      xero: { ...xeroSettings, connected: true, organizationName: orgName, lastSyncAt: null },
    },
  }, { merge: true });

  return { tenantId, orgName };
}

async function getAuthenticatedClient(userId) {
  const secretSnap = await db.doc(`users/${userId}/secrets/xero`).get();
  if (!secretSnap.exists) throw new Error('Xero not connected');
  const secrets = secretSnap.data();

  const xero = getXeroClient();
  xero.setTokenSet({
    access_token: secrets.accessToken,
    refresh_token: secrets.refreshToken,
    id_token: secrets.idToken || '',
    token_type: 'Bearer',
    expires_at: Math.floor(new Date(secrets.expiresAt).getTime() / 1000),
  });

  // Refresh if expired or close to expiry
  if (new Date(secrets.expiresAt) < new Date(Date.now() + 5 * 60 * 1000)) {
    const newTokenSet = await xero.refreshToken();
    await db.doc(`users/${userId}/secrets/xero`).set({
      accessToken: newTokenSet.access_token,
      refreshToken: newTokenSet.refresh_token,
      expiresAt: new Date(Date.now() + (newTokenSet.expires_in || 1800) * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  return { xero, tenantId: secrets.tenantId };
}

async function syncContact(userId, client) {
  const { xero, tenantId } = await getAuthenticatedClient(userId);
  const contact = {
    name: client.name || 'Unnamed Client',
    emailAddress: client.email || '',
    phones: client.phone ? [{ phoneType: 'DEFAULT', phoneNumber: client.phone }] : [],
    addresses: client.address ? [{ addressType: 'STREET', addressLine1: client.address }] : [],
  };

  const response = await xero.accountingApi.createContacts(tenantId, { contacts: [contact] });
  return response.body.contacts?.[0];
}

async function syncInvoice(userId, invoice, client) {
  const { xero, tenantId } = await getAuthenticatedClient(userId);

  const lineItems = (invoice.lineItems || [])
    .filter(li => li.type !== 'text')
    .map(li => ({
      description: li.description || li.name || '',
      quantity: li.qty || 1,
      unitAmount: li.price || 0,
      accountCode: invoice.revenueAccountCode || '200',
    }));

  const xeroInvoice = {
    type: 'ACCREC',
    contact: { name: client.name || 'Unknown Client' },
    lineItems,
    date: invoice.issueDate ? invoice.issueDate.split('T')[0] : new Date().toISOString().split('T')[0],
    dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : undefined,
    reference: invoice.invoiceNumber || '',
    status: 'AUTHORISED',
  };

  const response = await xero.accountingApi.createInvoices(tenantId, { invoices: [xeroInvoice] });
  const created = response.body.invoices?.[0];
  const syncedAt = new Date().toISOString();

  await db.doc(`users/${userId}/invoices/${invoice.id}`).set({
    accountingSync: { provider: 'xero', externalId: created?.invoiceID || '', syncedAt, syncError: null },
  }, { merge: true });

  return { externalId: created?.invoiceID, syncedAt };
}

async function syncPayment(userId, invoiceExternalId, payment) {
  const { xero, tenantId } = await getAuthenticatedClient(userId);

  const xeroPayment = {
    invoice: { invoiceID: invoiceExternalId },
    account: { code: '090' },
    amount: payment.amount || 0,
    date: payment.createdAt ? payment.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
  };

  await xero.accountingApi.createPayment(tenantId, xeroPayment);
}

async function disconnect(userId) {
  await db.doc(`users/${userId}/secrets/xero`).delete();
  const settingsRef = db.doc(`users/${userId}/settings/companyDetails`);
  const snap = await settingsRef.get();
  const settings = snap.exists ? snap.data() : {};
  await settingsRef.set({
    integrations: {
      ...settings.integrations,
      xero: { connected: false, organizationName: '', lastSyncAt: null, autoSync: false },
    },
  }, { merge: true });
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  getAuthenticatedClient,
  syncContact,
  syncInvoice,
  syncPayment,
  disconnect,
};
