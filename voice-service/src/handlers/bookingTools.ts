import type Anthropic from '@anthropic-ai/sdk';
import type { Session } from '../types/session.js';

export const MAX_TOOL_ITERATIONS = 5;

export const BOOKING_TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_availability',
    description: `Checks available appointment slots for a specific date at the clinic.
      Call this BEFORE attempting to book. Returns a list of available time slots for the given date.
      If no slots are available on the requested date, suggest calling with adjacent dates.
      Use the service duration from check_services if known, otherwise default 30 minutes.`,
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        staff_id: { type: 'string', description: 'Optional staff ID if patient expressed a preference' },
        duration: { type: 'number', description: 'Service duration in minutes, defaults to 30' },
      },
      required: ['date'],
    },
  },
  {
    name: 'book_appointment',
    description: `Books a new appointment after the patient has confirmed all details.
      Only call this AFTER the patient has confirmed: service, date, time, and provided name + phone.
      If the slot is taken (409 response), inform the patient and call check_availability again.
      Returns the booked appointment ID and confirmation details on success.`,
    input_schema: {
      type: 'object',
      properties: {
        service_id: { type: 'string', description: 'Service ID from check_services' },
        staff_id: { type: 'string', description: 'Optional staff ID' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        start_time: { type: 'string', description: 'Start time in HH:MM format (24h)' },
        customer_name: { type: 'string', description: 'Patient full name' },
        customer_phone: { type: 'string', description: 'Patient phone number' },
        customer_email: { type: 'string', description: 'Patient email address (optional)' },
        notes: { type: 'string', description: 'Reason for visit or other intake notes (optional)' },
      },
      required: ['service_id', 'date', 'start_time', 'customer_name', 'customer_phone'],
    },
  },
  {
    name: 'reschedule_appointment',
    description: `Reschedules an existing appointment after verifying patient identity by name + phone.
      First find the existing appointment, then book the new slot, then cancel the old one.
      Verify the patient owns the appointment before making changes.`,
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Patient name for identity verification' },
        customer_phone: { type: 'string', description: 'Patient phone for identity verification' },
        new_date: { type: 'string', description: 'New date in YYYY-MM-DD format' },
        new_start_time: { type: 'string', description: 'New start time in HH:MM 24h format' },
        appointment_id: { type: 'string', description: 'Existing appointment ID if known' },
      },
      required: ['customer_name', 'customer_phone', 'new_date', 'new_start_time'],
    },
  },
  {
    name: 'cancel_appointment',
    description: `Cancels an existing appointment after verifying patient identity by name + phone.
      Find the appointment by customer phone + name, confirm the patient wants to cancel, then cancel it.
      In Phase 2 there is no cancellation window restriction — cancel immediately.`,
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Patient name for identity verification' },
        customer_phone: { type: 'string', description: 'Patient phone for identity verification' },
        appointment_id: { type: 'string', description: 'Specific appointment ID if known' },
      },
      required: ['customer_name', 'customer_phone'],
    },
  },
  {
    name: 'check_services',
    description: `Returns the list of active services at this clinic with IDs, names, durations, and prices.
      Call this when the patient asks about available services or at the start of a booking flow to
      match their requested service type to an actual service ID.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

function apiUrl(path: string): string {
  const base = (process.env.QUEUEUP_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path}`;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
}

export async function dispatchTool(
  name: string,
  input: Record<string, unknown>,
  session: Session,
): Promise<unknown> {
  const shopId = session.shopContext?.shopId ?? session.clinicId;

  switch (name) {
    case 'check_availability': {
      const params = new URLSearchParams({ shopId, date: input.date as string });
      if (input.staff_id) params.set('staffId', input.staff_id as string);
      if (input.duration) params.set('duration', String(input.duration));

      const res = await fetch(apiUrl(`/api/availability?${params}`), {
        headers: authHeaders(),
      });
      const slots = (await res.json()) as Array<{ available: boolean }>;
      return slots.filter((s) => s.available === true);
    }

    case 'check_services': {
      const params = new URLSearchParams({ shopId });
      const res = await fetch(apiUrl(`/api/internal/shop-context?${params}`), {
        headers: authHeaders(),
      });
      const ctx = (await res.json()) as { services: unknown[] };
      return ctx.services ?? [];
    }

    case 'book_appointment': {
      const body = {
        shopId,
        serviceId: input.service_id,
        staffId: input.staff_id ?? undefined,
        date: input.date,
        startTime: input.start_time,
        customerName: input.customer_name,
        customerPhone: input.customer_phone,
        customerEmail: input.customer_email ?? undefined,
        notes: input.notes ?? undefined,
      };

      const res = await fetch(apiUrl('/api/appointments'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        return { error: 'SLOT_TAKEN', message: 'That time slot is no longer available. Please check availability for an alternative.' };
      }

      return res.json();
    }

    case 'reschedule_appointment': {
      // Step (a): Look up the existing appointment by phone + shopId
      const lookupParams = new URLSearchParams({ shopId, phone: input.customer_phone as string });
      const lookupRes = await fetch(apiUrl(`/api/appointments/lookup?${lookupParams}`), {
        headers: authHeaders(),
      });
      const lookupData = (await lookupRes.json()) as {
        customer: { id: string; name: string; phone: string } | null;
        appointments: Array<{ id: string; date: string; startTime: string }>;
      };

      if (!lookupData.customer || lookupData.appointments.length === 0) {
        return {
          error: 'NO_MATCHING_BOOKING',
          message: 'Could not find a booking matching that name and phone number.',
        };
      }

      // Pick the appointment: use provided ID or most recent upcoming
      const oldAppt = input.appointment_id
        ? lookupData.appointments.find((a) => a.id === input.appointment_id)
        : lookupData.appointments[0];

      if (!oldAppt) {
        return {
          error: 'NO_MATCHING_BOOKING',
          message: 'Could not find a booking matching that name and phone number.',
        };
      }

      // Step (b): Book new slot
      const bookBody = {
        shopId,
        serviceId: input.service_id ?? undefined,
        date: input.new_date,
        startTime: input.new_start_time,
        customerName: input.customer_name,
        customerPhone: input.customer_phone,
      };

      const bookRes = await fetch(apiUrl('/api/appointments'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(bookBody),
      });

      if (bookRes.status === 409) {
        return { error: 'SLOT_TAKEN', message: 'That new time slot is not available. Please check availability.' };
      }

      const newAppt = (await bookRes.json()) as { id: string };

      // Step (c): Cancel old slot
      await fetch(apiUrl(`/api/appointments/${oldAppt.id}`), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      return { newAppointmentId: newAppt.id, cancelledAppointmentId: oldAppt.id };
    }

    case 'cancel_appointment': {
      // Look up the appointment
      const lookupParams = new URLSearchParams({ shopId, phone: input.customer_phone as string });
      const lookupRes = await fetch(apiUrl(`/api/appointments/lookup?${lookupParams}`), {
        headers: authHeaders(),
      });
      const lookupData = (await lookupRes.json()) as {
        customer: { id: string } | null;
        appointments: Array<{ id: string }>;
      };

      if (!lookupData.customer || lookupData.appointments.length === 0) {
        return { error: 'NOT_FOUND', message: 'No upcoming appointment found for that name and phone number.' };
      }

      // Pick the appointment: use provided ID or most recent upcoming
      const apptId = (input.appointment_id as string | undefined)
        ?? lookupData.appointments[0].id;

      await fetch(apiUrl(`/api/appointments/${apptId}`), {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      return { cancelled: true, appointmentId: apptId };
    }

    default:
      return { error: 'UNKNOWN_TOOL', message: `Unknown tool: ${name}` };
  }
}
