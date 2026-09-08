/**
 * Header Component — compact sticky header
 */

export function renderHeader(container: HTMLElement): void {
  const header = document.createElement("header");
  header.className = "app-header";
  header.innerHTML = `
    <div class="container">
      <div class="header-brand">
        <div class="header-logo">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5
                 m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125
                 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
          </svg>
        </div>
        <div>
          <div class="header-title">VKU Inspector</div>
          <div class="header-subtitle">Khảo sát cơ sở vật chất</div>
        </div>
      </div>
      <div id="network-badge" class="network-badge online">
        <div class="network-dot"></div>
        <span id="network-label">Online</span>
      </div>
    </div>
  `;
  container.prepend(header);
}

export function updateNetworkBadge(isOnline: boolean): void {
  const badge = document.getElementById("network-badge");
  const label = document.getElementById("network-label");
  if (!badge || !label) return;
  badge.className = `network-badge ${isOnline ? "online" : "offline"}`;
  label.textContent = isOnline ? "Online" : "Offline";
}
