const menuButton = document.querySelector('[data-menu-button]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
}

document.querySelectorAll('[data-accordion-trigger]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.accordion-item');
    const open = item.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(open));
  });
});

const searchForm = document.querySelector('[data-search-form]');
if (searchForm) {
  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = searchForm.querySelector('input')?.value.trim();
    window.location.href = value ? `/chat?question=${encodeURIComponent(value)}` : '/chat';
  });
}

const chatApp = document.querySelector('[data-chat-app]');
if (chatApp) {
  const input = document.querySelector('[data-chat-input]');
  const form = document.querySelector('[data-chat-form]');
  const submit = document.querySelector('[data-chat-submit]');
  const messages = document.querySelector('[data-chat-messages]');
  const welcome = document.querySelector('[data-chat-welcome]');
  const status = document.querySelector('[data-chat-status]');
  const errorBox = document.querySelector('[data-chat-error]');
  const newConversation = document.querySelector('[data-new-conversation]');
  const sessionKey = 'usba:visitor-id';
  const conversationKey = 'usba:conversation-id';
  const visitorId = localStorage.getItem(sessionKey) || `usba-${crypto.randomUUID()}`;
  localStorage.setItem(sessionKey, visitorId);
  let conversationId = localStorage.getItem(conversationKey) || '';
  let sending = false;

  const escapeHtml = (value) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  function inlineMarkdown(value) {
    const links = [];
    let safe = escapeHtml(value).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => { links.push(`<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`); return `%%LINK${links.length - 1}%%`; });
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    return safe.replace(/%%LINK(\d+)%%/g, (_, index) => links[Number(index)]);
  }
  function extractSuggestions(markdown) {
    const lines = markdown.split(/\r?\n/); const suggestions = []; let inSuggestions = false; const remaining = [];
    for (const line of lines) {
      if (/^#{1,3}\s*explore next/i.test(line.trim()) || /^explore next:?$/i.test(line.trim())) { inSuggestions = true; continue; }
      const match = line.trim().match(/^(?:[-*]|\d+[.)])\s+(.+)$/);
      if (inSuggestions && match) { suggestions.push(match[1]); continue; }
      if (inSuggestions && line.trim() === '') continue;
      if (inSuggestions && suggestions.length) inSuggestions = false;
      remaining.push(line);
    }
    return { text: remaining.join('\n').trim(), suggestions };
  }
  function markdownToHtml(markdown) {
    const lines = markdown.split(/\r?\n/); let html = ''; let listOpen = false;
    for (const raw of lines) {
      const line = raw.trim(); if (!line) { if (listOpen) { html += '</ul>'; listOpen = false; } continue; }
      const heading = line.match(/^(#{1,3})\s+(.+)$/); const bullet = line.match(/^[-*]\s+(.+)$/);
      if (heading) { if (listOpen) { html += '</ul>'; listOpen = false; } html += `<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`; }
      else if (bullet) { if (!listOpen) { html += '<ul>'; listOpen = true; } html += `<li>${inlineMarkdown(bullet[1])}</li>`; }
      else { if (listOpen) { html += '</ul>'; listOpen = false; } html += `<p>${inlineMarkdown(line)}</p>`; }
    }
    if (listOpen) html += '</ul>';
    return html;
  }
  function renderAssistant(text, sources = []) {
    const { text: cleanText, suggestions } = extractSuggestions(text); const wrapper = document.createElement('article'); wrapper.className = 'message assistant-message';
    wrapper.innerHTML = `<div class="assistant-copy">${markdownToHtml(cleanText)}</div>`;
    const validSources = sources.filter((source) => source && (source.url || source.link));
    if (validSources.length) { const sourceWrap = document.createElement('div'); sourceWrap.className = 'source-list'; sourceWrap.innerHTML = '<span class="source-label">Sources</span>' + validSources.map((source) => `<a href="${source.url || source.link}" target="_blank" rel="noreferrer">${escapeHtml(source.title || source.document_name || 'Open source')} ↗</a>`).join(''); wrapper.append(sourceWrap); }
    if (suggestions.length) { const explore = document.createElement('div'); explore.className = 'suggestion-list'; explore.innerHTML = '<span>Explore next</span>'; suggestions.forEach((suggestion) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = suggestion; button.addEventListener('click', () => sendMessage(suggestion)); explore.append(button); }); wrapper.append(explore); }
    return wrapper;
  }
  function appendUser(text) { const el = document.createElement('article'); el.className = 'message user-message'; el.textContent = text; messages.append(el); }
  function resizeInput() { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 150)}px`; }
  function scrollToLatest() { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }); }
  function setBusy(value) { sending = value; input.disabled = value; submit.disabled = value; submit.classList.toggle('is-loading', value); status.textContent = value ? 'Thinking…' : 'Text chat · sources shown when Dify returns them'; }
  function parseSseChunk(buffer, onEvent) {
    const blocks = buffer.replace(/\r\n/g, '\n').split(/\n\n/); const rest = blocks.pop();
    for (const block of blocks) { const event = block.match(/^event:\s*(.+)$/m)?.[1] || 'message'; const dataLine = block.split(/\r?\n/).find((line) => line.startsWith('data:')); if (!dataLine) continue; try { onEvent(event, JSON.parse(dataLine.slice(5).trim())); } catch {} }
    return rest;
  }
  async function sendMessage(text) {
    const query = (text ?? input.value).trim(); if (!query || sending) return;
    input.value = ''; resizeInput(); errorBox.hidden = true; welcome.hidden = true; appendUser(query);
    const assistant = document.createElement('article'); assistant.className = 'message assistant-message'; assistant.innerHTML = '<div class="assistant-copy"><p class="typing">Thinking<span>…</span></p></div>'; messages.append(assistant); scrollToLatest(); setBusy(true);
    let answer = ''; let sources = []; let buffer = '';
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, user: visitorId, conversation_id: conversationId }) });
      if (!response.ok) { const raw = await response.text(); let message = 'The assistant could not answer right now.'; try { message = JSON.parse(raw).error || message; } catch {} throw new Error(message); }
      const reader = response.body.getReader(); const decoder = new TextDecoder();
      const onEvent = (event, data) => { if (event === 'message' || event === 'agent_message') { answer += data.answer || ''; if (data.conversation_id) conversationId = data.conversation_id; assistant.innerHTML = `<div class="assistant-copy">${markdownToHtml(answer)}</div>`; scrollToLatest(); } if (event === 'message_end') { if (data.conversation_id) conversationId = data.conversation_id; sources = data.metadata?.retriever_resources || []; } if (event === 'error') throw new Error(data.message || 'Dify returned an error.'); };
      while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); buffer = parseSseChunk(buffer, onEvent); }
      if (!answer.trim()) throw new Error('The assistant returned an empty answer.');
      localStorage.setItem(conversationKey, conversationId); assistant.replaceWith(renderAssistant(answer, sources));
    } catch (error) { assistant.remove(); errorBox.textContent = error.message; errorBox.hidden = false; }
    finally { setBusy(false); scrollToLatest(); }
  }
  form.addEventListener('submit', (event) => { event.preventDefault(); sendMessage(); });
  input.addEventListener('input', resizeInput); input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
  newConversation.addEventListener('click', () => { conversationId = ''; localStorage.removeItem(conversationKey); messages.replaceChildren(); errorBox.hidden = true; welcome.hidden = false; input.focus(); });
  const initialQuestion = new URLSearchParams(window.location.search).get('question');
  if (initialQuestion && !sessionStorage.getItem(`usba:sent:${initialQuestion}`)) { sessionStorage.setItem(`usba:sent:${initialQuestion}`, '1'); sendMessage(initialQuestion); }
}
