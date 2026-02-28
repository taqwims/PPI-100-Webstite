package routes

import (
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/delivery/http/handlers"
	"ppi-100-sis/internal/delivery/http/middleware"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/usecase"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	// Repositories
	userRepo := postgres.NewUserRepository(db)
	academicRepo := postgres.NewAcademicRepository(db)
	elearningRepo := postgres.NewElearningRepository(db)

	// Usecases
	authUsecase := usecase.NewAuthUsecase(userRepo, cfg)
	academicUsecase := usecase.NewAcademicUsecase(academicRepo, elearningRepo, userRepo)

	// Handlers
	authHandler := handlers.NewAuthHandler(authUsecase)
	academicHandler := handlers.NewAcademicHandler(academicUsecase)

	teacherRepo := postgres.NewTeacherRepository(db)
	teacherUsecase := usecase.NewTeacherUsecase(teacherRepo)
	teacherHandler := handlers.NewTeacherHandler(teacherUsecase)

	studentRepo := postgres.NewStudentRepository(db)
	attendanceRepo := postgres.NewAttendanceRepository(db)
	studentUsecase := usecase.NewStudentUsecase(studentRepo, attendanceRepo, userRepo)
	studentHandler := handlers.NewStudentHandler(studentUsecase, userRepo)

	publicRepo := postgres.NewPublicRepository(db)
	publicUsecase := usecase.NewPublicUsecase(publicRepo)
	publicHandler := handlers.NewPublicHandler(publicUsecase)

	notificationRepo := postgres.NewNotificationRepository(db)
	notificationUsecase := usecase.NewNotificationUsecase(notificationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationUsecase)

	// Reuse existing userRepo
	userUsecase := usecase.NewUserUsecase(userRepo)
	userHandler := handlers.NewUserHandler(userUsecase)

	bkRepo := postgres.NewBKRepository(db)
	bkUsecase := usecase.NewBKUsecase(bkRepo)
	bkHandler := handlers.NewBKHandler(bkUsecase)

	// elearningRepo already declared above
	elearningUsecase := usecase.NewElearningUsecase(elearningRepo, notificationUsecase, userRepo)
	elearningHandler := handlers.NewElearningHandler(elearningUsecase)

	financeRepo := postgres.NewFinanceRepository(db)
	financeUsecase := usecase.NewFinanceUsecase(financeRepo, notificationUsecase, userRepo, studentRepo)
	financeHandler := handlers.NewFinanceHandler(financeUsecase)

	financeExtendedRepo := postgres.NewFinanceExtendedRepository(db)
	financeExtendedUsecase := usecase.NewFinanceExtendedUsecase(financeExtendedRepo)
	financeExtendedHandler := handlers.NewFinanceExtendedHandler(financeExtendedUsecase)

	// Profile Handler
	profileHandler := handlers.NewProfileHandler(userUsecase)

	// Public Routes
	api := r.Group("/api")
	{
		public := api.Group("/public")
		{
			public.GET("/teachers", publicHandler.GetTeachers)
			public.GET("/downloads", publicHandler.GetDownloads)
			public.GET("/alumni", publicHandler.GetAlumni)
			public.POST("/ppdb", publicHandler.RegisterPPDB)
			public.POST("/contact", publicHandler.SubmitContact)
		}

		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}
	}

	// Protected Routes
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware(cfg))
	{
		// Profile routes
		protected.GET("/profile", profileHandler.GetProfile)
		protected.PUT("/profile", profileHandler.UpdateProfile)
		protected.POST("/profile/photo", profileHandler.UploadPhoto)
		protected.PUT("/profile/password", profileHandler.ChangePassword)

		academic := protected.Group("/academic")
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

		teachers := protected.Group("/teachers")
		{
			teachers.GET("/", teacherHandler.GetAllTeachers)
		}

		students := protected.Group("/students")
		{
			students.GET("/", studentHandler.GetAllStudents)
			students.POST("/", studentHandler.CreateStudent)
			students.PUT("/:id", studentHandler.UpdateStudent)
			students.DELETE("/:id", studentHandler.DeleteStudent)
			students.GET("/children", studentHandler.GetChildren)
			students.POST("/attendance", studentHandler.RecordAttendance)
			students.GET("/attendance/:schedule_id", studentHandler.GetScheduleAttendance)
			students.GET("/attendance", studentHandler.GetStudentAttendance)
		}

		finance := protected.Group("/finance")
		{
			finance.POST("/bills", financeHandler.CreateBill)
			finance.GET("/bills", financeHandler.GetAllBills)
			finance.PUT("/bills/:id", financeHandler.UpdateBill)
			finance.DELETE("/bills/:id", financeHandler.DeleteBill)
			finance.POST("/payments", financeHandler.RecordPayment)
			finance.PUT("/payments/:id", financeHandler.UpdatePayment)
			finance.DELETE("/payments/:id", financeHandler.DeletePayment)

			// Extended Financial Features
			finance.POST("/academic-years", middleware.RoleMiddleware(1, 2, 3, 9), financeExtendedHandler.CreateAcademicYear)
			finance.GET("/academic-years", financeExtendedHandler.GetAllAcademicYears)

			finance.GET("/savings", middleware.RoleMiddleware(1, 9, 10), financeExtendedHandler.GetAllSavingAccounts)
			finance.POST("/savings/transactions", middleware.RoleMiddleware(1, 9, 10), financeExtendedHandler.ProcessSavingTransaction)
			finance.GET("/savings/transactions/:account_id", middleware.RoleMiddleware(1, 9, 10), financeExtendedHandler.GetSavingTransactions)
			finance.GET("/savings/:student_id", middleware.RoleMiddleware(1, 6, 7, 9, 10), financeExtendedHandler.GetStudentSavings)

			finance.POST("/payroll", middleware.RoleMiddleware(1, 9), financeExtendedHandler.CreatePayroll)
			finance.GET("/payroll", middleware.RoleMiddleware(1, 4, 9), financeExtendedHandler.GetPayrolls) // Gurus can fetch their own, need usecase to filter later
			finance.PUT("/payroll/:id", middleware.RoleMiddleware(1, 9), financeExtendedHandler.UpdatePayroll)
			finance.DELETE("/payroll/:id", middleware.RoleMiddleware(1, 9), financeExtendedHandler.DeletePayroll)

			finance.POST("/cash-ledger", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.AddCashLedgerEntry)
			finance.GET("/cash-ledger", middleware.RoleMiddleware(1, 8, 9, 11), financeExtendedHandler.GetCashLedger)
			finance.PUT("/cash-ledger/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.UpdateCashLedgerEntry)
			finance.DELETE("/cash-ledger/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.DeleteCashLedgerEntry)

			finance.POST("/daily-infaq", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.AddDailyInfaqEntry)
			finance.GET("/daily-infaq", middleware.RoleMiddleware(1, 8, 9, 11), financeExtendedHandler.GetDailyInfaq)
			finance.PUT("/daily-infaq/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.UpdateDailyInfaqEntry)
			finance.DELETE("/daily-infaq/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.DeleteDailyInfaqEntry)

			finance.GET("/dashboard", middleware.RoleMiddleware(1, 8, 9), financeExtendedHandler.GetDashboardAnalytics)
		}

		users := protected.Group("/users")
		{
			users.GET("/", userHandler.GetAllUsers)
			users.POST("/", userHandler.CreateUser)
			users.PUT("/:id", userHandler.UpdateUser)
			users.DELETE("/:id", userHandler.DeleteUser)
		}

		bk := protected.Group("/bk")
		{
			bk.POST("/violations", bkHandler.CreateViolation)
			bk.GET("/violations", bkHandler.GetAllViolations)
			bk.PUT("/violations/:id", bkHandler.UpdateViolation)
			bk.DELETE("/violations/:id", bkHandler.DeleteViolation)
			bk.POST("/calls", bkHandler.CreateBKCall)
			bk.GET("/calls", bkHandler.GetAllBKCalls)
			bk.PUT("/calls/:id", bkHandler.UpdateBKCall)
			bk.DELETE("/calls/:id", bkHandler.DeleteBKCall)
		}

		elearning := protected.Group("/elearning")
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

		notifications := protected.Group("/notifications")
		{
			notifications.GET("/", notificationHandler.GetNotifications)
			notifications.GET("/all", notificationHandler.GetAllNotifications)
			notifications.PUT("/:id/read", notificationHandler.MarkAsRead)
			notifications.POST("/", notificationHandler.SendNotification)
			notifications.DELETE("/:id", notificationHandler.DeleteNotification)
		}

		// PPDB Management (Admin)
		ppdb := protected.Group("/ppdb")
		{
			ppdb.GET("/", publicHandler.GetPPDBRegistrations)
			ppdb.PUT("/:id/status", publicHandler.UpdatePPDBStatus)
			ppdb.DELETE("/:id", publicHandler.DeletePPDBRegistration)
		}

		// Public Content Management (Admin)
		publicContent := protected.Group("/public-content")
		{
			publicContent.POST("/teachers", publicHandler.CreatePublicTeacher)
			publicContent.PUT("/teachers/:id", publicHandler.UpdatePublicTeacher)
			publicContent.DELETE("/teachers/:id", publicHandler.DeletePublicTeacher)
			publicContent.POST("/downloads", publicHandler.CreateDownload)
			publicContent.PUT("/downloads/:id", publicHandler.UpdateDownload)
			publicContent.DELETE("/downloads/:id", publicHandler.DeleteDownload)
			publicContent.POST("/alumni", publicHandler.CreateAlumni)
			publicContent.PUT("/alumni/:id", publicHandler.UpdateAlumni)
			publicContent.DELETE("/alumni/:id", publicHandler.DeleteAlumni)
		}

		// Contact Messages (Admin)
		admin := protected.Group("/admin")
		{
			admin.GET("/contacts", publicHandler.GetContactMessages)
			admin.DELETE("/contacts/:id", publicHandler.DeleteContactMessage)
		}
	}
}
