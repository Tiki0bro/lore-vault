const http = require('http');

async function testUpload() {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  
  const bodyParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="world_id"\r\n\r\ndefault\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nTEst\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.webp"\r\nContent-Type: image/webp\r\n\r\nfakeimagebytes\r\n`,
    `--${boundary}--\r\n`
  ];

  const body = bodyParts.join('');

  const req = http.request('http://localhost:3000/api/maps', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(body)
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', data);
    });
  });

  req.on('error', console.error);
  req.write(body);
  req.end();
}

testUpload();
