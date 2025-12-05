import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import DashboardLayout from './components/layouts/DashboardLayout';
import Academic from './pages/admin/Academic';
import UserManagement from './pages/admin/UserManagement';
import Students from './pages/admin/Students';
import Settings from './pages/Settings';
import Finance from './pages/admin/Finance';
import Attendance from './pages/admin/Attendance';
import BK from './pages/admin/BK';
import Elearning from './pages/admin/Elearning';
import Notifications from './pages/admin/Notifications';
import TeacherSchedule from './pages/teacher/TeacherSchedule';
import TeacherGrades from './pages/teacher/TeacherGrades';
import HomeroomStudents from './pages/teacher/HomeroomStudents';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import HomeroomClass from './pages/teacher/HomeroomClass';
import HomeroomReportCards from './pages/teacher/HomeroomReportCards';
import TeacherBKReport from './pages/teacher/TeacherBKReport';
import PublicLayout from './components/layouts/PublicLayout';
import Home from './pages/public/Home';
import Profile from './pages/public/Profile';
import PPDB from './pages/public/PPDB';
import PublicTeachers from './pages/public/PublicTeachers';
import PublicDownloads from './pages/public/PublicDownloads';
import PublicAlumni from './pages/public/PublicAlumni';
import PublicContact from './pages/public/PublicContact';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

import DashboardHome from './pages/DashboardHome';
import StudentBills from './pages/student/StudentBills';
import StudentBK from './pages/student/StudentBK';
import StudentSchedule from './pages/student/StudentSchedule';
import StudentElearning from './pages/student/StudentElearning';
import StudentGrades from './pages/student/StudentGrades';
import ParentChildren from './pages/parent/ParentChildren';
import ParentChildAttendance from './pages/parent/ParentChildAttendance';
import ParentChildGrades from './pages/parent/ParentChildGrades';
import ParentChildBills from './pages/parent/ParentChildBills';
import ParentChildBK from './pages/parent/ParentChildBK';
import AdminNotificationManagement from './pages/admin/AdminNotificationManagement';
import AdminContactMessages from './pages/admin/AdminContactMessages';
import AdminPPDB from './pages/admin/AdminPPDB';
import AdminAlumni from './pages/admin/AdminAlumni';
import AdminPublicContent from './pages/admin/AdminPublicContent';

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
                                    <Route path="admin/academic" element={<Academic />} />
                                    <Route path="users" element={<UserManagement />} />
                                    <Route path="settings" element={<Settings />} />

                                    {/* Consolidated Routes */}
                                    <Route path="students" element={<Students />} />
                                    <Route path="attendance" element={<Attendance />} />
                                    <Route path="finance" element={<Finance />} />
                                    <Route path="bk" element={<BK />} />
                                    <Route path="elearning" element={<Elearning />} />
                                    <Route path="notifications" element={<Notifications />} />
                                    <Route path="ppdb" element={<AdminPPDB />} />
                                    <Route path="public-content" element={<AdminPublicContent />} />
                                    <Route path="admin/notifications" element={<AdminNotificationManagement />} />
                                    <Route path="admin/contacts" element={<AdminContactMessages />} />
                                    <Route path="admin/finance" element={<Finance />} />
                                    <Route path="admin/elearning" element={<Elearning />} />
                                    <Route path="admin/ppdb" element={<AdminPPDB />} />
                                    <Route path="admin/alumni" element={<AdminAlumni />} />
                                    <Route path="admin/bk" element={<BK />} />

                                    {/* Teacher/Student Routes */}
                                    <Route path="teacher/schedule" element={<TeacherSchedule />} />
                                    <Route path="teacher/students" element={<HomeroomStudents />} />
                                    <Route path="teacher/grades" element={<TeacherGrades />} />
                                    <Route path="attendance/:scheduleId" element={<TeacherAttendance />} />
                                    <Route path="homeroom" element={<HomeroomClass />} />
                                    <Route path="homeroom/report-card/:studentId" element={<HomeroomReportCards />} />
                                    <Route path="student/schedule" element={<StudentSchedule />} />
                                    <Route path="student/elearning" element={<StudentElearning />} />
                                    <Route path="student/grades" element={<StudentGrades />} />
                                    <Route path="student/grades" element={<StudentGrades />} />
                                    <Route path="teacher/bk-report" element={<TeacherBKReport />} />
                                    <Route path="student/bk" element={<StudentBK />} />
                                    <Route path="bills" element={<StudentBills />} />
                                    <Route path="bills" element={<StudentBills />} />
                                    <Route path="children" element={<ParentChildren />} />
                                    <Route path="parent/children/:studentId/attendance" element={<ParentChildAttendance />} />
                                    <Route path="parent/children/:studentId/grades" element={<ParentChildGrades />} />
                                    <Route path="parent/children/:studentId/bills" element={<ParentChildBills />} />
                                    <Route path="parent/children/:studentId/bk" element={<ParentChildBK />} />
                                </Routes>
                            </DashboardLayout>
                        </PrivateRoute>
                    } />

                    {/* Public Routes */}
                    <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
                    <Route path="/profile" element={<PublicLayout><Profile /></PublicLayout>} />
                    <Route path="/ppdb" element={<PublicLayout><PPDB /></PublicLayout>} />
                    <Route path="/teachers" element={<PublicLayout><PublicTeachers /></PublicLayout>} />
                    <Route path="/downloads" element={<PublicLayout><PublicDownloads /></PublicLayout>} />
                    <Route path="/alumni" element={<PublicLayout><PublicAlumni /></PublicLayout>} />
                    <Route path="/contact" element={<PublicLayout><PublicContact /></PublicLayout>} />

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
