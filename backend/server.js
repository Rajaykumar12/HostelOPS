require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to AWS RDS
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        port: 5432,
        logging: false,
        // ADD THIS SECTION:
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Necessary for RDS unless you provide a specific CA cert
            }
        }
    }
);

// Models
const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: 'student' }
});

const Complaint = sequelize.define('Complaint', {
    student: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    priority: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' }
});

sequelize.sync().then(() => console.log('DB Synced'));

// API Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        await User.create(req.body);
        res.status(201).send('Registered');
    } catch (err) { res.status(400).send(err.message); }
});

app.post('/api/auth/login', async (req, res) => {
    const user = await User.findOne({ where: { username: req.body.username, password: req.body.password } });
    if (user) res.json({ username: user.username, role: user.role });
    else res.status(401).send('Invalid');
});

app.post('/api/complaints', async (req, res) => {
    const complaint = await Complaint.create(req.body);
    res.status(201).json(complaint);
});

app.get('/api/complaints', async (req, res) => {
    const { role, username, category, status } = req.query;
    let whereClause = {};
    if (role === 'student') whereClause.student = username;
    if (category) whereClause.category = category;
    if (status) whereClause.status = status;

    const complaints = await Complaint.findAll({ where: whereClause });
    res.json(complaints);
});

app.put('/api/complaints/:id', async (req, res) => {
    await Complaint.update({ status: req.body.status }, { where: { id: req.params.id } });
    res.send('Updated');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));