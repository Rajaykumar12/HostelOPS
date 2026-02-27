import React, { useState, useEffect, useCallback } from 'react';
import { AuthenticationDetails, CognitoUser, CognitoUserPool, CognitoUserAttribute } from 'amazon-cognito-identity-js';

// --- AWS Cognito Configuration ---
const poolData = {
    UserPoolId: 'ap-south-1_npiLuJpaD',
    ClientId: '3sjhdm7d8ss5knknlbdeuu1f10'
};
const userPool = new CognitoUserPool(poolData);

function App() {
    // Auth State
    const [user, setUser] = useState(null);
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [authError, setAuthError] = useState('');
    const [authSuccess, setAuthSuccess] = useState('');
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    // Filter & UI State
    const [complaints, setComplaints] = useState([]);
    const [newComplaint, setNewComplaint] = useState({ category: 'Electrical', description: '', priority: 'Low' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    // --- Restore Session on Load ---
    useEffect(() => {
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser != null) {
            cognitoUser.getSession((err, session) => {
                if (err) {
                    setIsLoadingAuth(false);
                    return;
                }
                const idToken = session.getIdToken().getJwtToken();
                const payload = session.getIdToken().decodePayload();

                setUser({
                    username: payload['cognito:username'] || payload.email,
                    role: payload['custom:role'] || 'student',
                    id_token: idToken,
                    cognitoUser: cognitoUser
                });
                setIsLoadingAuth(false);
            });
        } else {
            setIsLoadingAuth(false);
        }
    }, []);

    const fetchComplaints = useCallback(async (currentUser = user) => {
        if (!currentUser || !currentUser.id_token) return;

        let url = `/api/complaints?role=${currentUser.role}&username=${currentUser.username}`;
        if (currentUser.role === 'admin') {
            if (filterCategory) url += `&category=${filterCategory}`;
            if (filterStatus) url += `&status=${filterStatus}`;
        }

        try {
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${currentUser.id_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setComplaints(data);
            } else if (res.status === 401) {
                console.error("Session expired");
                handleLogout();
            }
        } catch (err) {
            console.error("Failed to fetch complaints", err);
        }
    }, [user, filterCategory, filterStatus]);

    useEffect(() => {
        if (user && user.id_token) {
            fetchComplaints(user);
        }
    }, [user, filterCategory, filterStatus, fetchComplaints]);

    // --- Authentication Actions ---
    const handleLogin = (e) => {
        e.preventDefault();
        setAuthError('');

        const authenticationDetails = new AuthenticationDetails({ Username: email, Password: password });
        const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (result) => {
                const idToken = result.getIdToken().getJwtToken();
                const payload = result.getIdToken().decodePayload();

                setUser({
                    username: payload['cognito:username'] || payload.email,
                    role: payload['custom:role'] || 'student',
                    id_token: idToken,
                    cognitoUser: cognitoUser
                });
                setEmail('');
                setPassword('');
            },
            onFailure: (err) => {
                setAuthError(err.message || 'Login failed');
            },
            newPasswordRequired: (userAttributes, requiredAttributes) => {
                // Administrator-created accounts require a password change on first login.
                // We're forcing it to their freshly entered password to minimize friction.
                delete userAttributes.email_verified;
                delete userAttributes.phone_number_verified;
                delete userAttributes.email;
                cognitoUser.completeNewPasswordChallenge(password, userAttributes, {
                    onSuccess: (result) => {
                        const idToken = result.getIdToken().getJwtToken();
                        const payload = result.getIdToken().decodePayload();

                        setUser({
                            username: payload['cognito:username'] || payload.email,
                            role: payload['custom:role'] || 'student',
                            id_token: idToken,
                            cognitoUser: cognitoUser
                        });
                        setEmail('');
                        setPassword('');
                    },
                    onFailure: (err) => {
                        setAuthError(err.message || 'First-time password configuration failed');
                    }
                });
            }
        });
    };

    const handleRegister = (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthSuccess('');

        const attributeList = [
            new CognitoUserAttribute({ Name: 'name', Value: name }),
            new CognitoUserAttribute({ Name: 'email', Value: email }),
            new CognitoUserAttribute({ Name: 'custom:role', Value: 'student' })
        ];

        userPool.signUp(email, password, attributeList, null, (err, result) => {
            if (err) {
                setAuthError(err.message || 'Registration failed');
                return;
            }
            setAuthSuccess('Registration successful! Please check your email for the verification code.');
            setIsVerifying(true);
        });
    };

    const handleVerify = (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthSuccess('');

        const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });

        cognitoUser.confirmRegistration(verificationCode, true, (err, result) => {
            if (err) {
                setAuthError(err.message || 'Verification failed');
                return;
            }
            setAuthSuccess('Verification successful! You can now sign in.');
            setIsVerifying(false);
            setIsLoginView(true);
            setVerificationCode('');
            setPassword('');
        });
    };

    const handleLogout = () => {
        if (user && user.cognitoUser) {
            user.cognitoUser.signOut();
        }
        setUser(null);
        setComplaints([]);
    };

    // --- Data Actions ---
    const submitComplaint = async (e) => {
        e.preventDefault();
        if (!user || !user.id_token) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/complaints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.id_token}`
                },
                body: JSON.stringify({ ...newComplaint, student: user.username })
            });

            if (res.ok) {
                setNewComplaint({ category: 'Electrical', description: '', priority: 'Low' });
                fetchComplaints();
            } else {
                console.error("Failed", await res.text());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        if (!user || !user.id_token) return;
        try {
            const res = await fetch(`/api/complaints/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.id_token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) fetchComplaints();
        } catch (err) {
            console.error(err);
        }
    };

    const getPriorityClass = (priority) => `badge priority-${priority.toLowerCase()}`;
    const getStatusClass = (status) => `status-badge status-${status.toLowerCase().replace(' ', '')}`;

    if (isLoadingAuth) {
        return <div className="auth-container">Loading Configuration...</div>;
    }

    if (!user) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo">
                        <h2>HostelOps</h2>
                        <p>Cloud Managed Identity</p>
                    </div>

                    {authError && <div className="error-message">{authError}</div>}
                    {authSuccess && <div className="success-message">{authSuccess}</div>}

                    {isVerifying ? (
                        <form className="auth-form" onSubmit={handleVerify}>
                            <div className="form-group">
                                <label>Verification Code</label>
                                <input type="text" placeholder="Enter code from email" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required />
                            </div>
                            <button className="btn btn-primary" type="submit">Verify Account</button>
                            <div className="auth-toggle">
                                <button type="button" onClick={() => { setIsVerifying(false); setIsLoginView(true); setAuthError(''); setAuthSuccess(''); setEmail(''); setPassword(''); setName(''); }}>Back to Sign In</button>
                            </div>
                        </form>
                    ) : isLoginView ? (
                        <form className="auth-form" onSubmit={handleLogin}>
                            <div className="form-group">
                                <label>Email / Username</label>
                                <input type="text" placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} required />
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
                                <label>Name</label>
                                <input type="text" placeholder="Enter your full name" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Email Address</label>
                                <input type="email" placeholder="Enter your valid email" value={email} onChange={e => setEmail(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Password</label>
                                <input type="password" placeholder="Choose a password" value={password} onChange={e => setPassword(e.target.value)} required />
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

    return (
        <div className="app-container">
            <header className="navbar">
                <div className="navbar-brand"><h1>HostelOps</h1></div>
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