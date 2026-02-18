import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';

const clampChatFn = httpsCallable(functions, 'clampChat');

function normalizeError(error) {
  if (error?.code === 'functions/unauthenticated') {
    return new Error('Sign in to use Clamp.');
  }
  if (error?.code === 'functions/resource-exhausted') {
    return new Error('Conversation is at the limit. Start a new chat.');
  }
  return new Error(error?.message || 'Clamp ran into a problem. Try again.');
}

export const clampChatService = {
  async send(messages) {
    try {
      const result = await clampChatFn({ messages });
      return result.data;
    } catch (error) {
      throw normalizeError(error);
    }
  },
};
