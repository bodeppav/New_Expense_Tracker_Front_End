import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Button, Modal, Form, Table, Pagination } from 'react-bootstrap';
import { FaSun, FaMoon } from 'react-icons/fa';
import { Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { jwtDecode } from 'jwt-decode'; // To decode the JWT token

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const App = () => {
  const [expenses, setExpenses] = useState([]);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Switch between SignUp and Login
  const expensesPerPage = 5;

  // Check if token exists, indicating the user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      const decodedToken = jwtDecode(token);
      localStorage.setItem('userId', decodedToken.userId);  // Store userId in localStorage
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', newMode);
    document.body.classList.toggle('dark', newMode);
  };

  const handleLogin = () => {
    axios.post('http://localhost:5000/login', { username, password })
      .then((response) => {
        const token = response.data.token;
        localStorage.setItem('token', token);

        const decodedToken = jwtDecode(token);
        localStorage.setItem('userId', decodedToken.userId);

        setIsLoggedIn(true);
      })
      .catch((error) => {
        console.error('Login error:', error);
        alert('Invalid credentials');
      });
  };

  const handleSignUp = () => {
    axios.post('http://localhost:5000/register', { username, password })
      .then((response) => {
        alert('User Registered Successfully! Please login');
        setIsSignUp(false);  // Switch back to login screen
      })
      .catch((error) => {
        console.error('SignUp error:', error);
        alert('Error registering user');
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId'); // Remove userId from localStorage
    setIsLoggedIn(false);
  };

  const onExpenseUpdated = (updatedExpense) => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');  // Retrieve userId from localStorage

    if (updatedExpense._id) {
      // Edit Expense (PUT request)
      axios.put(`http://localhost:5000/expenses/${updatedExpense._id}`, {
        ...updatedExpense,
        userId: userId  // Pass userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((response) => {
          setExpenses((prevExpenses) => prevExpenses.map((expense) => (expense._id === updatedExpense._id ? response.data : expense)));
          setShowModal(false);
        })
        .catch((error) => console.error('Error updating expense:', error));
    } else {
      // Add new Expense (POST request)
      axios.post('http://localhost:5000/expenses', {
        ...updatedExpense,
        userId: userId  // Pass userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((response) => {
          setExpenses((prevExpenses) => [...prevExpenses, response.data]);
          setShowModal(false);
        })
        .catch((error) => console.error('Error adding expense:', error));
    }
  };

  const deleteExpense = (expenseId) => {
    const token = localStorage.getItem('token');
    axios.delete(`http://localhost:5000/expenses/${expenseId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => {
        // Refresh the expense list after deletion
        const userId = localStorage.getItem('userId');
        axios.get(`http://localhost:5000/expenses?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(response => {
            setExpenses(response.data); // Update the expenses data
          })
          .catch((error) => {
            console.error('Error fetching expenses:', error);
          });
      })
      .catch((error) => console.error('Error deleting expense:', error));
  };

  // Fetch expenses when logged in
  useEffect(() => {
    if (isLoggedIn) {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      axios.get(`http://localhost:5000/expenses?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(response => {
          setExpenses(response.data); // Set the expenses data
        })
        .catch((error) => {
          console.error('Error fetching expenses:', error);
          alert('Unable to fetch expenses');
        });
    }
  }, [isLoggedIn]);


  const totalPages = Math.ceil(expenses.length / expensesPerPage);

  // Filter Expenses based on filters
  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = filterCategory ? expense.category === filterCategory : true;
    const matchesStartDate = filterStartDate ? new Date(expense.date) >= new Date(filterStartDate) : true;
    const matchesEndDate = filterEndDate ? new Date(expense.date) <= new Date(filterEndDate) : true;
    return matchesCategory && matchesStartDate && matchesEndDate;
  });

  const categoryData = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = acc[expense.category] ? acc[expense.category] + expense.amount : expense.amount;
    return acc;
  }, {});

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0); // Calculate total expenses

  const pieData = {
    labels: Object.keys(categoryData),
    datasets: [{
      data: Object.values(categoryData),
      backgroundColor: ['#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#57FF33', '#FF9833'],
      hoverOffset: 4,
    }],
  };

  const renderAuthForm = () => {
    return (
      <Modal show={!isLoggedIn} onHide={() => { }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{isSignUp ? "Sign Up" : "Login"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => { e.preventDefault(); isSignUp ? handleSignUp() : handleLogin(); }} >
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100">
              {isSignUp ? "Sign Up" : "Login"}
            </Button>
          </Form>
          <Button variant="link" onClick={() => setIsSignUp(!isSignUp)} className="mt-3 w-100 text-center">
            {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
          </Button>
        </Modal.Body>
      </Modal>
    );
  };

  if (!isLoggedIn) {
    return renderAuthForm();
  }

  return (
    <Container className="my-4">
      {/* Top buttons */}
      <div className="top-buttons">
        <Button variant="outline-warning" className="theme-toggle" onClick={toggleTheme}>
          {isDarkMode ? <FaSun /> : <FaMoon />}
        </Button>
        <Button className="add-expense-button" onClick={() => setShowModal(true)}>
          Add Expense
        </Button>
        <Button variant="outline-danger" className="logout-button" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <h1 className="text-center mb-4">Expense Dashboard</h1>

      {/* Total Expenses */}
      <div className="total-expenses text-center mb-4">
        <h3>Total Expenses: ${totalAmount.toFixed(2)}</h3>
      </div>

      {/* Filter Section */}
      <div className="filters mb-4">
        <Form.Group>
          <Form.Label>Category</Form.Label>
          <Form.Control as="select" onChange={(e) => setFilterCategory(e.target.value)} value={filterCategory}>
            <option value="">All</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Utilities">Utilities</option>
            <option value="Shopping">Shopping</option>
            <option value="Other">Other</option>
          </Form.Control>
        </Form.Group>

        <Form.Group>
          <Form.Label>Start Date</Form.Label>
          <Form.Control type="date" onChange={(e) => setFilterStartDate(e.target.value)} value={filterStartDate} />
        </Form.Group>

        <Form.Group>
          <Form.Label>End Date</Form.Label>
          <Form.Control type="date" onChange={(e) => setFilterEndDate(e.target.value)} value={filterEndDate} />
        </Form.Group>
      </div>

      {/* Chart Section */}
      <div className="chart-section">
        <div className="chart">
          <h3>Expense Trends</h3>
          <Line data={{
            labels: filteredExpenses.map(expense => expense.title),
            datasets: [{
              label: 'Amount',
              data: filteredExpenses.map(expense => expense.amount),
              backgroundColor: '#007bff',
              borderColor: '#007bff',
              borderWidth: 2,
            }]
          }} />
        </div>

        <div className="chart">
          <h3>Category Breakdown</h3>
          <Pie data={pieData} />
        </div>
      </div>

      {/* Expense Table */}
      <Table className="expense-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredExpenses.map((expense) => (
            <tr key={expense._id}>
              <td>{expense.title}</td>
              <td>${expense.amount}</td>
              <td>{expense.category}</td>
              <td>{new Date(expense.date).toLocaleDateString()}</td>
              <td>
                <Button variant="success" onClick={() => {
                  setEditingExpense(expense);
                  setShowModal(true);
                }}>Edit</Button>
                <Button variant="danger" onClick={() => deleteExpense(expense._id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Pagination */}
      <Pagination className="pagination">
        <Pagination.Prev
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
        />
        <Pagination.Item>{currentPage}</Pagination.Item>
        <Pagination.Next
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
        />
      </Pagination>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => {
            e.preventDefault();
            onExpenseUpdated({
              title: e.target.title.value,
              amount: e.target.amount.value,
              date: e.target.date.value,
              category: e.target.category.value,
              id: editingExpense?._id,
            });
          }}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control type="text" defaultValue={editingExpense?.title} name="title" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Amount</Form.Label>
              <Form.Control type="number" defaultValue={editingExpense?.amount} name="amount" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control type="date" defaultValue={editingExpense?.date} name="date" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Control as="select" defaultValue={editingExpense?.category} name="category" required>
                <option value="Food">Food</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Shopping">Shopping</option>
                <option value="Other">Other</option>
              </Form.Control>
            </Form.Group>
            <div className="button-container">
              <Button className="cancel-button" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button className="add-button" type="submit">
                {editingExpense ? 'Update' : 'Add'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default App;
