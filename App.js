import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    updateProfile
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    doc, 
    getDoc,
    Timestamp,
    setDoc,
    orderBy
} from 'firebase/firestore';

// --- Firebase Configuration ---
// This should be replaced with your actual Firebase project configuration.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// --- Initialize Firebase Services ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ==================================================================================
//  MAIN APP COMPONENT (The root of our application)
// ==================================================================================
export default function App() {
    const [user, setUser] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [page, setPage] = useState('login');

    // This effect runs once on mount to check the user's authentication state.
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setUser(currentUser);
                    setUserInfo(userDocSnap.data());
                } else {
                    console.error("Authentication successful, but user data not found in Firestore.");
                    await signOut(auth); // Log out to prevent an inconsistent state.
                }
            } else {
                setUser(null);
                setUserInfo(null);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe(); // Cleanup on unmount
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
        setPage('login');
    };

    // Display a full-screen loader until Firebase has confirmed the auth state.
    if (!isAuthReady) {
        return <FullScreenLoader />;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <Header user={user} userInfo={userInfo} onLogout={handleLogout} setPage={setPage} page={page} />
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {user && userInfo ? (
                    userInfo.role === 'TEACHER' ? <TeacherDashboard user={user} /> : <StudentDashboard user={user} />
                ) : (
                    page === 'login' ? <LoginScreen setPage={setPage} /> : <SignUpScreen setPage={setPage} />
                )}
            </main>
        </div>
    );
}


// ==================================================================================
//  UI & Common Components
// ==================================================================================

const Header = ({ user, userInfo, onLogout, setPage, page }) => (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-2">
                    <svg className="h-7 w-7 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                    <span className="font-bold text-2xl text-slate-800">Academa</span>
                </div>
                <div className="flex items-center space-x-4">
                    {user && userInfo ? (
                        <>
                            <span className="text-sm text-slate-600 hidden sm:block">
                                Welcome, <span className="font-medium text-slate-800">{userInfo.name}</span>
                                <span className="ml-2 inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">{userInfo.role}</span>
                            </span>
                            <button onClick={onLogout} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors">Logout</button>
                        </>
                    ) : (
                        <div className="space-x-2">
                            <button onClick={() => setPage('login')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${page === 'login' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}>Login</button>
                            <button onClick={() => setPage('signup')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${page === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Sign Up</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </header>
);

const FullScreenLoader = () => (
    <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center">
            <Spinner />
            <p className="text-slate-500 mt-4">Loading Application...</p>
        </div>
    </div>
);

const Spinner = () => (
    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const EmptyState = ({ icon, title, message }) => (
    <div className="text-center bg-white p-12 rounded-xl shadow-sm border border-slate-200">
        <div className="mx-auto h-12 w-12 text-slate-400">{icon}</div>
        <h3 className="mt-4 text-lg font-semibold text-slate-800">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{message}</p>
    </div>
);


// ==================================================================================
//  AUTHENTICATION SCREENS
// ==================================================================================

const AuthFormContainer = ({ title, children, footer }) => (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-md mt-10 border border-slate-200">
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-6">{title}</h2>
        {children}
        <p className="text-center mt-6 text-sm text-slate-500">{footer}</p>
    </div>
);

function LoginScreen({ setPage }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
        setIsSubmitting(false);
    };

    return (
        <AuthFormContainer 
            title="Welcome Back"
            footer={<>Don't have an account? <button onClick={() => setPage('signup')} className="text-blue-600 hover:underline font-semibold">Sign Up</button></>}
        >
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</p>}
            <form onSubmit={handleLogin} className="space-y-4">
                <InputField label="Email Address" id="email" type="email" value={email} onChange={setEmail} required />
                <InputField label="Password" id="password" type="password" value={password} onChange={setPassword} required />
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 disabled:bg-blue-300 flex items-center justify-center">
                    {isSubmitting && <Spinner />}
                    <span className={isSubmitting ? 'ml-2' : ''}>Login</span>
                </button>
            </form>
        </AuthFormContainer>
    );
}

function SignUpScreen({ setPage }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('STUDENT');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await updateProfile(user, { displayName: name });
            await setDoc(doc(db, "users", user.uid), { uid: user.uid, name, email, role });
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
        setIsSubmitting(false);
    };

    return (
        <AuthFormContainer
            title="Create Your Account"
            footer={<>Already have an account? <button onClick={() => setPage('login')} className="text-blue-600 hover:underline font-semibold">Login</button></>}
        >
            {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-sm">{error}</p>}
            <form onSubmit={handleSignUp} className="space-y-4">
                <InputField label="Full Name" id="name" type="text" value={name} onChange={setName} required />
                <InputField label="Email Address" id="email" type="email" value={email} onChange={setEmail} required />
                <InputField label="Password" id="password" type="password" value={password} onChange={setPassword} placeholder="6+ characters" required />
                <SelectField label="I am a..." value={role} onChange={setRole}>
                    <option value="STUDENT">Student</option>
                    <option value="TEACHER">Teacher</option>
                </SelectField>
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition duration-300 disabled:bg-blue-300 flex items-center justify-center">
                    {isSubmitting && <Spinner />}
                    <span className={isSubmitting ? 'ml-2' : ''}>Create Account</span>
                </button>
            </form>
        </AuthFormContainer>
    );
}

// Helper components for forms
const InputField = ({ label, id, ...props }) => (
    <div>
        <label className="block text-slate-700 text-sm font-semibold mb-2" htmlFor={id}>{label}</label>
        <input id={id} {...props} onChange={e => props.onChange(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
);

const SelectField = ({ label, value, onChange, children }) => (
    <div>
        <label className="block text-slate-700 text-sm font-semibold mb-2">{label}</label>
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {children}
        </select>
    </div>
);


// ==================================================================================
//  TEACHER DASHBOARD
// ==================================================================================

function TeacherDashboard({ user }) {
    const [view, setView] = useState('assignments'); // 'assignments', 'create', 'submissions'
    const [selectedAssignment, setSelectedAssignment] = useState(null);

    const navigateToSubmissions = (assignment) => {
        setSelectedAssignment(assignment);
        setView('submissions');
    };
    
    const navigateToAssignments = () => {
        setSelectedAssignment(null);
        setView('assignments');
    };

    return (
        <div>
            <DashboardHeader title="Teacher Dashboard">
                <TabButton text="My Assignments" isActive={view === 'assignments'} onClick={navigateToAssignments} />
                <TabButton text="Create Assignment" isActive={view === 'create'} onClick={() => setView('create')} />
            </DashboardHeader>
            
            <div className="mt-8">
                {view === 'assignments' && <TeacherAssignmentList onViewSubmissions={navigateToSubmissions} user={user} />}
                {view === 'create' && <CreateAssignmentForm onAssignmentCreated={navigateToAssignments} user={user} />}
                {view === 'submissions' && selectedAssignment && <SubmissionsView assignment={selectedAssignment} onBack={navigateToAssignments} />}
            </div>
        </div>
    );
}

function TeacherAssignmentList({ onViewSubmissions, user }) {
    const [assignments, setAssignments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAssignments = async () => {
            setIsLoading(true);
            const q = query(collection(db, "assignments"), where("teacherId", "==", user.uid), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            setAssignments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        };
        fetchAssignments();
    }, [user.uid]);

    if (isLoading) {
        return <SkeletonLoader type="list" count={3} />;
    }

    if (assignments.length === 0) {
        return <EmptyState 
            icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
            title="No Assignments Yet"
            message="Click 'Create Assignment' to get started and add a new task for your students."
        />
    }

    return (
        <div className="space-y-4">
            {assignments.map(assignment => (
                <div key={assignment.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center transition-all hover:shadow-md hover:border-blue-300">
                    <div>
                        <h4 className="font-bold text-lg text-slate-800">{assignment.title}</h4>
                        <p className="text-sm text-slate-500">Due: {new Date(assignment.dueDate.seconds * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    </div>
                    <button onClick={() => onViewSubmissions(assignment)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-colors">View Submissions</button>
                </div>
            ))}
        </div>
    );
}

function CreateAssignmentForm({ user, onAssignmentCreated }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "assignments"), {
                title, description,
                dueDate: Timestamp.fromDate(new Date(dueDate)),
                teacherId: user.uid,
                createdAt: Timestamp.now()
            });
            setMessage({ type: 'success', text: 'Assignment created successfully!' });
            setTimeout(() => onAssignmentCreated(), 1500);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error: ' + error.message });
        }
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-md max-w-2xl mx-auto border border-slate-200">
            <h3 className="text-2xl font-bold mb-6">Create New Assignment</h3>
            {message && <p className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message.text}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <InputField label="Title" id="title" type="text" value={title} onChange={setTitle} required />
                <div>
                    <label className="block text-slate-700 text-sm font-semibold mb-2" htmlFor="description">Description</label>
                    <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows="4" required></textarea>
                </div>
                <InputField label="Due Date & Time" id="dueDate" type="datetime-local" value={dueDate} onChange={setDueDate} required />
                <div className="pt-2">
                    <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-300 flex items-center">
                        {isSubmitting && <Spinner />}
                        <span className={isSubmitting ? 'ml-2' : ''}>Create Assignment</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

function SubmissionsView({ assignment, onBack }) {
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSubmissions = async () => {
            setIsLoading(true);
            const q = query(collection(db, "submissions"), where("assignmentId", "==", assignment.id), orderBy("submittedAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            const subsWithNames = await Promise.all(querySnapshot.docs.map(async (subDoc) => {
                const subData = subDoc.data();
                const userDocSnap = await getDoc(doc(db, "users", subData.studentId));
                return { id: subDoc.id, ...subData, studentName: userDocSnap.exists() ? userDocSnap.data().name : "Unknown Student" };
            }));

            setSubmissions(subsWithNames);
            setIsLoading(false);
        };
        fetchSubmissions();
    }, [assignment.id]);

    return (
        <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
            <button onClick={onBack} className="mb-6 text-blue-600 hover:underline text-sm font-semibold">{'<'} Back to Assignments</button>
            <h3 className="text-2xl font-bold mb-1">Submissions</h3>
            <p className="text-slate-500 mb-6">For assignment: <span className="font-semibold text-slate-700">"{assignment.title}"</span></p>
            
            {isLoading ? <SkeletonLoader type="list" count={2} /> : 
             submissions.length === 0 ? <p className="text-slate-500 text-center py-8">No submissions have been made for this assignment yet.</p> :
             <div className="space-y-5">
                 {submissions.map(sub => (
                     <div key={sub.id} className="p-5 border border-slate-200 rounded-lg bg-slate-50/50">
                         <div className="flex justify-between items-center">
                            <p className="font-bold text-slate-800">{sub.studentName}</p>
                            <p className="text-xs text-slate-500">Submitted: {new Date(sub.submittedAt.seconds * 1000).toLocaleString()}</p>
                         </div>
                         <p className="mt-4 whitespace-pre-wrap bg-white p-4 rounded-md border text-slate-700 text-sm">{sub.content}</p>
                     </div>
                 ))}
             </div>
            }
        </div>
    );
}


// ==================================================================================
//  STUDENT DASHBOARD
// ==================================================================================

function StudentDashboard({ user }) {
    const [view, setView] = useState('assignments'); // 'assignments', 'submit'
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [submissions, setSubmissions] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const assignmentsQuery = query(collection(db, "assignments"), orderBy("dueDate", "asc"));
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        setAssignments(assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        const submissionsQuery = query(collection(db, "submissions"), where("studentId", "==", user.uid));
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const subMap = submissionsSnapshot.docs.reduce((acc, doc) => ({...acc, [doc.data().assignmentId]: doc.id }), {});
        setSubmissions(subMap);
        setIsLoading(false);
    }, [user.uid]);

    useEffect(() => {
        if (view === 'assignments') {
            fetchData();
        }
    }, [view, fetchData]);

    const navigateToSubmit = (assignment) => {
        setSelectedAssignment(assignment);
        setView('submit');
    };

    if (view === 'submit' && selectedAssignment) {
        return <SubmitAssignmentForm user={user} assignment={selectedAssignment} onBack={() => setView('assignments')} />;
    }

    return (
        <div>
            <DashboardHeader title="Student Dashboard" />
            <div className="mt-8">
                {isLoading ? <SkeletonLoader type="list" count={4} /> :
                 assignments.length === 0 ? <EmptyState 
                    icon={<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-full h-full"><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" /></svg>}
                    title="No Assignments Available"
                    message="Your teachers haven't posted any assignments yet. Check back soon!"
                 /> :
                 <div className="space-y-4">
                     {assignments.map(assignment => {
                         const isSubmitted = !!submissions[assignment.id];
                         const isPastDue = new Date() > new Date(assignment.dueDate.seconds * 1000);
                         return (
                             <div key={assignment.id} className={`bg-white p-5 rounded-xl shadow-sm border flex justify-between items-start transition-all ${isSubmitted ? 'border-green-300 bg-green-50/50' : 'border-slate-200'}`}>
                                 <div className="flex-1 pr-4">
                                     <h4 className="font-bold text-lg text-slate-800">{assignment.title}</h4>
                                     <p className={`text-sm font-medium ${isPastDue && !isSubmitted ? 'text-red-600' : 'text-slate-500'}`}>
                                         Due: {new Date(assignment.dueDate.seconds * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                     </p>
                                     <p className="text-sm mt-2 text-slate-600">{assignment.description}</p>
                                 </div>
                                 <div className="w-28 text-right">
                                     {isSubmitted ? (
                                         <span className="inline-flex items-center gap-x-1.5 rounded-md bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700">
                                            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                                            Submitted
                                         </span>
                                     ) : (
                                         <button onClick={() => navigateToSubmit(assignment)} disabled={isPastDue} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed">
                                             {isPastDue ? 'Past Due' : 'Submit'}
                                         </button>
                                     )}
                                 </div>
                             </div>
                         )
                     })}
                 </div>
                }
            </div>
        </div>
    );
}

function SubmitAssignmentForm({ user, assignment, onBack }) {
    const [content, setContent] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "submissions"), {
                assignmentId: assignment.id, studentId: user.uid, content,
                submittedAt: Timestamp.now()
            });
            setMessage({ type: 'success', text: 'Assignment submitted successfully!' });
            setTimeout(() => onBack(), 1500);
        } catch (err) {
            setMessage({ type: 'error', text: 'Error: ' + err.message });
        }
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-md max-w-2xl mx-auto border border-slate-200">
            <button onClick={onBack} className="mb-6 text-blue-600 hover:underline text-sm font-semibold">{'<'} Back to Assignments</button>
            <h3 className="text-2xl font-bold mb-1">Submit Assignment</h3>
            <p className="text-slate-500 mb-4">For: <span className="font-semibold text-slate-700">"{assignment.title}"</span></p>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600 mb-6">{assignment.description}</div>
            
            {message && <p className={`p-3 rounded-lg mb-4 text-sm ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{message.text}</p>}
            
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-slate-700 text-sm font-semibold mb-2" htmlFor="submissionContent">Your Submission</label>
                    <textarea id="submissionContent" value={content} onChange={e => setContent(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows="8" required></textarea>
                </div>
                <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-300 flex items-center">
                    {isSubmitting && <Spinner />}
                    <span className={isSubmitting ? 'ml-2' : ''}>Submit Assignment</span>
                </button>
            </form>
        </div>
    );
}

// --- Helper Components for Dashboards ---
const DashboardHeader = ({ title, children }) => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold text-slate-800">{title}</h2>
        {children && <div className="flex space-x-2 mt-4 sm:mt-0">{children}</div>}
    </div>
);

const TabButton = ({ text, isActive, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${isActive ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}>
        {text}
    </button>
);

const SkeletonLoader = ({ type = 'list', count = 1 }) => {
    const skeletonCard = (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="animate-pulse flgiex space-x-4">
                <div className="flex-1 space-y-3 py-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
                <div className="h-10 w-28 bg-slate-200 rounded-lg"></div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {Array.from({ length: count }, (_, i) => <div key={i}>{skeletonCard}</div>)}
        </div>
    );
};
