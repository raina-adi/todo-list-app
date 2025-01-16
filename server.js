const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();

// Create a connection to the database using mysql2
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Your MySQL username
  password: 'Raina@123', // Your MySQL password
  database: 'registration_db' // Your database name
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

// Middleware to authenticate the token and set req.user
function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.split(' ')[1]; // Extract token from the header

  if (!token) {
    return res.status(401).json({ message: 'Token is required' });
  }

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user; // Store user data in req.user
    next(); // Proceed to the next middleware/route handler
  });
}

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

    if (result.length === 0) {
      return res.status(401).json({ message: 'Incorrect credentials!' });
    }

    // Compare the password (no hashing in this case, just direct comparison)
    if (result[0].password !== password) {
      return res.status(401).json({ message: 'Incorrect credentials!' });
    }

    // Generate JWT token
    const user = { id: result[0].id, email: result[0].email };
    const token = jwt.sign(user, 'your_jwt_secret', { expiresIn: '1h' });

    return res.status(200).json({ message: 'Login successful!', token });
  });
});

// 3. **Add a To-Do Item**
app.post('/add-todo', authenticateToken, (req, res) => {
  const { title, description } = req.body;
  const userId = req.user.id; // Get the user ID from the JWT token

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  const insertTodoQuery = 'INSERT INTO todo (user_id, title, description, created_by) VALUES (?, ?, ?, ?)';
  db.query(insertTodoQuery, [userId, title, description, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error adding to-do item', error: err });
    }
    return res.status(201).json({ message: 'To-do item added successfully' });
  });
});

// 4. **Get All To-Do Items for the Logged-In User**
app.get('/todos', authenticateToken, (req, res) => {
  const userId = req.user.id; // Get the user ID from the JWT token

  const selectQuery = 'SELECT * FROM todo WHERE created_by = ?';
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
  const userId = req.user.id; // Get the user ID from the JWT token

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  const updateQuery = 'UPDATE todo SET title = ?, description = ? WHERE id = ? AND created_by = ?';
  db.query(updateQuery, [title, description, todoId, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error updating to-do item', error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'To-do item not found or you do not have permission to update it' });
    }
    return res.status(200).json({ message: 'To-do item updated successfully' });
  });
});

// 6. **Delete a To-Do Item**
app.delete('/delete-todo/:id', authenticateToken, (req, res) => {
  const todoId = req.params.id;
  const userId = req.user.id; // Get the user ID from the JWT token

  const deleteQuery = 'DELETE FROM todo WHERE id = ? AND created_by = ?';
  db.query(deleteQuery, [todoId, userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error deleting to-do item', error: err });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'To-do item not found or you do not have permission to delete it' });
    }
    return res.status(200).json({ message: 'To-do item deleted successfully' });
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
