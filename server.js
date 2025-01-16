const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();

// Create a connection to the database using mysql2
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Replace with your MySQL username
  password: 'Raina@123', // Replace with your MySQL password
  database: 'registration_db' // Replace with your actual database name
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to the database');
});

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Authentication middleware to verify the JWT token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1]; // Get token from Authorization header

  if (!token) {
    return res.status(401).json({ message: 'Token is required' });
  }

  jwt.verify(token, 'your_jwt_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user; // Attach user info to request object
    next(); // Proceed to the next middleware or route handler
  });
};

// 1. **User Registration**
app.post('/register', (req, res) => {
  const { name, mobile_no, email, password } = req.body;

  if (!name || !mobile_no || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const insertQuery = 'INSERT INTO registration (name, mobile_no, email, password) VALUES (?, ?, ?, ?)';
  db.query(insertQuery, [name, mobile_no, email, password], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error registering user', error: err });
    }
    return res.status(201).json({ message: 'User registered successfully' });
  });
});

// 2. **User Login**
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const loginQuery = 'SELECT * FROM registration WHERE email = ?';
  db.query(loginQuery, [email], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error', error: err });
    }

    if (result.length === 0 || result[0].password !== password) {
      return res.status(401).json({ message: 'Incorrect credentials!' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: result[0].id, email: result[0].email }, 'your_jwt_secret_key', { expiresIn: '1h' });

    return res.status(200).json({ message: 'Login successful!', token });
  });
});

// 3. **Add a To-Do Item**
app.post('/add-todo', authenticateToken, (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.id; // Access user ID from the JWT payload

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  const insertTodoQuery = 'INSERT INTO todo (user_id, title, description) VALUES (?, ?, ?)';
  db.query(insertTodoQuery, [userId, title, description], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error adding to-do item', error: err });
    }
    return res.status(201).json({ message: 'To-do item added successfully' });
  });
});

// 4. **Get All To-Do Items for a User**
app.get('/todos', authenticateToken, (req, res) => {
  const userId = req.user.id;

  const selectQuery = 'SELECT * FROM todo WHERE user_id = ?';
  db.query(selectQuery, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching to-do items', error: err });
    }
    return res.status(200).json({ todos: result });
  });
});

// 5. **Update a To-Do Item**
app.put('/update-todo/:id', authenticateToken, (req, res) => {
  const todoId = req.params.id;
  const { title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  const updateQuery = 'UPDATE todo SET title = ?, description = ? WHERE id = ? AND user_id = ?';
  db.query(updateQuery, [title, description, todoId, req.user.id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error updating to-do item', error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'To-do item not found or not owned by the user' });
    }
    return res.status(200).json({ message: 'To-do item updated successfully' });
  });
});

// 6. **Delete a To-Do Item**
app.delete('/delete-todo/:id', authenticateToken, (req, res) => {
  const todoId = req.params.id;

  const deleteQuery = 'DELETE FROM todo WHERE id = ? AND user_id = ?';
  db.query(deleteQuery, [todoId, req.user.id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error deleting to-do item', error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'To-do item not found or not owned by the user' });
    }
    return res.status(200).json({ message: 'To-do item deleted successfully' });
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
