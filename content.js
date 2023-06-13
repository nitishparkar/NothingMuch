// content.js

var OPENAI_KEY = '';

function documentLoadedListener() {
  var ele = document.querySelector('[aria-label="Chat list"]');
  ele.addEventListener("click", function () {
    createSuggestButton();
    createEnhanceButton();
  });

  chrome.storage.local.get('openaiKey', function (data) {
    OPENAI_KEY = data.openaiKey || '';
  });
}

function createSuggestButton() {
  const inputField = document.querySelector('footer .lexical-rich-text-input');
  if (!inputField) return;

  const button = document.createElement('button');
  button.innerText = 'Suggest';

  // Add the desired CSS properties to the button
  button.style.position = 'absolute';
  button.style.top = '0px';
  button.style.right = '0px';
  button.style.backgroundColor = 'white';
  button.style.padding = '2px';
  button.style.borderRadius = '2px';

  button.addEventListener('click', () => {
    var outs = []
    var rows = document.querySelectorAll('[role="application"] [role="row"]');
    for (row of rows) {
      var ct = row.querySelector('span.copyable-text')
      if (ct) {
        var sender = row.querySelector('.message-out') ? 'Me:' : row.querySelector('[data-pre-plain-text]').getAttribute('data-pre-plain-text').split('] ')[1]
        outs.push(` ${sender} ${ct.innerText}`)
      }
    }

    var messages = outs.map(content => ({ role: 'user', content: content }));
    messages.unshift({ role: 'system', content: 'You are a helpful assistant. Your job is to look at the message exchange provided below and generate an appropriate response for "Me"'})
    // console.log('Messages:')
    // console.log(messages)
    // console.log('----------')

    fetch('https://api.openai.com/v1/chat/completions', {
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
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.choices && data.choices.length > 0) {
          const responseMessage = data.choices[0].message.content.trim();
          // console.log('OpenAI Response:')
          // console.log(responseMessage)
          // console.log('----------')

          // https://gist.github.com/kevinresol/f5253d148d5a37201b3e53f2b4fa70b2
          var ip = document.querySelector('#main [data-testid="conversation-compose-box-input"] p');
          ip.dispatchEvent(new InputEvent('input', {
            inputType: 'insertText',
            data: responseMessage,
            bubbles: true,
            cancelable: false,
            composed: true,
            detail: 0,
          }));
        }
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  });

  inputField.appendChild(button);
}

function createEnhanceButton() {
  const inputField = document.querySelector('footer .lexical-rich-text-input');
  if (!inputField) return;

  const button = document.createElement('button');
  button.innerText = 'Enhance';

  // Add the desired CSS properties to the button
  button.style.position = 'absolute';
  button.style.top = '0px';
  button.style.right = '50px';
  button.style.backgroundColor = 'gray';
  button.style.padding = '2px';
  button.style.borderRadius = '2px';

  button.addEventListener('click', () => {
    var outs = []
    var rows = document.querySelectorAll('[role="application"] [role="row"]');
    for (row of rows) {
      var ct = row.querySelector('span.copyable-text')
      if (ct) {
        var sender = row.querySelector('.message-out') ? 'Me:' : row.querySelector('[data-pre-plain-text]').getAttribute('data-pre-plain-text').split('] ')[1]
        outs.push(` ${sender} ${ct.innerText}`)
      }
    }

    var messages = outs.map(content => ({ role: 'user', content: content }));

    var userWrittenReply = document.querySelector('#main [data-testid="conversation-compose-box-input"]').innerText;
    var systemPrompt = `You are a helpful assistant. Your job is to look at the message exchange provided below and generate an appropriate response on behalf of the user, "Me".
    The user has already written a response or provided a few keywords/suggestions as follows:
    ${userWrittenReply}

    Please use those to generate the response. Return only response. Do not include any additional commentary. Do not ask any follow up questions or more information.
    `
    console.log(systemPrompt);

    messages.unshift({ role: 'system', content: systemPrompt })
    // console.log('Messages:')
    // console.log(messages)
    // console.log('----------')

    fetch('https://api.openai.com/v1/chat/completions', {
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
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.choices && data.choices.length > 0) {
          const responseMessage = data.choices[0].message.content.trim();
          console.log('OpenAI Response:')
          console.log(responseMessage)
          console.log('----------')

          // https://stackoverflow.com/a/73029608
          const dataTransfer = new DataTransfer();
          dataTransfer.setData('text', responseMessage);
          const evt = new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true
          });
          var el = document.querySelector('#main [data-testid="conversation-compose-box-input"]');
          el.focus();
          document.execCommand("selectall");
          el.dispatchEvent(evt);
        }
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  });

  inputField.appendChild(button);
}


const targetNode = document.getElementById("app");

var observer = new MutationObserver(function (mutations) {
  if (document.querySelector('[aria-label="Chat list"]')) {
    observer.disconnect();
    documentLoadedListener();
  }
});

observer.observe(targetNode, { attributes: false, childList: true, characterData: false, subtree: true });
