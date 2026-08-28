package routes

import (
	"ppi-100-sis/internal/delivery/http/handlers"

	"github.com/gin-gonic/gin"
)

func RegisterAcademicRoutes(
	rg *gin.RouterGroup,
	academicHandler *handlers.AcademicHandler,
	teacherHandler *handlers.TeacherHandler,
	studentHandler *handlers.StudentHandler,
	bkHandler *handlers.BKHandler,
	elearningHandler *handlers.ElearningHandler,
	featureBK bool,
	featureElearning bool,
) {
	academic := rg.Group("/academic")
	{
		academic.POST("/classes", academicHandler.CreateClass)
		academic.GET("/classes", academicHandler.GetAllClasses)
		academic.PUT("/classes/:id", academicHandler.UpdateClass)
		academic.DELETE("/classes/:id", academicHandler.DeleteClass)
		academic.GET("/classes/homeroom", academicHandler.GetHomeroomClass)
		academic.GET("/report-cards/:student_id", academicHandler.GetStudentReportCard)
		academic.POST("/subjects", academicHandler.CreateSubject)
		academic.GET("/subjects", academicHandler.GetAllSubjects)
		academic.PUT("/subjects/:id", academicHandler.UpdateSubject)
		academic.DELETE("/subjects/:id", academicHandler.DeleteSubject)
		academic.POST("/schedules", academicHandler.CreateSchedule)
		academic.GET("/schedules", academicHandler.GetAllSchedules)
		academic.PUT("/schedules/:id", academicHandler.UpdateSchedule)
		academic.DELETE("/schedules/:id", academicHandler.DeleteSchedule)
	}

	teachers := rg.Group("/teachers")
	{
		teachers.GET("/", teacherHandler.GetAllTeachers)
	}

	students := rg.Group("/students")
	{
		students.GET("/", studentHandler.GetAllStudents)
		students.POST("/", studentHandler.CreateStudent)
		students.PUT("/:id", studentHandler.UpdateStudent)
		students.DELETE("/:id", studentHandler.DeleteStudent)
		students.POST("/:id/rfid", studentHandler.AssignRFID)
		students.POST("/bulk-promote", studentHandler.HandleBulkPromote)
		students.GET("/children", studentHandler.GetChildren)
		students.POST("/attendance", studentHandler.RecordAttendance)
		students.POST("/attendance/rfid-tap", studentHandler.RecordRFIDAttendance)
		students.GET("/attendance/daily", studentHandler.GetDailyAttendance)
		students.GET("/attendance/live-recent", studentHandler.GetRecentDailyAttendance)
		students.GET("/attendance/today-summary", studentHandler.GetTodaySummary)
		students.GET("/attendance/:schedule_id", studentHandler.GetScheduleAttendance)
		students.GET("/attendance", studentHandler.GetStudentAttendance)
	}

	// ── BK (Bimbingan Konseling) ──
	if featureBK {
		bk := rg.Group("/bk")
		{
			bk.POST("/violations", bkHandler.CreateViolation)
			bk.GET("/violations", bkHandler.GetAllViolations)
			bk.PUT("/violations/:id", bkHandler.UpdateViolation)
			bk.DELETE("/violations/:id", bkHandler.DeleteViolation)
			bk.POST("/student-violations", bkHandler.RecordStudentViolation)
			bk.POST("/calls", bkHandler.CreateBKCall)
			bk.GET("/calls", bkHandler.GetAllBKCalls)
			bk.PUT("/calls/:id", bkHandler.UpdateBKCall)
			bk.DELETE("/calls/:id", bkHandler.DeleteBKCall)
		}
	}

	// ── E-Learning ──
	if featureElearning {
		elearning := rg.Group("/elearning")
		{
			elearning.POST("/materials", elearningHandler.CreateMaterial)
			elearning.GET("/materials", elearningHandler.GetMaterials)
			elearning.PUT("/materials/:id", elearningHandler.UpdateMaterial)
			elearning.DELETE("/materials/:id", elearningHandler.DeleteMaterial)
			elearning.POST("/tasks", elearningHandler.CreateTask)
			elearning.GET("/tasks", elearningHandler.GetTasks)
			elearning.PUT("/tasks/:id", elearningHandler.UpdateTask)
			elearning.DELETE("/tasks/:id", elearningHandler.DeleteTask)
			elearning.GET("/tasks/:id/submissions", elearningHandler.GetSubmissions)
			elearning.PUT("/submissions/:id/grade", elearningHandler.GradeSubmission)
			elearning.DELETE("/submissions/:id", elearningHandler.DeleteSubmission)
			elearning.POST("/submissions", elearningHandler.SubmitTask)
			elearning.GET("/submissions", elearningHandler.GetStudentSubmissions)
		}
	}
}
