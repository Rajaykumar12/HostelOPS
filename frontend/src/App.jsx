import React, { useState, useEffect, useCallback } from 'react';

function App() {
    const [user, setUser] = useState(null);
    const [complaints, setComplaints] = useState([]);

    // Auth State
    const [isLoginView, setIsLoginView] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [regRole, setRegRole] = useState('student');
    const [authError, setAuthError] = useState('');
    const [authSuccess, setAuthSuccess] = useState('');

    // Complaint Form State
    const [newComplaint, setNewComplaint] = useState({ category: 'Electrical', description: '', priority: 'Low' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter State
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const fetchComplaints = useCallback(async (currentUser = user) => {
        if (!currentUser) return;
        let url = `/api/complaints?role=${currentUser.role}&username=${currentUser.username}`;

        if (currentUser.role === 'admin') {
            if (filterCategory) url += `&category=${filterCategory}`;
            if (filterStatus) url += `&status=${filterStatus}`;
        }

        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setComplaints(data);
            }
        } catch (err) {
            console.error("Failed to fetch complaints", err);
        }
    }, [user, filterCategory, filterStatus]);

    useEffect(() => {
        if (user) {
            fetchComplaints(user);
        }
    }, [user, filterCategory, filterStatus, fetchComplaints]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                setUsername('');
                setPassword('');
            } else {
                setAuthError("Invalid username or password");
            }
        } catch (err) {
            setAuthError("Server connection failed");
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthSuccess('');
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role: regRole })
            });
            if (res.ok) {
                setAuthSuccess("Registration successful! Please login.");
                setIsLoginView(true);
                setPassword('');
            } else {
                const errMsg = await res.text();
                setAuthError(errMsg || "Registration failed");
            }
        } catch (err) {
            setAuthError("Server connection failed");
        }
    };

    const submitComplaint = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/complaints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newComplaint, student: user.username })
            });
            if (res.ok) {
                setNewComplaint({ category: 'Electrical', description: '', priority: 'Low' });
                fetchComplaints();
            }
        } catch (err) {
            console.error("Failed to submit complaint", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            await fetch(`/api/complaints/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchComplaints();
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const handleLogout = () => {
        setUser(null);
        setComplaints([]);
    };

    if (!user) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo">
                        <h2>HostelOps</h2>
                        <p>Smart Complaint Management System</p>
                    </div>

                    {authError && <div className="error-message">{authError}</div>}
                    {authSuccess && <div className="success-message">{authSuccess}</div>}

                    {isLoginView ? (
                        <form className="auth-form" onSubmit={handleLogin}>
                            <div className="form-group">
                                <label>Username</label>
                                <input type="text" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input type="password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                            <button className="btn btn-primary" type="submit">Sign In</button>

                            <div className="auth-toggle">
                                Don't have an account?
                                <button type="button" onClick={() => { setIsLoginView(false); setAuthError(''); setAuthSuccess(''); }}>Create one</button>
                            </div>
                        </form>
                    ) : (
                        <form className="auth-form" onSubmit={handleRegister}>
                            <div className="form-group">
                                <label>Username</label>
                                <input type="text" placeholder="Choose a username" value={username} onChange={e => setUsername(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input type="password" placeholder="Choose a password" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select value={regRole} onChange={e => setRegRole(e.target.value)}>
                                    <option value="student">Student</option>
                                    <option value="admin">Administrator</option>
                                </select>
                            </div>
                            <button className="btn btn-primary" type="submit">Register Account</button>

                            <div className="auth-toggle">
                                Already have an account?
                                <button type="button" onClick={() => { setIsLoginView(true); setAuthError(''); }}>Sign In</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    const getPriorityClass = (priority) => {
        return `badge priority-${priority.toLowerCase()}`;
    };

    const getStatusClass = (status) => {
        const normalized = status.toLowerCase().replace(' ', '');
        return `status-badge status-${normalized}`;
    };

    return (
        <div className="app-container">
            <header className="navbar">
                <div className="navbar-brand">
                    <h1>HostelOps</h1>
                </div>
                <div className="navbar-user">
                    <span>{user.username}</span>
                    <span className="role-badge">{user.role}</span>
                    <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            <main className="main-content">
                <div className="dashboard-grid">

                    {/* Left Column - Forms/Filters */}
                    <div className="dashboard-sidebar">
                        {user.role === 'student' ? (
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">New Complaint</h2>
                                </div>
                                <form onSubmit={submitComplaint} className="auth-form">
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select value={newComplaint.category} onChange={e => setNewComplaint({ ...newComplaint, category: e.target.value })}>
                                            <option value="Electrical">Electrical</option>
                                            <option value="Plumbing">Plumbing</option>
                                            <option value="Carpentry">Carpentry</option>
                                            <option value="Internet">Internet/WiFi</option>
                                            <option value="Cleaning">Cleaning</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Priority</label>
                                        <select value={newComplaint.priority} onChange={e => setNewComplaint({ ...newComplaint, priority: e.target.value })}>
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea
                                            placeholder="Please describe the issue in detail..."
                                            rows="4"
                                            value={newComplaint.description}
                                            onChange={e => setNewComplaint({ ...newComplaint, description: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">Filter Complaints</h2>
                                </div>
                                <div className="auth-form">
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                            <option value="">All Categories</option>
                                            <option value="Electrical">Electrical</option>
                                            <option value="Plumbing">Plumbing</option>
                                            <option value="Carpentry">Carpentry</option>
                                            <option value="Internet">Internet/WiFi</option>
                                            <option value="Cleaning">Cleaning</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Status</label>
                                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                            <option value="">All Statuses</option>
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Resolved">Resolved</option>
                                        </select>
                                    </div>
                                    <button className="btn btn-outline" onClick={() => { setFilterCategory(''); setFilterStatus(''); }}>
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Complaint List */}
                    <div className="dashboard-content">
                        <div className="card">
                            <div className="card-header">
                                <h2 className="card-title">
                                    {user.role === 'admin' ? 'All Complaints' : 'My Complaints'}
                                </h2>
                            </div>

                            {complaints.length === 0 ? (
                                <div className="empty-state">
                                    <p>No complaints found.</p>
                                </div>
                            ) : (
                                <div className="complaint-list">
                                    {complaints.map(c => (
                                        <div key={c.id} className="complaint-item">
                                            <div className="complaint-header">
                                                <div className="complaint-meta">
                                                    <strong>{c.category}</strong>
                                                    <span className={getPriorityClass(c.priority)}>{c.priority}</span>
                                                </div>
                                                <span className={getStatusClass(c.status)}>{c.status}</span>
                                            </div>

                                            <div className="complaint-description">
                                                {c.description}
                                            </div>

                                            <div className="complaint-footer">
                                                <span>Submitted by: <strong>{c.student}</strong> on {new Date(c.createdAt).toLocaleDateString()}</span>

                                                {user.role === 'admin' && (
                                                    <div className="complaint-actions">
                                                        <label>Update Status:</label>
                                                        <select
                                                            value={c.status}
                                                            onChange={e => updateStatus(c.id, e.target.value)}
                                                            className="btn-sm"
                                                        >
                                                            <option value="Pending">Pending</option>
                                                            <option value="In Progress">In Progress</option>
                                                            <option value="Resolved">Resolved</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

export default App;