const http = require('http');

http.get('http://localhost:5000/api/lessons', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Lessons response:', data));
}).on('error', console.error);
