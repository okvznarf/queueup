export function Consent({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div class="queueup-consent">
      <p>
        This chat is handled by an AI assistant. Your data is processed per GDPR.
        By continuing, you consent to AI-assisted processing of your inquiry.
      </p>
      <div class="queueup-consent-actions">
        <button class="queueup-btn-primary" onClick={onAccept}>Accept</button>
        <button class="queueup-btn-secondary" onClick={onDecline}>Decline</button>
      </div>
    </div>
  );
}
