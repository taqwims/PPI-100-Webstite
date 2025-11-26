import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/layouts/DashboardLayout';
import Academic from './pages/admin/Academic';
import UsersPage from './pages/admin/Users';
import AcademicPage from './pages/admin/Academic';
import Settings from './pages/Settings';
import Finance from './pages/admin/Finance';
import Attendance from './pages/admin/Attendance';
import BK from './pages/admin/BK';
import Elearning from './pages/admin/Elearning';
import Notifications from './pages/admin/Notifications';
import TeacherSchedule from './pages/teacher/TeacherSchedule';
import TeacherGrades from './pages/teacher/TeacherGrades';
import PlaceholderPage from './pages/PlaceholderPage';
import PublicLayout from './components/layouts/PublicLayout';
import Home from './pages/public/Home';
import Profile from './pages/public/Profile';
import PPDB from './pages/public/PPDB';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const DashboardHome = () => <PlaceholderPage title="Dashboard Overview" />;

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/dashboard/*" element={
                        <PrivateRoute>
                            <DashboardLayout>
                                <Routes>
                                    <Route path="/" element={<DashboardHome />} />
                                    <Route path="academic" element={<Academic />} />
                                    <Route path="users" element={<UsersPage />} />
                                    <Route path="settings" element={<Settings />} />

                                    {/* Placeholders for now */}
                                    <Route path="students" element={<PlaceholderPage title="Manajemen Siswa" />} />
                                    <Route path="attendance" element={<Attendance />} />
                                    <Route path="finance" element={<Finance />} />
                                    <Route path="bk" element={<BK />} />
                                    <Route path="elearning" element={<Elearning />} />
                                    <Route path="notifications" element={<Notifications />} />

                                    {/* Teacher/Student Routes */}
                                    <Route path="schedule" element={<TeacherSchedule />} />
                                    <Route path="grades" element={<TeacherGrades />} />
                                    <Route path="bk-report" element={<PlaceholderPage title="Lapor BK" />} />
                                    <Route path="bills" element={<PlaceholderPage title="Tagihan" />} />
                                    <Route path="children" element={<PlaceholderPage title="Data Anak" />} />
                                </Routes>
                            </DashboardLayout>
                        </PrivateRoute>
                    } />

                    {/* Public Routes */}
                    <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
                    <Route path="/profile" element={<PublicLayout><Profile /></PublicLayout>} />
                    <Route path="/ppdb" element={<PublicLayout><PPDB /></PublicLayout>} />

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
