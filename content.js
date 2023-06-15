const SELECTOR_CHAT_LIST = '[aria-label="Chat list"]';
const SELECTOR_INPUT_BOX = '#main [data-testid="conversation-compose-box-input"]';
const SELECTOR_CHAT_ROW = '[role="application"] [role="row"]';
const SUGGEST_BUTTON_ID = 'nm-suggest';
const ENHANCE_BUTTON_ID = 'nm-enhance';
const SUGGEST_BUTTON_TEXT = 'Suggest';
const ENHANCE_BUTTON_TEXT = 'Enhance';

let OPENAI_KEY = '';

// Wait for Whatsapp to load
const targetNode = document.getElementById('app');
const observer = new MutationObserver(function (mutations) {
  if (document.querySelector(SELECTOR_CHAT_LIST)) {
    observer.disconnect();
    initApp();
  }
});
observer.observe(targetNode, { subtree: true, childList: true });

function initApp() {
  const chatsList = document.querySelector(SELECTOR_CHAT_LIST);
  chatsList.addEventListener("click", function () {
    const suggestButton = createSuggestButton();
    const enhanceButton = createEnhanceButton();

    const el = document.querySelector(SELECTOR_INPUT_BOX);
    el.addEventListener('keyup', () => {
      if (el.innerText.trim().length === 0) {
        if (suggestButton.style.display === 'none') {
          suggestButton.style.display = 'block';
          enhanceButton.style.display = 'none';
        }
      } else {
        if (enhanceButton.style.display === 'none') {
          enhanceButton.style.display = 'block';
          suggestButton.style.display = 'none';
        }
      }
    });
  });

  chrome.storage.local.get('openaiKey', function (data) {
    OPENAI_KEY = data.openaiKey || '';
  });
}

function createSuggestButton() {
  const inputField = document.querySelector(SELECTOR_INPUT_BOX);
  if (!inputField) return;

  const button = createActionButton(SUGGEST_BUTTON_ID);
  button.addEventListener('click', () => {
    disableButtonForProcessing(button);

    const messageTexts = [];
    const rows = document.querySelectorAll(SELECTOR_CHAT_ROW);
    for (const row of rows) {
      const ct = row.querySelector('span.copyable-text');
      if (ct) {
        const sender = row.querySelector('.message-out') ? 'Me:' : row.querySelector('[data-pre-plain-text]').getAttribute('data-pre-plain-text').split('] ')[1];
        messageTexts.push(` ${sender} ${ct.innerText}`);
      }
    }

    const messages = messageTexts.map(content => ({ role: 'user', content: content }));
    const systemPrompt = `Given the message exchange provided below, your task is to generate an appropriate response to the message from 'Me:'. Each message in the exchange begins with the name of the sender, followed by a colon (':'), and then the actual message.
Please consider the context of the conversation and generate a response that is relevant and coherent. Your response should only include the text of the message, without adding 'Me:' at the beginning.`;
    messages.unshift({ role: 'system', content: systemPrompt });

    callOpenAIAPI(messages)
      .finally(() => {
        enableButtonAfterProcessing(button);
      })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }

        throw new Error('OpenAI API error');
      })
      .then((data) => {
        if (data && data.choices && data.choices.length > 0) {
          const aiReply = data.choices[0].message.content.trim();

          // https://gist.github.com/kevinresol/f5253d148d5a37201b3e53f2b4fa70b2
          const ip = document.querySelector(SELECTOR_INPUT_BOX);
          ip.dispatchEvent(new InputEvent('input', {
            inputType: 'insertText',
            data: aiReply,
            bubbles: true,
            cancelable: false,
            composed: true,
            detail: 0,
          }));

          // To hide suggest and show enhance
          setTimeout(() => ip.dispatchEvent(new KeyboardEvent('keyup', { })), 100);
        }
      })
      .catch((error) => {
        alert('Could not talk to AI. Please try again.');
        console.error('Error:', error);
      });
  });

  inputField.parentElement.appendChild(button);
  return button;
}

function createEnhanceButton() {
  const inputField = document.querySelector(SELECTOR_INPUT_BOX);
  if (!inputField) return;

  const button = createActionButton(ENHANCE_BUTTON_ID);
  button.addEventListener('click', () => {
    disableButtonForProcessing(button);

    const userWrittenReply = document.querySelector(SELECTOR_INPUT_BOX).innerText;
    const systemPrompt = `Please proofread and improve the user's message delimited by ---. Your task is to make the message sound simple and coherent. Correct any grammatical mistakes if present.
---
${userWrittenReply}
---
Focus on enhancing clarity, coherence, and grammar while refining the user's response.`;

    const messages = [{ role: 'system', content: systemPrompt }];

    callOpenAIAPI(messages)
      .finally(() => {
        enableButtonAfterProcessing(button);
      })
      .then((res) => {
        if (res.ok) {
          return res.json();
        }

        throw new Error('OpenAI API error');
      })
      .then((data) => {
        if (data && data.choices && data.choices.length > 0) {
          const aiReply = data.choices[0].message.content.trim();

          // https://stackoverflow.com/a/73029608
          const dataTransfer = new DataTransfer();
          dataTransfer.setData('text', userWrittenReply + '\n' + aiReply);
          const evt = new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true
          });
          const el = document.querySelector(SELECTOR_INPUT_BOX);
          el.focus();
          document.execCommand("selectall");
          el.dispatchEvent(evt);
        }
      })
      .catch((error) => {
        alert('Could not talk to AI. Please try again.');
        console.error('Error:', error);
      });
  });

  inputField.parentElement.appendChild(button);
  return button;
}

function createActionButton(id) {
  const button = document.createElement('button');
  button.id = id;
  button.innerText = (id === SUGGEST_BUTTON_ID) ? SUGGEST_BUTTON_TEXT : ENHANCE_BUTTON_TEXT;

  button.style.position = 'absolute';
  button.style.top = '0px';
  button.style.right = '0px';
  button.style.color = '#25D366';
  button.style.padding = '4px 5px';
  button.style.borderRadius = '9px';
  button.style.border = '1px solid #8696a0';
  button.style.display = (id === SUGGEST_BUTTON_ID) ? 'block' : 'none';
  button.style.cursor = 'pointer';

  return button;
}

function disableButtonForProcessing(button) {
  button.disabled = true;
  button.innerText = 'Talking to AI...';
  button.style.border = 'none';
  button.style.cursor = 'wait';
}

function enableButtonAfterProcessing(button) {
  button.disabled = false;
  button.innerText = (button.id === SUGGEST_BUTTON_ID) ? SUGGEST_BUTTON_TEXT : ENHANCE_BUTTON_TEXT;
  button.style.border = '1px solid #8696a0';
  button.style.cursor = 'pointer';
}

function callOpenAIAPI(messages) {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      "model": "gpt-3.5-turbo",
      "messages": messages,
      "temperature": 0.5
    }),
  });
}
