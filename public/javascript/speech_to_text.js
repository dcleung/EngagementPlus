//Reference: https://www.smashingmagazine.com/2017/08/ai-chatbot-web-speech-api-node-js/

function startStream(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = true;
  recognition.start();

  recognition.addEventListener('result', (e) => {
  let last = e.results.length - 1;
  let text = e.results[last][0].transcript;

  //console.log('Confidence: ' + e.results[0][0].confidence);
  //console.log(text);
  var out = document.getElementById('output');
  var out_text = document.getElementById('output_text');
  var li = document.createElement("span");
  li.className += "list-group-item";

  li.appendChild(document.createTextNode(text));
  out_text.appendChild(li);
  console.log(text);

  out_text.scrollTop = out_text.scrollHeight;
  });

  document.getElementById('stop').onclick = function()
  {
    recognition.stop();
  }  
}