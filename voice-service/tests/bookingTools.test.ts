import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Session } from '../src/types/session.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeSession(shopId = 'shop-1'): Session {
  return {
    callSid: 'CA123',
    streamSid: 'MZ123',
    clinicId: shopId,
    consentState: 'granted',
    messages: [],
    unansweredQuestions: 0,
    escalationTriggered: false,
    startedAt: new Date(),
    actionsLog: [],
    channel: 'voice',
    shopContext: {
      shopId,
      shopName: 'Test Clinic',
      businessType: 'medical',
      address: '123 Main St',
      phone: '555-0100',
      email: 'test@clinic.com',
      timezone: 'Europe/London',
      currency: 'GBP',
      primaryColor: '#0070f3',
      staffLabel: 'doctor',
      serviceLabel: 'appointment',
      bookingLabel: 'booking',
      staffCount: 2,
      services: [
        { id: 'svc-1', name: 'Consultation', duration: 30, price: 50 },
        { id: 'svc-2', name: 'Follow-up', duration: 15, price: 25 },
      ],
      staff: [
        { id: 'staff-1', name: 'Dr. Smith', role: 'doctor' },
        { id: 'staff-2', name: 'Dr. Jones', role: 'doctor' },
      ],
      workingHours: [
        { day: 'Monday', openTime: '09:00', closeTime: '17:00', isClosed: false },
        { day: 'Tuesday', openTime: '09:00', closeTime: '17:00', isClosed: false },
        { day: 'Sunday', openTime: '', closeTime: '', isClosed: true },
      ],
    },
  };
}

function mockResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  });
}

import { BOOKING_TOOLS, dispatchTool } from '../src/handlers/bookingTools.js';

describe('BOOKING_TOOLS definitions', () => {
  it('exports exactly 5 tools', () => {
    expect(BOOKING_TOOLS).toHaveLength(5);
  });

  it('all tools have name, description, and input_schema', () => {
    for (const tool of BOOKING_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.input_schema).toBeTruthy();
      expect(tool.input_schema.type).toBe('object');
    }
  });

  it('includes check_availability tool', () => {
    const tool = BOOKING_TOOLS.find((t) => t.name === 'check_availability');
    expect(tool).toBeDefined();
    expect(tool!.input_schema.required).toContain('date');
  });

  it('includes book_appointment tool with required fields', () => {
    const tool = BOOKING_TOOLS.find((t) => t.name === 'book_appointment');
    expect(tool).toBeDefined();
    const required = tool!.input_schema.required as string[];
    expect(required).toContain('service_id');
    expect(required).toContain('date');
    expect(required).toContain('start_time');
    expect(required).toContain('customer_name');
    expect(required).toContain('customer_phone');
  });

  it('includes reschedule_appointment tool', () => {
    const tool = BOOKING_TOOLS.find((t) => t.name === 'reschedule_appointment');
    expect(tool).toBeDefined();
  });

  it('includes cancel_appointment tool', () => {
    const tool = BOOKING_TOOLS.find((t) => t.name === 'cancel_appointment');
    expect(tool).toBeDefined();
  });

  it('includes check_services tool with empty required array', () => {
    const tool = BOOKING_TOOLS.find((t) => t.name === 'check_services');
    expect(tool).toBeDefined();
    expect(tool!.input_schema.required).toEqual([]);
  });
});

describe('dispatchTool — check_availability', () => {
  beforeEach(() => mockFetch.mockReset());

  it('fetches availability and returns only available slots', async () => {
    mockFetch.mockResolvedValue(
      mockResponse([
        { hour: 9, minute: 0, label: '09:00', available: true, startTime: '09:00' },
        { hour: 10, minute: 0, label: '10:00', available: false, startTime: '10:00' },
        { hour: 11, minute: 0, label: '11:00', available: true, startTime: '11:00' },
      ]),
    );

    const session = makeSession();
    const result = await dispatchTool('check_availability', { date: '2026-04-15' }, session);

    expect(Array.isArray(result)).toBe(true);
    const slots = result as Array<{ available: boolean }>;
    expect(slots).toHaveLength(2);
    expect(slots.every((s) => s.available === true)).toBe(true);
  });

  it('calls the API with correct shopId, date, and service token', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    const session = makeSession('clinic-abc');

    await dispatchTool('check_availability', { date: '2026-04-15', duration: 30 }, session);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('shopId=clinic-abc');
    expect(url).toContain('date=2026-04-15');
    expect(url).toContain('duration=30');
    expect((options.headers as Record<string, string>)['Authorization']).toMatch(/^Bearer /);
  });

  it('passes optional staffId when provided', async () => {
    mockFetch.mockResolvedValue(mockResponse([]));
    const session = makeSession();

    await dispatchTool('check_availability', { date: '2026-04-15', staff_id: 'staff-1' }, session);

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('staffId=staff-1');
  });
});

describe('dispatchTool — check_services', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls shop-context and returns services array', async () => {
    mockFetch.mockResolvedValue(
      mockResponse({
        services: [
          { id: 'svc-1', name: 'Consultation', duration: 30, price: 50 },
        ],
      }),
    );

    const session = makeSession();
    const result = await dispatchTool('check_services', {}, session);

    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(1);
  });

  it('calls the shop-context endpoint with service token', async () => {
    mockFetch.mockResolvedValue(mockResponse({ services: [] }));
    const session = makeSession('shop-xyz');

    await dispatchTool('check_services', {}, session);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('shop-context');
    expect(url).toContain('shopId=shop-xyz');
    expect((options.headers as Record<string, string>)['Authorization']).toMatch(/^Bearer /);
  });
});

describe('dispatchTool — book_appointment', () => {
  beforeEach(() => mockFetch.mockReset());

  it('maps snake_case input to camelCase API body', async () => {
    const appointment = { id: 'appt-1', service: { name: 'Consultation' } };
    mockFetch.mockResolvedValue(mockResponse(appointment, 201));

    const session = makeSession('shop-1');
    await dispatchTool(
      'book_appointment',
      {
        service_id: 'svc-1',
        staff_id: 'staff-1',
        date: '2026-04-15',
        start_time: '09:00',
        customer_name: 'John Doe',
        customer_phone: '+44-555-0100',
        customer_email: 'john@example.com',
        notes: 'Back pain',
      },
      session,
    );

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.serviceId).toBe('svc-1');
    expect(body.staffId).toBe('staff-1');
    expect(body.date).toBe('2026-04-15');
    expect(body.startTime).toBe('09:00');
    expect(body.customerName).toBe('John Doe');
    expect(body.customerPhone).toBe('+44-555-0100');
    expect(body.customerEmail).toBe('john@example.com');
    expect(body.notes).toBe('Back pain');
    expect(body.shopId).toBe('shop-1');
  });

  it('returns appointment object on 201', async () => {
    const appointment = { id: 'appt-1', service: { name: 'Consultation' } };
    mockFetch.mockResolvedValue(mockResponse(appointment, 201));

    const session = makeSession();
    const result = await dispatchTool(
      'book_appointment',
      {
        service_id: 'svc-1',
        date: '2026-04-15',
        start_time: '09:00',
        customer_name: 'Jane',
        customer_phone: '+44-555-0200',
      },
      session,
    );

    expect((result as { id: string }).id).toBe('appt-1');
  });

  it('returns SLOT_TAKEN error on 409', async () => {
    mockFetch.mockResolvedValue(mockResponse({ error: 'Slot already booked' }, 409));

    const session = makeSession();
    const result = await dispatchTool(
      'book_appointment',
      {
        service_id: 'svc-1',
        date: '2026-04-15',
        start_time: '09:00',
        customer_name: 'Jane',
        customer_phone: '+44-555-0200',
      },
      session,
    );

    expect((result as { error: string }).error).toBe('SLOT_TAKEN');
  });
});

describe('dispatchTool — reschedule_appointment', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls lookup, then book, then cancel in sequence', async () => {
    // Step (a): lookup returns customer + upcoming appointment
    mockFetch
      .mockResolvedValueOnce(
        mockResponse({
          customer: { id: 'cust-1', name: 'John Doe', phone: '+44-555-0100' },
          appointments: [{ id: 'appt-old', date: '2026-04-10', startTime: '09:00' }],
        }),
      )
      // Step (b): book new slot
      .mockResolvedValueOnce(mockResponse({ id: 'appt-new' }, 201))
      // Step (c): cancel old slot
      .mockResolvedValueOnce(mockResponse({ id: 'appt-old', status: 'CANCELLED' }));

    const session = makeSession();
    const result = await dispatchTool(
      'reschedule_appointment',
      {
        customer_name: 'John Doe',
        customer_phone: '+44-555-0100',
        new_date: '2026-04-20',
        new_start_time: '10:00',
      },
      session,
    );

    expect(mockFetch).toHaveBeenCalledTimes(3);
    // Third call should be PATCH to cancel
    const [cancelUrl, cancelOptions] = mockFetch.mock.calls[2] as [string, RequestInit];
    expect(cancelOptions.method).toBe('PATCH');
    expect(cancelUrl).toContain('appt-old');
    expect(JSON.parse(cancelOptions.body as string).status).toBe('CANCELLED');

    const res = result as { newAppointmentId: string };
    expect(res.newAppointmentId).toBe('appt-new');
  });

  it('returns NO_MATCHING_BOOKING when customer not found', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ customer: null, appointments: [] }),
    );

    const session = makeSession();
    const result = await dispatchTool(
      'reschedule_appointment',
      {
        customer_name: 'Unknown',
        customer_phone: '+44-000-0000',
        new_date: '2026-04-20',
        new_start_time: '10:00',
      },
      session,
    );

    expect((result as { error: string }).error).toBe('NO_MATCHING_BOOKING');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns NO_MATCHING_BOOKING when customer has no appointments', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ customer: { id: 'cust-1', name: 'John' }, appointments: [] }),
    );

    const session = makeSession();
    const result = await dispatchTool(
      'reschedule_appointment',
      {
        customer_name: 'John',
        customer_phone: '+44-555-0100',
        new_date: '2026-04-20',
        new_start_time: '10:00',
      },
      session,
    );

    expect((result as { error: string }).error).toBe('NO_MATCHING_BOOKING');
  });

  it('does not cancel old appointment if new booking returns 409', async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockResponse({
          customer: { id: 'cust-1', name: 'John' },
          appointments: [{ id: 'appt-old', date: '2026-04-10', startTime: '09:00' }],
        }),
      )
      .mockResolvedValueOnce(mockResponse({ error: 'Slot taken' }, 409));

    const session = makeSession();
    const result = await dispatchTool(
      'reschedule_appointment',
      {
        customer_name: 'John',
        customer_phone: '+44-555-0100',
        new_date: '2026-04-20',
        new_start_time: '10:00',
      },
      session,
    );

    expect(mockFetch).toHaveBeenCalledTimes(2); // lookup + book; no cancel
    expect((result as { error: string }).error).toBe('SLOT_TAKEN');
  });
});

describe('dispatchTool — cancel_appointment', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls lookup then PATCH to cancel most recent upcoming appointment', async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockResponse({
          customer: { id: 'cust-1', name: 'Jane' },
          appointments: [{ id: 'appt-123', date: '2026-04-15', startTime: '09:00' }],
        }),
      )
      .mockResolvedValueOnce(mockResponse({ id: 'appt-123', status: 'CANCELLED' }));

    const session = makeSession();
    const result = await dispatchTool(
      'cancel_appointment',
      { customer_name: 'Jane', customer_phone: '+44-555-0300' },
      session,
    );

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [cancelUrl, cancelOptions] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(cancelOptions.method).toBe('PATCH');
    expect(cancelUrl).toContain('appt-123');
    expect(JSON.parse(cancelOptions.body as string).status).toBe('CANCELLED');
    expect((result as { cancelled: boolean }).cancelled).toBe(true);
  });

  it('uses provided appointment_id if given', async () => {
    mockFetch
      .mockResolvedValueOnce(
        mockResponse({
          customer: { id: 'cust-1', name: 'Jane' },
          appointments: [
            { id: 'appt-old', date: '2026-04-10', startTime: '09:00' },
            { id: 'appt-target', date: '2026-04-15', startTime: '10:00' },
          ],
        }),
      )
      .mockResolvedValueOnce(mockResponse({ id: 'appt-target', status: 'CANCELLED' }));

    const session = makeSession();
    await dispatchTool(
      'cancel_appointment',
      { customer_name: 'Jane', customer_phone: '+44-555-0300', appointment_id: 'appt-target' },
      session,
    );

    const [cancelUrl] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(cancelUrl).toContain('appt-target');
  });

  it('returns NOT_FOUND error when customer has no appointments', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ customer: null, appointments: [] }),
    );

    const session = makeSession();
    const result = await dispatchTool(
      'cancel_appointment',
      { customer_name: 'Nobody', customer_phone: '+44-000-0000' },
      session,
    );

    expect((result as { error: string }).error).toBe('NOT_FOUND');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe('dispatchTool — unknown tool', () => {
  it('returns UNKNOWN_TOOL error for unrecognized tool name', async () => {
    const session = makeSession();
    const result = await dispatchTool('nonexistent_tool', {}, session);
    expect((result as { error: string }).error).toBe('UNKNOWN_TOOL');
  });
});
