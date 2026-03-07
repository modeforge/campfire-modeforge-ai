'use client';

import { useState, useActionState } from 'react';
import { submitRsvp, type RsvpFormState } from '@/app/actions';

interface RsvpCardProps {
  eventSlug: string;
  eventDate: string;
  rsvpDeadline: string;
  initialCount: number;
}

const inputStyles: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '1px solid var(--border-medium)',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
  borderRadius: 0,
  outline: 'none',
};

export function RsvpCard({ eventSlug, eventDate, rsvpDeadline, initialCount }: RsvpCardProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [rsvpCount, setRsvpCount] = useState(initialCount);

  const isExpired = new Date(rsvpDeadline + 'T23:59:59') < new Date();

  const [state, formAction, pending] = useActionState<RsvpFormState, FormData>(
    async (prevState, formData) => {
      const result = await submitRsvp(prevState, formData);
      if (result.success) {
        const guestCount = Number(formData.get('guestCount')) || 1;
        setRsvpCount((prev) => prev + guestCount);
        setModalOpen(false);
        setConfirmed(true);
      }
      return result;
    },
    { success: false }
  );

  const formattedDate = new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });

  return (
    <>
      <div
        className="mt-8 p-6"
        style={{ border: '1px dashed var(--border-medium)' }}
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <div
              className="text-lg font-light mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {formattedDate} CAMPFIRE
            </div>
            <div
              className="text-3xl font-light mb-1"
              style={{ color: 'var(--text-primary)' }}
            >
              {rsvpCount}
            </div>
            <div
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Going
            </div>
            {!isExpired && (
              <div
                className="text-xs mt-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Last day to RSVP
              </div>
            )}
          </div>

          <div>
            <div
              className="text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              RSVP Here
            </div>
            {confirmed ? (
              <div
                className="text-sm px-6 py-2"
                style={{
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                You're in. See you there.
              </div>
            ) : isExpired ? (
              <div
                className="text-sm px-6 py-2"
                style={{
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                RSVP closed
              </div>
            ) : (
              <button
                onClick={() => setModalOpen(true)}
                className="text-sm tracking-wide px-6 py-2 cursor-pointer"
                style={{
                  background: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  border: 'none',
                }}
              >
                Going
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            className="w-full max-w-md mx-4 p-8"
            style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-medium)',
            }}
          >
            <h3
              className="text-lg font-medium mb-6"
              style={{ color: 'var(--text-primary)' }}
            >
              Please submit your RSVP information, including the total number of guests.
            </h3>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="eventSlug" value={eventSlug} />

              <div>
                <label
                  htmlFor="rsvp-name"
                  className="block text-sm font-normal mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Name <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="text"
                  id="rsvp-name"
                  name="name"
                  required
                  style={inputStyles}
                />
              </div>

              <div>
                <label
                  htmlFor="rsvp-email"
                  className="block text-sm font-normal mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Email <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="email"
                  id="rsvp-email"
                  name="email"
                  required
                  style={inputStyles}
                />
              </div>

              <div>
                <label
                  htmlFor="rsvp-guests"
                  className="block text-sm font-normal mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Number of Guests <span style={{ color: 'var(--accent)' }}>*</span>
                </label>
                <input
                  type="number"
                  id="rsvp-guests"
                  name="guestCount"
                  min={1}
                  defaultValue={1}
                  required
                  style={{ ...inputStyles, width: '80px' }}
                />
              </div>

              {state.error && (
                <div
                  className="text-sm py-3 px-4"
                  style={{
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)',
                    background: 'var(--bg-secondary)',
                  }}
                >
                  {state.error}
                </div>
              )}

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-sm tracking-wide px-6 py-2 cursor-pointer"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="text-sm tracking-wide px-6 py-2 cursor-pointer disabled:opacity-50"
                  style={{
                    background: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    border: 'none',
                  }}
                >
                  {pending ? 'Submitting...' : 'Finish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
