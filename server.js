const express = require('express');
const path = require('path');
const Datastore = require('nedb');
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize NeDB database
const db = new Datastore({ filename: path.join(__dirname, 'feedback.db'), autoload: true });

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API Routes
app.get('/api/feedback', (req, res) => {
  db.find({}).sort({ createdAt: -1 }).exec((err, feedbacks) => {
    if (err) return res.status(500).send(err);
    res.json(feedbacks);
  });
});

app.post('/api/feedback', (req, res) => {
  const feedback = {
    ...req.body,
    author: req.body.author || 'Anonymous',
    category: req.body.category || 'General',
    votes: 0,
    createdAt: new Date()
  };

  db.insert(feedback, (err, newFeedback) => {
    if (err) return res.status(500).send(err);
    res.status(201).json(newFeedback);
    if (io) io.emit('new-feedback', newFeedback);
  });
});

app.post('/api/feedback/:id/vote', (req, res) => {
  const { direction } = req.body;
  const voteChange = direction === 'up' ? 1 : -1;

  db.update(
    { _id: req.params.id },
    { $inc: { votes: voteChange } },
    { returnUpdatedDocs: true },
    (err, numAffected, updatedFeedback) => {
      if (err) return res.status(500).send(err);
      res.json(updatedFeedback);
      if (io) io.emit('vote-update', { id: req.params.id, votes: updatedFeedback.votes });
    }
  );
});

// Start server
const server = app.listen(PORT, () => {
  console.log('\n------------------------------------------');
  console.log('   Feedback Wall Server is running!');
  console.log(`   Local: http://localhost:${PORT}`);
  console.log('------------------------------------------\n');
});

// Socket.io setup
const io = require('socket.io')(server);
io.on('connection', (socket) => {
  console.log('Client connected');
});