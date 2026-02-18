const functions = require('firebase-functions');
const Anthropic = require('@anthropic-ai/sdk').default;
const prompts = require('./prompts');

const VALID_ACTIONS = Object.keys(prompts);

/**
 * scaffldAI — Callable Cloud Function for all AI actions.
 * Accepts { action, input, context } and returns { result }.
 */
exports.scaffldAI = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in to use AI features.');
  }

  const { action, input, context: businessContext } = data;

  if (!action || !VALID_ACTIONS.includes(action)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}`
    );
  }

  if (!input) {
    throw new functions.https.HttpsError('invalid-argument', 'Input is required.');
  }

  const apiKey = functions.config().anthropic?.key || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'AI features require an Anthropic API key. Set it with: firebase functions:config:set anthropic.key=YOUR_KEY'
    );
  }

  const client = new Anthropic({ apiKey });
  const systemPrompt = prompts[action];

  // Build user message with business context if provided
  let userMessage = input;
  if (businessContext && typeof businessContext === 'object') {
    const contextStr = Object.entries(businessContext)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    userMessage = `Context:\n${contextStr}\n\nRequest:\n${input}`;
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const result = response.content[0]?.text || '';
    return { result };
  } catch (error) {
    console.error('Anthropic API error:', error);
    throw new functions.https.HttpsError('internal', 'AI request failed. Please try again.');
  }
});
