const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const axios = require('axios');
const { query, initializeDatabase } = require('./database');

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.get('/posts/:id/comments', async (req, res)=>{
    try {
        const result = await query(
            'SELECT id, content, status FROM comments WHERE post_id = $1 ORDER BY created_at ASC',
            [req.params.id]
        );
        res.send(result.rows);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).send({error: 'Failed to fetch comments'});
    }
});

app.post('/posts/:id/comments', async (req, res)=>{
    const commentId = uuidv4();
    const {content} = req.body;
    const postId = req.params.id;

    try {
        // Insert comment into PostgreSQL database
        await query(
            'INSERT INTO comments (id, content, post_id, status) VALUES ($1, $2, $3, $4)',
            [commentId, content, postId, 'pending']
        );

        // Emit event to event bus
        await axios.post('http://event-bus-srv:4005/events', {
            type: "CommentCreated",
            data:{
                id: commentId,
                content,
                postId,
                status: 'pending'
            }
        }).catch((err)=>{
            console.log(err.message);
        });

        // Return the created comment
        res.status(201).send({id: commentId, content, status: 'pending'});
    } catch (error) {
        console.error('Error creating comment:', error);
        res.status(500).send({error: 'Failed to create comment'});
    }
});

app.post('/events', async (req, res)=>{
    console.log("Event Received "+req.body.type);

    const {type, data} = req.body;

    if(type==='CommentModerated'){
        const {postId, id, status, content} = data;
        
        try {
            // Update comment status in PostgreSQL database
            await query(
                'UPDATE comments SET status = $1 WHERE id = $2 AND post_id = $3',
                [status, id, postId]
            );

            // Emit updated event to event bus
            await axios.post('http://event-bus-srv:4005/events', {
                type: 'CommentUpdated',
                data:{
                    id,
                    postId,
                    content,
                    status
                }
            });
        } catch (error) {
            console.error('Error updating comment status:', error);
        }
    }

    res.send({});
})

app.listen(4001, async ()=>{
    console.log("Listening on 4001");
    
    // Initialize database tables on startup
    try {
        await initializeDatabase();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }
});