document.addEventListener('DOMContentLoaded', function() {
  const codeBlocks = document.querySelectorAll('pre'); // Or your specific code block selector

  codeBlocks.forEach(codeBlock => {
    const copyButton = document.createElement('button');
    copyButton.innerHTML = '<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="clipboard" class="svg-inline--fa fa-clipboard fa-w-12 fa-sm" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="currentColor" d="M288 448v-72c0-13.3-10.7-24-24-24H120c-13.3 0-24 10.7-24 24v72h192zm120-280H264V48c0-26.5-21.5-48-48-48H168c-26.5 0-48 21.5-48 48v120H24c-13.3 0-24 10.7-24 24v216c0 13.3 10.7 24 24 24h80v-72c0-44.2 35.8-80 80-80h80c44.2 0 80 35.8 80 80v72h80c13.3 0 24-10.7 24-24V192c0-13.3-10.7-24-24-24zM64 216v184c0 4.4-3.6 8-8 8H32c-4.4 0-8-3.6-8-8V216c0-4.4 3.6-8 8-8h24c4.4 0 8 3.6 8 8zm320 0v184c0 4.4-3.6 8-8 8h-24c-4.4 0-8-3.6-8-8V216c0-4.4 3.6-8 8-8h24c4.4 0 8 3.6 8 8z"/></svg>'; // You can use text like "Copy" instead
    copyButton.classList.add('copy-button');
    codeBlock.appendChild(copyButton);

    copyButton.addEventListener('click', function() {
      const code = codeBlock.textContent;
      navigator.clipboard.writeText(code)
        .then(() => {
          // Optional: Provide visual feedback (e.g., change button text briefly)
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.innerHTML = '<svg aria-hidden="true" focusable="false" data-prefix="far" data-icon="clipboard" class="svg-inline--fa fa-clipboard fa-w-12 fa-sm" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="currentColor" d="M288 448v-72c0-13.3-10.7-24-24-24H120c-13.3 0-24 10.7-24 24v72h192zm120-280H264V48c0-26.5-21.5-48-48-48H168c-26.5 0-48 21.5-48 48v120H24c-13.3 0-24 10.7-24 24v216c0 13.3 10.7 24 24 24h80v-72c0-44.2 35.8-80 80-80h80c44.2 0 80 35.8 80 80v72h80c13.3 0 24-10.7 24-24V192c0-13.3-10.7-24-24-24zM64 216v184c0 4.4-3.6 8-8 8H32c-4.4 0-8-3.6-8-8V216c0-4.4 3.6-8 8-8h24c4.4 0 8 3.6 8 8zm320 0v184c0 4.4-3.6 8-8 8h-24c-4.4 0-8-3.6-8-8V216c0-4.4 3.6-8 8-8h24c4.4 0 8 3.6 8 8z"/></svg>';
          }, 1500);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          copyButton.textContent = 'Error';
        });
    });
  });
});