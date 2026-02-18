import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";

const scaffldAI = httpsCallable(functions, 'scaffldAI');

export const aiService = {
  async generateQuote(description, context = {}) {
    try {
      const result = await scaffldAI({ action: 'quoteWriter', input: description, context });
      return JSON.parse(result.data.result);
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
      return JSON.parse(result.data.result);
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
};

function normalizeError(error) {
  if (error?.code === 'functions/failed-precondition') {
    return new Error('Clamp is being set up — check back soon.');
  }
  return new Error(error?.message || 'Clamp request failed. Please try again.');
}
