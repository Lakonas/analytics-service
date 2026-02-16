require('dotenv').config();
const express = require ("express");
const morgan = require('morgan');
const cors = require ("cors");

const PORT = process.env.PORT || 8080;
const app = express()
const pool = require('./db/database');
pool.query('SELECT NOW()')
  .then(res => console.log('Database connected:', res.rows[0].now))
  .catch(err => console.error('Database connection error:', err));






app.set('view engine', 'ejs');
app.use(express.urlencoded ({extended:true}));
app.use(express.static('public'));
app.use(express.json())
app.use(morgan('dev'));
app.use(cors());

app.get('/', (req, res) =>{
  res.render('index');
})

app.post('/api/events', async (req, res)=>{
  const {source, event_type, occurred_at, metadata} = req.body;
  
  try{
    const events = await pool.query (
      'INSERT INTO events (source, event_type, occurred_at, metadata) VALUES ($1, $2, $3, $4) RETURNING *',
      [source, event_type, occurred_at, metadata]
    );
    res.status(201).json (events.rows[0]);
    
  }catch (err){
    console.error('Error getting events:', err);
    res.status(500).json({error:'Failed to save event'})
    
  }

})

app.get('/api/events', async (req, res) => {
  try {
    const recents = await pool.query(
      'SELECT * FROM events ORDER BY occurred_at DESC LIMIT 20'
    );
    res.json(recents.rows);
  } catch (err) {
    console.error('Error getting events:', err);
    res.status(500).json({ error: 'Failed to get recent events' });
  }
});

app.listen(PORT, () => {
  console.log(`listening on port${PORT}`)
})

