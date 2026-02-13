/**
 * QuickBooks Online Service
 * OAuth 2.0 authentication and API sync for invoices, payments, and contacts.
 */
const OAuthClient = require('intuit-oauth');
const admin = require('firebase-admin');

const db = admin.firestore();

function getOAuthClient() {
  return new OAuthClient({
    clientId: process.env.QUICKBOOKS_CLIENT_ID,
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
    environment: process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox',
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI,
  });
}

async function getAuthorizationUrl(userId) {
  const oauthClient = getOAuthClient();
  return oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: userId,
  });
}

async function exchangeCodeForTokens(url, userId) {
  const oauthClient = getOAuthClient();
  const authResponse = await oauthClient.createToken(url);
  const tokens = authResponse.getJson();
  const realmId = oauthClient.getToken().realmId;

  await db.doc(`users/${userId}/secrets/quickbooks`).set({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    realmId,
    tokenType: tokens.token_type,
    expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + tokens.x_refresh_token_expires_in * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Update frontend-visible connection status
  const settingsRef = db.doc(`users/${userId}/settings/companyDetails`);
  const snap = await settingsRef.get();
  const settings = snap.exists ? snap.data() : {};
  const qb = settings.integrations?.quickbooks || {};
  await settingsRef.set({
    integrations: {
      ...settings.integrations,
      quickbooks: { ...qb, connected: true, companyName: realmId, lastSyncAt: null },
    },
  }, { merge: true });

  return { realmId };
}

async function getAuthenticatedClient(userId) {
  const secretSnap = await db.doc(`users/${userId}/secrets/quickbooks`).get();
  if (!secretSnap.exists) throw new Error('QuickBooks not connected');
  const secrets = secretSnap.data();

  const oauthClient = getOAuthClient();
  oauthClient.setToken({
    access_token: secrets.accessToken,
    refresh_token: secrets.refreshToken,
    token_type: secrets.tokenType || 'bearer',
    realmId: secrets.realmId,
  });

  // Refresh if expired or close to expiry
  if (new Date(secrets.expiresAt) < new Date(Date.now() + 5 * 60 * 1000)) {
    const refreshResponse = await oauthClient.refresh();
    const newTokens = refreshResponse.getJson();
    await db.doc(`users/${userId}/secrets/quickbooks`).set({
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token,
      expiresAt: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  return { oauthClient, realmId: secrets.realmId };
}

async function syncContact(userId, client) {
  const { oauthClient, realmId } = await getAuthenticatedClient(userId);
  const baseUrl = oauthClient.environment === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';

  const customerBody = {
    DisplayName: client.name || 'Unnamed Client',
    PrimaryEmailAddr: client.email ? { Address: client.email } : undefined,
    PrimaryPhone: client.phone ? { FreeFormNumber: client.phone } : undefined,
    BillAddr: client.address ? { Line1: client.address } : undefined,
  };

  const response = await oauthClient.makeApiCall({
    url: `${baseUrl}/v3/company/${realmId}/customer`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerBody),
  });

  return JSON.parse(response.text()).Customer;
}

async function syncInvoice(userId, invoice, client) {
  const { oauthClient, realmId } = await getAuthenticatedClient(userId);
  const baseUrl = oauthClient.environment === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';

  const lineItems = (invoice.lineItems || [])
    .filter(li => li.type !== 'text')
    .map(li => ({
      Amount: (li.qty || 1) * (li.price || 0),
      DetailType: 'SalesItemLineDetail',
      Description: li.description || li.name || '',
      SalesItemLineDetail: {
        Qty: li.qty || 1,
        UnitPrice: li.price || 0,
      },
    }));

  const invoiceBody = {
    CustomerRef: { value: client.qboCustomerId || '1' },
    Line: lineItems,
    DueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : undefined,
    DocNumber: invoice.invoiceNumber || undefined,
    TxnDate: invoice.issueDate ? invoice.issueDate.split('T')[0] : undefined,
  };

  const response = await oauthClient.makeApiCall({
    url: `${baseUrl}/v3/company/${realmId}/invoice`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoiceBody),
  });

  const qboInvoice = JSON.parse(response.text()).Invoice;
  const syncedAt = new Date().toISOString();

  await db.doc(`users/${userId}/invoices/${invoice.id}`).set({
    accountingSync: { provider: 'quickbooks', externalId: String(qboInvoice.Id), syncedAt, syncError: null },
  }, { merge: true });

  return { externalId: qboInvoice.Id, syncedAt };
}

async function syncPayment(userId, invoiceExternalId, payment, realmId) {
  const { oauthClient, realmId: realm } = await getAuthenticatedClient(userId);
  const baseUrl = oauthClient.environment === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';

  const paymentBody = {
    TotalAmt: payment.amount || 0,
    Line: [{ Amount: payment.amount || 0, LinkedTxn: [{ TxnId: invoiceExternalId, TxnType: 'Invoice' }] }],
  };

  await oauthClient.makeApiCall({
    url: `${baseUrl}/v3/company/${realm}/payment`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentBody),
  });
}

async function disconnect(userId) {
  await db.doc(`users/${userId}/secrets/quickbooks`).delete();
  const settingsRef = db.doc(`users/${userId}/settings/companyDetails`);
  const snap = await settingsRef.get();
  const settings = snap.exists ? snap.data() : {};
  await settingsRef.set({
    integrations: {
      ...settings.integrations,
      quickbooks: { connected: false, companyName: '', lastSyncAt: null, autoSync: false },
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
