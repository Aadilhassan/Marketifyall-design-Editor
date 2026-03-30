/**
 * Scoped CSS-in-JS styles for the quick-actions widget.
 * All classes prefixed with 'mfa-' to avoid CMS style conflicts.
 */

const PREFIX = 'mfa-qa'

export function injectStyles(): void {
  if (document.getElementById(`${PREFIX}-styles`)) return

  const style = document.createElement('style')
  style.id = `${PREFIX}-styles`
  style.textContent = `
    .${PREFIX}-root {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #374151;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .${PREFIX}-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid #f3f4f6;
      font-weight: 600;
      font-size: 14px;
    }
    .${PREFIX}-header svg { color: #5A3FFF; }
    .${PREFIX}-section {
      padding: 12px 16px;
    }
    .${PREFIX}-section-title {
      font-size: 11px;
      font-weight: 600;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .${PREFIX}-prompt-row {
      display: flex;
      gap: 8px;
    }
    .${PREFIX}-input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
    }
    .${PREFIX}-input:focus { border-color: #5A3FFF; }
    .${PREFIX}-input::placeholder { color: #9CA3AF; }
    .${PREFIX}-btn-primary {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      background: #5A3FFF;
      color: #fff;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .${PREFIX}-btn-primary:hover { background: #4a2fef; }
    .${PREFIX}-btn-primary:disabled { background: #9CA3AF; cursor: not-allowed; }
    .${PREFIX}-credit-cost {
      font-size: 11px;
      color: #9CA3AF;
      margin-top: 4px;
    }
    .${PREFIX}-templates-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .${PREFIX}-template-card {
      aspect-ratio: 1;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.15s;
      background: #f9fafb;
    }
    .${PREFIX}-template-card:hover {
      border-color: #5A3FFF;
      transform: scale(1.03);
    }
    .${PREFIX}-template-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .${PREFIX}-actions-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .${PREFIX}-action-btn {
      padding: 10px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      text-align: center;
      transition: all 0.15s;
      font-family: inherit;
    }
    .${PREFIX}-action-btn:hover { border-color: #5A3FFF; color: #5A3FFF; background: #f8f7ff; }
    .${PREFIX}-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-top: 1px solid #f3f4f6;
      font-size: 12px;
      color: #9CA3AF;
    }
    .${PREFIX}-credits-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
    }
    .${PREFIX}-upgrade-link {
      color: #5A3FFF;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
    }
    .${PREFIX}-upgrade-link:hover { text-decoration: underline; }
    .${PREFIX}-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #9CA3AF;
      gap: 8px;
    }
    .${PREFIX}-error {
      padding: 8px 12px;
      background: #FEF2F2;
      color: #DC2626;
      border-radius: 6px;
      font-size: 12px;
      margin-top: 8px;
    }
    .${PREFIX}-result-img {
      width: 100%;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      margin-top: 8px;
    }
    .${PREFIX}-see-all {
      font-size: 11px;
      color: #5A3FFF;
      font-weight: 600;
      cursor: pointer;
      border: none;
      background: none;
      padding: 0;
    }
    .${PREFIX}-see-all:hover { text-decoration: underline; }
  `
  document.head.appendChild(style)
}

export const CLS = PREFIX
