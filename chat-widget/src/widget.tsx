import { render } from 'preact';
import { App } from './App';
import { getStyles } from './styles';

// Capture currentScript immediately (before IIFE or async execution nullifies it)
const _currentScript = document.currentScript as HTMLScriptElement | null;

function mount() {
  const script =
    _currentScript ||
    document.querySelector<HTMLScriptElement>('script[data-shop-id]');

  if (!script) {
    console.error('QueueUp widget: could not find script tag');
    return;
  }

  const shopId = script.dataset.shopId || script.getAttribute('data-shop-id');
  if (!shopId) {
    console.error('QueueUp widget: data-shop-id attribute required');
    return;
  }

  // Allow API URL overrides via data attributes
  if (script.dataset.apiUrl) {
    (window as any).QUEUEUP_CHAT_API_URL = script.dataset.apiUrl;
  }
  if (script.dataset.appUrl) {
    (window as any).QUEUEUP_API_URL = script.dataset.appUrl;
  }

  // Create host element with Shadow DOM for style isolation
  const host = document.createElement('div');
  host.id = 'queueup-widget-host';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject styles (use default color; App component will load shop config)
  const style = document.createElement('style');
  const primaryColor = script.dataset.color || '#6366f1';
  style.textContent = getStyles(primaryColor);
  shadow.appendChild(style);

  // Mount Preact app
  const root = document.createElement('div');
  shadow.appendChild(root);
  render(<App shopId={shopId} />, root);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
