const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { query, initializeDatabase } = require('./database');

const app = express();
app.use(bodyParser.json());
app.use(cors());

const handleEvent = async (type, data) =>{
    try {
        if(type==='PostCreated'){
            const {id, title} = data;
            
            // Insert post into PostgreSQL database
            await query(
                'INSERT INTO posts (id, title) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
                [id, title]
            );
        }

        if(type==='CommentCreated'){
            console.log(data);
            const {id, content, postId, status} = data;
            
            // Insert comment into PostgreSQL database
            await query(
                'INSERT INTO comments (id, content, post_id, status) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING',
                [id, content, postId, status]
            );
        }

        if(type==='CommentUpdated'){
            const {id, postId, content, status} = data;
            
            // Update comment in PostgreSQL database
            await query(
                'UPDATE comments SET content = $1, status = $2 WHERE id = $3 AND post_id = $4',
                [content, status, id, postId]
            );
        }
    } catch (error) {
        console.error('Error handling event:', error);
    }
}

app.get('/posts', async (req, res)=>{
    try {
        // Fetch posts with their comments from PostgreSQL
        const postsResult = await query(
            'SELECT id, title, created_at FROM posts ORDER BY created_at DESC'
        );
        
        const posts = {};
        
        // Initialize posts object with empty comments arrays
        for (const post of postsResult.rows) {
            posts[post.id] = {
                id: post.id,
                title: post.title,
                comments: []
            };
        }
        
        // Fetch all comments for these posts
        const commentsResult = await query(
            'SELECT id, content, post_id, status, created_at FROM comments ORDER BY created_at ASC'
        );
        
        // Group comments by post_id
        for (const comment of commentsResult.rows) {
            if (posts[comment.post_id]) {
                posts[comment.post_id].comments.push({
                    id: comment.id,
                    content: comment.content,
                    status: comment.status
                });
            }
        }
        
        res.send(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send({error: 'Failed to fetch posts'});
    }
});

app.post('/events', async (req, res)=>{
    const {type, data} = req.body;

    await handleEvent(type, data);
    
    res.send({});
});

app.listen(4002, async ()=>{
    console.log("Listening on 4002");
    
    // Initialize database tables on startup
    try {
        await initializeDatabase();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1);
    }

    // Process existing events from event bus
    const res = await axios.get('http://event-bus-srv:4005/events').catch((err)=>{
        console.log(err.message);
    });

    if (res && res.data) {
        for(let event of res.data){
            console.log("Processing event: ", event.type);
            await handleEvent(event.type, event.data);
        }
    }
});
 