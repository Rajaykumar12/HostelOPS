import React, { useState } from 'react';

function App() {
    const [user, setUser] = useState(null);
    const [complaints, setComplaints] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [newComplaint, setNewComplaint] = useState({ category: 'Electrical', description: '', priority: 'Low' });

    const handleLogin = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (res.ok) {
            const data = await res.json();
            setUser(data);
            fetchComplaints(data);
        } else alert("Login failed");
    };

    const fetchComplaints = async (currentUser) => {
        const res = await fetch(`/api/complaints?role=${currentUser.role}&username=${currentUser.username}`);
        setComplaints(await res.json());
    };

    const submitComplaint = async (e) => {
        e.preventDefault();
        await fetch('/api/complaints', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...newComplaint, student: user.username })
        });
        fetchComplaints(user);
    };

    const updateStatus = async (id, newStatus) => {
        await fetch(`/api/complaints/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        fetchComplaints(user);
    };

    if (!user) {
        return (
            <div style={{ padding: '20px' }}>
                <h2>HostelOps Login</h2>
                <form onSubmit={handleLogin}>
                    <input type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} required />
                    <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} required />
                    <button type="submit">Login</button>
                </form>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h1>Welcome, {user.username} ({user.role})</h1>

            {user.role === 'student' && (
                <form onSubmit={submitComplaint}>
                    <h3>Submit a Complaint</h3>
                    <select onChange={e => setNewComplaint({ ...newComplaint, category: e.target.value })}>
                        <option>Electrical</option><option>Plumbing</option><option>Carpentry</option>
                    </select>
                    <input type="text" placeholder="Description" onChange={e => setNewComplaint({ ...newComplaint, description: e.target.value })} required />
                    <select onChange={e => setNewComplaint({ ...newComplaint, priority: e.target.value })}>
                        <option>Low</option><option>Medium</option><option>High</option>
                    </select>
                    <button type="submit">Submit</button>
                </form>
            )}

            <h3>Complaints List</h3>
            <ul>
                {complaints.map(c => (
                    <li key={c.id}>
                        <strong>{c.category} ({c.priority})</strong>: {c.description} - <em>{c.status}</em>
                        {user.role === 'admin' && (
                            <select value={c.status} onChange={e => updateStatus(c.id, e.target.value)} style={{ marginLeft: '10px' }}>
                                <option>Pending</option><option>In Progress</option><option>Resolved</option>
                            </select>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default App;