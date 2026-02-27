require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const app = express();
app.use(express.json());
app.use(cors());

// --- 1. AWS Cognito JWT Verification Setup ---
const client = jwksClient({
    jwksUri: `https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_npiLuJpaD/.well-known/jwks.json`
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}

// Middleware to verify the token sent from React
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('No token provided');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, getKey, {
        issuer: `https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_npiLuJpaD`,
        algorithms: ['RS256']
    }, (err, decoded) => {
        if (err) return res.status(401).send('Invalid token');

        // Map Cognito claims to our req.user object
        req.user = {
            username: decoded["cognito:username"] || decoded.email,
            role: decoded["custom:role"] || 'student'
        };
        next();
    });
};

// --- 2. Database Connection (RDS with SSL) ---
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'postgres',
        port: 5432,
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    }
);

// Models (User model kept for profile storage if needed)
const Complaint = sequelize.define('Complaint', {
    student: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: false },
    priority: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' }
});

sequelize.sync().then(() => console.log('DB Synced'));

// --- 3. Protected API Routes ---

// Post a new complaint (Auth Required)
app.post('/api/complaints', verifyToken, async (req, res) => {
    try {
        const complaint = await Complaint.create({
            ...req.body,
            student: req.user.username // Use verified username from token
        });
        res.status(201).json(complaint);
    } catch (err) { res.status(400).send(err.message); }
});

// Get complaints with role-based filtering (Auth Required)
app.get('/api/complaints', verifyToken, async (req, res) => {
    const { category, status } = req.query;
    const { role, username } = req.user; // Get from decoded token

    let whereClause = {};
    if (role === 'student') whereClause.student = username;
    if (category) whereClause.category = category;
    if (status) whereClause.status = status;

    const complaints = await Complaint.findAll({ where: whereClause });
    res.json(complaints);
});

// Admin status update (Auth Required)
app.put('/api/complaints/:id', verifyToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).send('Forbidden');

    await Complaint.update({ status: req.body.status }, { where: { id: req.params.id } });
    res.send('Updated');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));