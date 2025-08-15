const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const axios = require('axios');
const { query, initializeDatabase } = require('./database');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// app.get('/posts', (req, res)=>{
//     res.send(posts);
// });

app.post('/posts/create', async (req, res)=>{
    const id = uuidv4();
    const {title} = req.body;

    try {
        // Insert post into PostgreSQL database
        await query(
            'INSERT INTO posts (id, title) VALUES ($1, $2)',
            [id, title]
        );

        // Emit event to event bus
        await axios.post('http://event-bus-srv:4005/events', {
            type:"PostCreated",
            data:{
                id, title
            }
        }).catch((err)=>{
            console.log(err.message);
        });

        res.status(201).send({id, title});
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).send({error: 'Failed to create post'});
    }
});

app.post('/events', (req, res)=>{
    console.log("Event Received "+req.body.type);

    res.send({});
})

app.listen(4000, async ()=>{
    console.log("v60");
    console.log("Listening on 4000");
    
    // Initialize database tables on startup
    try {
        await initializeDatabase();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
});