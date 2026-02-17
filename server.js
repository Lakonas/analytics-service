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





//Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded ({extended:true}));
app.use(express.static('public'));
app.use(express.json())
app.use(morgan('dev'));
app.use(cors());

app.get('/', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM events');
    const today = await pool.query('SELECT COUNT(*) FROM events WHERE occurred_at::date = CURRENT_DATE');
    const sources = await pool.query('SELECT COUNT(DISTINCT source) FROM events');
    const topEvent = await pool.query('SELECT event_type, COUNT(*) FROM events GROUP BY event_type ORDER BY count DESC LIMIT 1');
    const recents = await pool.query('SELECT * FROM events ORDER BY occurred_at DESC LIMIT 20');
    const daily = await pool.query('SELECT source, occurred_at::date AS day, COUNT(*) FROM events GROUP BY source, occurred_at::date ORDER BY day, source');
    const topStats = await pool.query('SELECT event_type, COUNT(*) AS event_count FROM events GROUP BY event_type ORDER BY event_count DESC');

    res.render('index', {
      total: total.rows[0].count,
      today: today.rows[0].count,
      sources: sources.rows[0].count,
      topEvent: topEvent.rows[0],
      recents: recents.rows,
      daily: daily.rows,
      topStats: topStats.rows
    });
  } catch (err) {
    console.error('Error getting data:', err);
    res.status(500).send('Server error');
  }
});

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

app.get('/api/stats/summary', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM events');
    const today = await pool.query('SELECT COUNT(*) FROM events WHERE occurred_at::date = CURRENT_DATE');
    const sources = await pool.query('SELECT COUNT(DISTINCT source) FROM events');
    const topEvent = await pool.query('SELECT event_type, COUNT(*) FROM events GROUP BY event_type ORDER BY count DESC LIMIT 1');

    res.json({
      total_events: total.rows[0].count,
      events_today: today.rows[0].count,
      active_sources: sources.rows[0].count,
      top_event: topEvent.rows[0]
    });
  } catch (err) {
    console.error('Error getting stats:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.get('/api/stats/daily', async (req, res) => {
  try {
    const daily = await pool.query(`SELECT source, occurred_at::date AS day, COUNT(*) 
                                    FROM events 
                                    GROUP BY source, occurred_at::date 
                                    ORDER BY day, source`);
    res.json(daily.rows);
  } catch (err) {
    console.error('Error getting daily stats:', err);
    res.status(500).json({ error: 'Failed to get daily stats' });
  }
});  

app.get('/api/stats/top', async (req, res)=>{
  try{
    const topStats = await pool.query(`SELECT 
                    event_type,
                    COUNT(*) AS event_count
                  FROM events
                  GROUP BY event_type
                  ORDER BY event_count DESC;
                  `

    );
    res.json(topStats.rows)
  }catch (err){
    console.error('Error getting top stats', err)
    res.status(500).json({ error: 'Failed to get stats'});
  }
});



app.listen(PORT, () => {
  console.log(`listening on port${PORT}`)
})

