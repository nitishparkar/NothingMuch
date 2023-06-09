document.addEventListener('DOMContentLoaded', () => {
  const openaiKeyInput = document.getElementById('openai-key');
  const saveButton = document.getElementById('save-btn');

  // Load the saved OpenAI key
  chrome.storage.local.get('openaiKey', (data) => {
    openaiKeyInput.value = data.openaiKey || '';
  });

  // Save the OpenAI key
  saveButton.addEventListener('click', () => {
    const openaiKey = openaiKeyInput.value.trim();

    // Save the OpenAI key in the extension's storage
    chrome.storage.local.set({ openaiKey }, () => {
      alert('OpenAI key saved successfully!');
    });
  });
});
