export function getStyles(primaryColor: string): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .queueup-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${primaryColor};
      color: white;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      border: none;
      transition: transform 0.2s;
    }
    .queueup-bubble:hover { transform: scale(1.1); }

    .queueup-panel {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      max-height: 520px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      background: white;
      overflow: hidden;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .queueup-header {
      background: ${primaryColor};
      color: white;
      padding: 16px;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .queueup-header button {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
    }

    .queueup-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 340px;
    }

    .queueup-msg-user {
      align-self: flex-end;
      background: ${primaryColor};
      color: white;
      padding: 8px 12px;
      border-radius: 12px 12px 0 12px;
      max-width: 80%;
      font-size: 14px;
      line-height: 1.4;
    }

    .queueup-msg-ai {
      align-self: flex-start;
      background: #f1f3f5;
      color: #1a1a2e;
      padding: 8px 12px;
      border-radius: 12px 12px 12px 0;
      max-width: 80%;
      font-size: 14px;
      line-height: 1.4;
    }

    .queueup-input-area {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      gap: 8px;
    }

    .queueup-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
    }
    .queueup-input:focus { border-color: ${primaryColor}; }

    .queueup-send {
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
    }
    .queueup-send:disabled { opacity: 0.5; cursor: not-allowed; }

    .queueup-consent {
      padding: 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .queueup-consent p {
      font-size: 14px;
      color: #4a5568;
      line-height: 1.5;
    }

    .queueup-consent-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .queueup-btn-primary {
      background: ${primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 24px;
      cursor: pointer;
      font-size: 14px;
    }

    .queueup-btn-secondary {
      background: #e5e7eb;
      color: #374151;
      border: none;
      border-radius: 8px;
      padding: 10px 24px;
      cursor: pointer;
      font-size: 14px;
    }

    .queueup-typing {
      align-self: flex-start;
      color: #9ca3af;
      font-size: 13px;
      padding: 4px 12px;
    }

    .queueup-hidden { display: none; }
  `;
}
