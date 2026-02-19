import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";

const scaffldAI = httpsCallable(functions, 'scaffldAI');

/** Strip markdown code fences (```json ... ```) that the model sometimes wraps around JSON. */
function stripCodeFences(text) {
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();
  }
  return trimmed;
}

export const aiService = {
  async generateQuote(description, context = {}) {
    try {
      const result = await scaffldAI({ action: 'quoteWriter', input: description, context });
      return JSON.parse(stripCodeFences(result.data.result));
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async rewriteNotes(notes, context = {}) {
    try {
      const result = await scaffldAI({ action: 'noteRewrite', input: notes, context });
      return result.data.result;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async draftEmail(prompt, context = {}) {
    try {
      const result = await scaffldAI({ action: 'emailDraft', input: prompt, context });
      return result.data.result;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async improveInvoiceDescriptions(lineItems, context = {}) {
    try {
      const result = await scaffldAI({
        action: 'invoiceDescription',
        input: JSON.stringify(lineItems),
        context,
      });
      return JSON.parse(stripCodeFences(result.data.result));
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async generateJobSummary(jobData, context = {}) {
    try {
      const result = await scaffldAI({
        action: 'jobSummary',
        input: JSON.stringify(jobData),
        context,
      });
      return result.data.result;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async generateReviewResponse(review, context = {}) {
    try {
      const result = await scaffldAI({
        action: 'reviewResponse',
        input: JSON.stringify(review),
        context,
      });
      return result.data.result;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async draftCampaign(campaignInfo, context = {}) {
    try {
      const result = await scaffldAI({
        action: 'campaignDraft',
        input: JSON.stringify(campaignInfo),
        context,
      });
      return JSON.parse(stripCodeFences(result.data.result));
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async draftInvoiceChaser(invoiceData, context = {}) {
    try {
      const result = await scaffldAI({
        action: 'invoiceChaser',
        input: JSON.stringify(invoiceData),
        context,
      });
      return result.data.result;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async parseClientNotes(rawText, context = {}) {
    try {
      const result = await scaffldAI({
        action: 'clientIntake',
        input: rawText,
        context,
      });
      return JSON.parse(stripCodeFences(result.data.result));
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async categorizeExpenses(expenses, context = {}) {
    try {
      const result = await scaffldAI({
        action: 'expenseCategorize',
        input: JSON.stringify(expenses),
        context,
      });
      return JSON.parse(stripCodeFences(result.data.result));
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async suggestCustomFields(businessContext = {}) {
    try {
      const result = await scaffldAI({
        action: 'customFieldSuggestions',
        input: JSON.stringify(businessContext),
        context: businessContext,
      });
      return JSON.parse(stripCodeFences(result.data.result));
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async optimizeSchedule(scheduleData, context = {}) {
    try {
      const result = await scaffldAI({
        action: 'scheduleOptimizer',
        input: JSON.stringify(scheduleData),
        context,
      });
      return result.data.result;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async generateBriefing(dashboardData, context = {}) {
    try {
      const result = await scaffldAI({
        action: 'dailyBriefing',
        input: JSON.stringify(dashboardData),
        context,
      });
      return result.data.result;
    } catch (error) {
      throw normalizeError(error);
    }
  },

  async suggestFieldValues(clientHistory, context = {}) {
    try {
      const result = await scaffldAI({
        action: 'fieldAutoComplete',
        input: JSON.stringify(clientHistory),
        context,
      });
      return JSON.parse(stripCodeFences(result.data.result));
    } catch (error) {
      throw normalizeError(error);
    }
  },
};

function normalizeError(error) {
  if (error?.code === 'functions/failed-precondition') {
    return new Error('Clamp is being set up — check back soon.');
  }
  return new Error(error?.message || 'Clamp request failed. Please try again.');
}
