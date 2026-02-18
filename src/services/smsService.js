import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";

const sendSMSFn = httpsCallable(functions, 'sendSMS');

export const smsService = {
  async send(to, body, { type = 'manual', relatedId = null } = {}) {
    try {
      const result = await sendSMSFn({ to, body, type, relatedId });
      return result.data;
    } catch (error) {
      if (error?.code === 'functions/failed-precondition') {
        throw new Error('SMS is not configured. Set up Twilio in Settings > Integrations.');
      }
      throw new Error(error?.message || 'Failed to send SMS.');
    }
  },
};
