(function () {
  'use strict';

  // element ID and class selectors
  const THEME_TOGGLE_BUTTON_ID = 'theme-toggle';
  const CODE_BLOCK_CONTAINER_CLASS = 'code-block-container';
  const CODE_BLOCK_HEADER_CLASS = 'code-block-header';
  const CODE_BLOCK_LANGUAGE_CLASS = 'code-block-lang';
  const CODE_BLOCK_COPY_BUTTON_CLASS = 'code-copy-btn';

  // media queries
  const DARK_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

  // local storage object keys
  const LOCAL_STORAGE_KEY_CURRENT_THEME = 'ember-hugo-current-theme';

  // regexp
  const CODE_BLOCK_HEADER_LANGUAGE_RXP = /language-([a-zA-Z0-9_-]+)/;

  // valid theme values
  const DARK_THEME = 'dark';
  const LIGHT_THEME = 'light';
  const ALLOWED_THEME_VALUES = [DARK_THEME, LIGHT_THEME];

  function initThemeToggle() {
    const toggleBtn = document.getElementById(THEME_TOGGLE_BUTTON_ID);

    if (!toggleBtn) {
      console.warn(`No theme toggle button found (no element with ID "${THEME_TOGGLE_BUTTON_ID}").`);

      return;
    }

    function getCurrentTheme() {
      const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEY_CURRENT_THEME);
      const mediaQueryResult = window.matchMedia(DARK_THEME_MEDIA_QUERY).matches ? DARK_THEME : LIGHT_THEME;

      if (!storedTheme) {
        return mediaQueryResult;
      }

      if (!ALLOWED_THEME_VALUES.includes(storedTheme)) {
        console.warn(`Invalid theme in local storage: ${storedTheme}`);

        localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_THEME, mediaQueryResult);
        return mediaQueryResult;
      }

      return storedTheme;
    }

    function getThemeToggleButtonLabel(oppositeTheme) {
      if (!oppositeTheme) {
        oppositeTheme = getOppositeTheme();
      }

      return `Switch to ${oppositeTheme} mode`;
    }

    function getOppositeTheme(theme) {
      if (!theme) {
        theme = getCurrentTheme();
      }

      return theme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    }

    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);

      localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_THEME, theme);

      const oppositeTheme = getOppositeTheme(theme);
      const label = getThemeToggleButtonLabel(oppositeTheme);

      toggleBtn.setAttribute('aria-label', label);
      toggleBtn.setAttribute('title', label);
    }

    // Set initial aria-label
    const oppositeTheme = getOppositeTheme();
    const label = getThemeToggleButtonLabel(oppositeTheme);

    toggleBtn.setAttribute('aria-label', label);
    toggleBtn.setAttribute('title', label);

    toggleBtn.addEventListener('click', function () {
      const currentTheme = document.documentElement.getAttribute('data-theme') || getCurrentTheme();
      const newTheme = getOppositeTheme(currentTheme);
      setTheme(newTheme);
    });

    // automatically respect changes to the browser media query if the user has not specified a preference already
    window.matchMedia(DARK_THEME_MEDIA_QUERY).addEventListener('change', function (e) {
      if (!localStorage.getItem(LOCAL_STORAGE_KEY_CURRENT_THEME)) {
        document.documentElement.setAttribute('data-theme', e.matches ? DARK_THEME : LIGHT_THEME);
      }
    });
  }

  function initCodeCopy() {
    document.querySelectorAll(`.${CODE_BLOCK_COPY_BUTTON_CLASS}`).forEach(function (button) {
      button.addEventListener('click', function () {
        const container = button.closest(`.${CODE_BLOCK_CONTAINER_CLASS}`);

        if (!container) {
          return;
        }

        const codeElement = container.querySelector('pre code') || container.querySelector('pre');

        if (!codeElement) {
          return;
        }

        copyCodeToClipboard(codeElement.innerText, button);
      });
    });

    // wrap any standalone pre elements (if any without CODE_BLOCK_CONTAINER_CLASS)
    document.querySelectorAll(`pre:not(.${CODE_BLOCK_CONTAINER_CLASS} pre)`).forEach(function (pre) {

      if (pre.parentElement && pre.parentElement.classList.contains(CODE_BLOCK_CONTAINER_CLASS)) {
        return;
      }

      const container = document.createElement('div');
      container.className = CODE_BLOCK_CONTAINER_CLASS;

      const header = document.createElement('div');
      header.className = CODE_BLOCK_HEADER_CLASS;

      // Detect language from class (e.g., language-bash)
      const codeElement = pre.querySelector('code');
      let lang = 'code';

      if (codeElement) {
        const match = codeElement.className.match(CODE_BLOCK_HEADER_LANGUAGE_RXP);

        if (match) {
          lang = match[1];
        }
      }

      const langSpan = document.createElement('span');
      langSpan.className = CODE_BLOCK_LANGUAGE_CLASS;
      langSpan.textContent = lang;

      const copyBtn = document.createElement('button');
      copyBtn.className = CODE_BLOCK_COPY_BUTTON_CLASS;
      copyBtn.type = 'button';

      copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
      copyBtn.setAttribute('title', 'Copy code');

      copyBtn.innerHTML = `
        <i class="fa-regular fa-clipboard copy-icon"></i>
        <span class="copy-text">Copy</span>
      `;

      copyBtn.addEventListener('click', function () {
        const textToCopy = (codeElement || pre).innerText;
        copyCodeToClipboard(textToCopy, copyBtn);
      });

      header.appendChild(langSpan);
      header.appendChild(copyBtn);

      pre.parentNode.insertBefore(container, pre);
      container.appendChild(header);
      container.appendChild(pre);
    });
  }

  function copyCodeToClipboard(text, button) {
    // strip any trailing newlines
    const cleanText = text.replace(/\n+$/, '');

    navigator.clipboard.writeText(cleanText).then(
      function () {
        const copyText = button.querySelector('.copy-text');
        const origText = copyText ? copyText.textContent : 'Copy';
        button.classList.add('copied');

        if (copyText) {
          copyText.textContent = 'Copied!';
        }

        setTimeout(function () {
          button.classList.remove('copied');
          if (copyText) {
            copyText.textContent = origText;
          }
        }, 2000);
      },
      function (err) {
        console.warn('Failed to copy text: ', err);
      }
    );
  }

  function initAlertCallouts() {
    const alertTypes = {
      '[!NOTE]': { type: 'note', title: 'Note', icon: 'fa-solid fa-circle-info' },
      '[!TIP]': { type: 'tip', title: 'Tip', icon: 'fa-solid fa-lightbulb' },
      '[!IMPORTANT]': { type: 'important', title: 'Important', icon: 'fa-solid fa-circle-exclamation' },
      '[!WARNING]': { type: 'warning', title: 'Warning', icon: 'fa-solid fa-triangle-exclamation' },
      '[!CAUTION]': { type: 'caution', title: 'Caution', icon: 'fa-solid fa-circle-xmark' }
    };

    document.querySelectorAll('blockquote').forEach(function (bq) {
      const firstParagraph = bq.querySelector('p:first-child');

      if (!firstParagraph) {
        return;
      }

      const text = firstParagraph.innerHTML.trim();

      for (const [key, conf] of Object.entries(alertTypes)) {
        if (text.startsWith(key)) {
          bq.classList.add('alert-callout', `alert-${conf.type}`);
          
          // remove the tag from text
          let remaining = text.substring(key.length).trim();
          // remove leading <br> or newline
          remaining = remaining.replace(/^<br\s*\/?>/i, '').trim();

          const titleDiv = document.createElement('div');
          titleDiv.className = 'alert-title';
          titleDiv.innerHTML = `
            <i class="${conf.icon}"></i>
            <span>${conf.title}</span>
          `;

          if (remaining.length > 0) {
            firstParagraph.innerHTML = remaining;
            bq.insertBefore(titleDiv, firstParagraph);
          } else {
            firstParagraph.remove();
            bq.insertBefore(titleDiv, bq.firstChild);
          }
          break;
        }
      }
    });
  }

  function initResponsiveTables() {
    document.querySelectorAll('.post-content table').forEach(function (table) {
      if (table.parentElement && table.parentElement.classList.contains('table-wrapper')) {
        return;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'table-wrapper';

      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initThemeToggle();
      initCodeCopy();
      initAlertCallouts();
      initResponsiveTables();
    });
  } else {
    initThemeToggle();
    initCodeCopy();
    initAlertCallouts();
    initResponsiveTables();
  }
})();
