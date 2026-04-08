function app() {
  return window.jpApp;
}

export function showToast(text, icon = 'checkmark_circle_fill', options = {}) {
  app()?.toast.create({
    text: `<div class="jp-toast-body"><i class="f7-icons">${icon}</i><span>${text}</span></div>`,
    closeTimeout: options.closeTimeout ?? 2300,
    position: options.position ?? 'center'
  }).open();
}

export function showErrorDialog(message, title = 'Jeferson Personal') {
  app()?.dialog.alert(message, title);
}

export function confirmAction(text, title = 'Jeferson Personal') {
  return new Promise((resolve) => {
    app()?.dialog.confirm(text, title, () => resolve(true), () => resolve(false));
  });
}

export function renderErrorState({ title = 'Não foi possível carregar esta tela', text = 'Tente novamente em instantes.', actionLabel = 'Recarregar' } = {}) {
  return `
    <div class="jp-empty-state is-error">
      <i class="f7-icons">exclamationmark_triangle_fill</i>
      <h3>${title}</h3>
      <p>${text}</p>
      <button class="button button-fill button-round jp-empty-action" data-page-reload>${actionLabel}</button>
    </div>
  `;
}

export function renderLoadingState(text = 'Carregando dados do aplicativo...') {
  return `
    <div class="jp-empty-state is-loading">
      <div class="jp-loading-orb"></div>
      <h3>Aguarde um instante</h3>
      <p>${text}</p>
    </div>
  `;
}

export function renderToolbar(items, activePath = '/') {
  return `
    <div class="toolbar toolbar-bottom tabbar-labels">
      <div class="toolbar-inner">
        ${items.map((item) => `
          <a href="${item.path}" class="link ${item.path === activePath ? 'tab-link-active' : ''}">
            <i class="f7-icons">${item.icon}</i>
            <span class="jp-toolbar-label">${item.name}</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

export function pageShell({ pageName, title, subtitle, content, toolbar }) {
  return `
    <div class="page" data-name="${pageName}">
      <div class="navbar navbar-large transparent">
        <div class="navbar-bg"></div>
        <div class="navbar-inner sliding jp-shell">
          <div class="title jp-navbar-title">
            <strong>${title}</strong>
            <small>${subtitle}</small>
          </div>
        </div>
      </div>
      <div class="page-content">
        <div class="jp-shell">
          ${content}
        </div>
      </div>
      ${toolbar}
    </div>
  `;
}
