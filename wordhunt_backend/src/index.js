const express = require('express');
const cors = require('cors');
const { processGameBoard } = require('./cpu/main');

const app = express();
const PORT = 3000;

app.use(cors({ origin: 'http://localhost:3001' }));
app.use(express.json());

app.post('/api/data', (req, res) => {
    const { board, difficulty } = req.body;
    console.log('Board:', board);
    console.log('Difficulty:', difficulty);

    const result = processGameBoard(board, difficulty);

    res.json({ reply: 'Message received successfully' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
