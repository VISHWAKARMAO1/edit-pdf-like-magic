const express = require('express');
const app = express();
const port = 3001; // Or any other port you prefer

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the backend!' });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
