// Clamp Chat — Firebase callable function with Claude tool-use conversation loop
const functions = require('firebase-functions');
const Anthropic = require('@anthropic-ai/sdk').default;
const prompts = require('./prompts');
const { CLAMP_TOOLS, executeTool } = require('./clampTools');

const MAX_MESSAGES = 50;
const MAX_TOOL_ITERATIONS = 8;

/**
 * Build the system prompt with today's date injected.
 */
function buildSystemPrompt() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-NZ', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Pacific/Auckland',
  });
  const timeStr = now.toLocaleTimeString('en-NZ', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Pacific/Auckland',
  });
  return `${prompts.clampChat}\n\nCurrent date and time: ${dateStr}, ${timeStr} (NZ time).`;
}

/**
 * Extract the text reply and any navigation action cards from a Claude response.
 */
function parseResponse(response, toolResults) {
  const textBlocks = response.content.filter(b => b.type === 'text');
  const reply = textBlocks.map(b => b.text).join('\n').trim();

  // Collect navigation actions from the tool results accumulated during the loop
  const actionCards = toolResults
    .filter(r => r.toolName === 'navigate_user')
    .map(r => ({
      type: 'navigation',
      label: r.result.entityType
        ? `View ${r.result.entityType}`
        : `Go to ${r.result.view}`,
      view: r.result.view,
      entityId: r.result.entityId,
      entityType: r.result.entityType,
    }));

  return { reply: reply || 'Done.', actionCards };
}

/**
 * clampChat — Callable Cloud Function.
 * Receives { messages: [{role, content}] } and returns { reply, actionCards, quickReplies }.
 */
exports.clampChat = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in to use Clamp.');
    }

    const userId = context.auth.uid;
    const messages = data.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Messages array is required.');
    }

    if (messages.length > MAX_MESSAGES) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Conversation is at the limit. Start a new chat.'
      );
    }

    const apiKey = functions.config().anthropic?.key || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Clamp is being set up — check back soon.'
      );
    }

    const client = new Anthropic({ apiKey });
    const systemPrompt = buildSystemPrompt();

    // Sanitize messages to only include role + content
    let conversationMessages = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    try {
      let iterations = 0;
      let response;
      const allToolResults = [];

      while (iterations < MAX_TOOL_ITERATIONS) {
        response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          tools: CLAMP_TOOLS,
          messages: conversationMessages,
        });

        if (response.stop_reason !== 'tool_use') break;

        // Execute requested tools
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
        const toolResultMessages = [];

        for (const toolUse of toolUseBlocks) {
          const result = await executeTool(toolUse.name, toolUse.input, userId);
          allToolResults.push({ toolName: toolUse.name, result });
          toolResultMessages.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        }

        // Append assistant response + tool results for next iteration
        conversationMessages = [
          ...conversationMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResultMessages },
        ];

        iterations++;
      }

      const { reply, actionCards } = parseResponse(response, allToolResults);
      return { reply, actionCards, quickReplies: [] };
    } catch (error) {
      console.error('Clamp chat error:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Clamp ran into a problem. Try again.');
    }
  });
