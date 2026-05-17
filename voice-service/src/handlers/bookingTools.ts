import type Anthropic from '@anthropic-ai/sdk';
import type { AiToolName, Session, VerticalPackContext } from '../types/session.js';

export const MAX_TOOL_ITERATIONS = 5;

const TOOL_REGISTRY: Record<AiToolName, Anthropic.Tool> = {
  check_availability: {
    name: 'check_availability',
    description: `Checks available appointment slots for a specific date.
      Call this BEFORE attempting to book. Returns a list of available time slots for the given date.
      If no slots are available on the requested date, suggest calling with adjacent dates.
      Use the service duration from check_services if known, otherwise default 30 minutes.`,
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        staff_id: { type: 'string', description: 'Optional staff ID if customer expressed a preference' },
        duration: { type: 'number', description: 'Service duration in minutes, defaults to 30' },
      },
      required: ['date'],
    },
  },
  book_appointment: {
    name: 'book_appointment',
    description: `Books a new appointment at a SPECIFIC time slot (FIXED_SLOT booking model).
      Only call this AFTER the customer has confirmed: service, date, time, and provided name + phone.
      If the slot is taken (409 response), inform the customer and call check_availability again.
      For drop-off-style bookings (multi-day repair work), use book_dropoff instead.`,
    input_schema: {
      type: 'object',
      properties: {
        service_id: { type: 'string', description: 'Service ID from check_services' },
        staff_id: { type: 'string', description: 'Optional staff ID' },
        date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
        start_time: { type: 'string', description: 'Start time in HH:MM format (24h)' },
        customer_name: { type: 'string', description: 'Customer full name' },
        customer_phone: { type: 'string', description: 'Customer phone number' },
        customer_email: { type: 'string', description: 'Customer email address (optional)' },
        notes: { type: 'string', description: 'Reason for visit or other intake notes (optional)' },
      },
      required: ['service_id', 'date', 'start_time', 'customer_name', 'customer_phone'],
    },
  },
  book_dropoff: {
    name: 'book_dropoff',
    description: `Books a multi-day drop-off (DROP_OFF_WINDOW booking model — e.g. mechanic shops).
      Customer reserves a DAY, not a specific time slot. Used when the shop works on the item
      across multiple days. Collect: vehicle/item details, symptom description, customer contact.`,
    input_schema: {
      type: 'object',
      properties: {
        service_id: { type: 'string', description: 'Service ID (optional — repair scope often not known until inspection)' },
        date: { type: 'string', description: 'Drop-off date in YYYY-MM-DD format' },
        customer_name: { type: 'string', description: 'Customer full name' },
        customer_phone: { type: 'string', description: 'Customer phone number' },
        license_plate: { type: 'string', description: 'Vehicle license plate (mechanic)' },
        vehicle_info: { type: 'string', description: 'Make/model/year of the vehicle' },
        symptom_description: { type: 'string', description: 'What the customer says is wrong' },
        notes: { type: 'string', description: 'Other intake notes' },
      },
      required: ['date', 'customer_name', 'customer_phone'],
    },
  },
  reschedule_appointment: {
    name: 'reschedule_appointment',
    description: `Reschedules an existing appointment after verifying customer identity by name + phone.
      First find the existing appointment, then book the new slot, then cancel the old one.
      Verify the customer owns the appointment before making changes.`,
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Customer name for identity verification' },
        customer_phone: { type: 'string', description: 'Customer phone for identity verification' },
        new_date: { type: 'string', description: 'New date in YYYY-MM-DD format' },
        new_start_time: { type: 'string', description: 'New start time in HH:MM 24h format' },
        appointment_id: { type: 'string', description: 'Existing appointment ID if known' },
      },
      required: ['customer_name', 'customer_phone', 'new_date', 'new_start_time'],
    },
  },
  cancel_appointment: {
    name: 'cancel_appointment',
    description: `Cancels an existing appointment after verifying customer identity by name + phone.
      Find the appointment by customer phone + name, confirm the customer wants to cancel, then cancel it.`,
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Customer name for identity verification' },
        customer_phone: { type: 'string', description: 'Customer phone for identity verification' },
        appointment_id: { type: 'string', description: 'Specific appointment ID if known' },
      },
      required: ['customer_name', 'customer_phone'],
    },
  },
  check_services: {
    name: 'check_services',
    description: `Returns the list of active services with IDs, names, durations, and prices.
      Call this when the customer asks about available services or at the start of a booking flow to
      match their requested service to an actual service ID.`,
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  check_repair_status: {
    name: 'check_repair_status',
    description: `(Mechanic) Looks up a customer's car repair status by license plate or phone.
      Returns current status (waiting on parts, in progress, ready for pickup), and the
      latest update from the shop. Use when a customer calls asking about their car.`,
    input_schema: {
      type: 'object',
      properties: {
        license_plate: { type: 'string', description: 'Vehicle license plate' },
        customer_phone: { type: 'string', description: 'Customer phone number' },
      },
      required: [],
    },
  },
  request_quote: {
    name: 'request_quote',
    description: `(Mechanic) Provides a rough price range for a requested repair based on the
      service catalog. Always communicates that final pricing requires inspection.`,
    input_schema: {
      type: 'object',
      properties: {
        service_description: { type: 'string', description: 'What the customer is asking about' },
        vehicle_info: { type: 'string', description: 'Make/model/year if mentioned' },
      },
      required: ['service_description'],
    },
  },
  request_callback: {
    name: 'request_callback',
    description: `Logs a callback request so the shop can call the customer back later.
      Use when the customer wants something the AI can't handle right now (custom quote,
      complex scheduling, emergency triage that needs a human).`,
    input_schema: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: 'Customer name' },
        customer_phone: { type: 'string', description: 'Customer phone number' },
        reason: { type: 'string', description: 'Why the customer needs a callback' },
        urgency: { type: 'string', description: 'normal | urgent | emergency' },
      },
      required: ['customer_name', 'customer_phone', 'reason'],
    },
  },
  lookup_customer: {
    name: 'lookup_customer',
    description: `Looks up an existing customer by phone number, returning their name and
      upcoming appointments at this shop. Use at the start of a call to personalize.`,
    input_schema: {
      type: 'object',
      properties: {
        customer_phone: { type: 'string', description: 'Customer phone number' },
      },
      required: ['customer_phone'],
    },
  },
};

const LEGACY_TOOL_SET: AiToolName[] = [
  'check_availability',
  'book_appointment',
  'reschedule_appointment',
  'cancel_appointment',
  'check_services',
];

/**
 * Returns the Anthropic tool definitions to expose to Claude for this session.
 * - If the shop has a vertical pack: returns the intersection of pack.ai.tools and the registry.
 * - If no pack: returns the legacy 5-tool set (back-compat for shops without a v3 pack).
 *
 * Always ensures check_services is included so Claude can resolve service names to IDs.
 */
export function getToolsForPack(pack: VerticalPackContext | null): Anthropic.Tool[] {
  const names = pack ? pack.ai.tools : LEGACY_TOOL_SET;
  const set = new Set<AiToolName>(names);
  set.add('check_services');
  const tools: Anthropic.Tool[] = [];
  for (const name of set) {
    const tool = TOOL_REGISTRY[name];
    if (tool) tools.push(tool);
  }
  return tools;
}

function apiUrl(path: string): string {
  const base = (process.env.QUEUEUP_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}${path}`;
}

function authHeaders(shopId?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${process.env.INTERNAL_SERVICE_TOKEN ?? ''}`,
    'Content-Type': 'application/json',
  };
  if (shopId) h['x-shop-id'] = shopId;
  return h;
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
        headers: authHeaders(shopId),
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
        headers: authHeaders(shopId),
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      return { cancelled: true, appointmentId: apptId };
    }

    case 'book_dropoff': {
      // Multi-day drop-off booking — reserves a DAY, not a slot.
      // Backend doesn't yet have a dedicated drop-off endpoint; we use the standard
      // appointment endpoint with a placeholder 08:00 start time representing "drop-off morning."
      // When the drop-off-aware API endpoint ships, switch this to call it directly.
      const symptom = (input.symptom_description as string | undefined) ?? '';
      const notesParts: string[] = [];
      if (symptom) notesParts.push(`Symptom: ${symptom}`);
      if (input.notes) notesParts.push(input.notes as string);

      const body: Record<string, unknown> = {
        shopId,
        serviceId: input.service_id ?? undefined,
        date: input.date,
        startTime: '08:00',
        customerName: input.customer_name,
        customerPhone: input.customer_phone,
        licensePlate: input.license_plate ?? undefined,
        vehicleInfo: input.vehicle_info ?? undefined,
        notes: notesParts.length > 0 ? notesParts.join(' | ') : undefined,
      };

      const res = await fetch(apiUrl('/api/appointments'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        return { error: 'BOOKING_FAILED', message: `Failed to create drop-off (HTTP ${res.status})` };
      }

      return res.json();
    }

    case 'lookup_customer': {
      const phone = input.customer_phone as string | undefined;
      if (!phone) {
        return { error: 'MISSING_PHONE', message: 'customer_phone is required' };
      }
      const params = new URLSearchParams({ shopId, phone });
      const res = await fetch(apiUrl(`/api/appointments/lookup?${params}`), {
        headers: authHeaders(),
      });
      if (!res.ok) {
        return { found: false };
      }
      const data = (await res.json()) as {
        customer: { id: string; name: string; phone: string } | null;
        appointments: Array<{ id: string; date: string; startTime: string }>;
      };
      return {
        found: data.customer !== null,
        customer: data.customer,
        upcomingAppointments: data.appointments,
      };
    }

    case 'check_repair_status': {
      // Backend support not yet implemented — surfaces a clear message Claude can
      // relay rather than crashing. When repair-status API ships, replace this stub.
      session.actionsLog.push('stub:check_repair_status');
      return {
        error: 'NOT_IMPLEMENTED',
        message:
          'Repair status lookup is not available yet. Offer to log a callback request so a mechanic can call back with the status.',
      };
    }

    case 'request_quote': {
      // Stub: instructs Claude to use the service catalog (already in system prompt)
      // and to communicate that final pricing requires inspection.
      session.actionsLog.push('stub:request_quote');
      return {
        guidance:
          'Use the service catalog in the system prompt to give a price range for the requested service. Always note that final pricing requires inspection. Do not commit to a fixed price.',
      };
    }

    case 'request_callback': {
      // Stub: logs the callback intent to the actions log so the post-call summary
      // can include it. Real implementation would persist a callback record.
      const urgency = (input.urgency as string | undefined) ?? 'normal';
      const reason = (input.reason as string | undefined) ?? '';
      session.actionsLog.push(`callback_requested:${urgency}:${reason.slice(0, 80)}`);
      return {
        logged: true,
        message:
          'Callback request logged. The shop will see it in the call summary and follow up.',
      };
    }

    default:
      return { error: 'UNKNOWN_TOOL', message: `Unknown tool: ${name}` };
  }
}
