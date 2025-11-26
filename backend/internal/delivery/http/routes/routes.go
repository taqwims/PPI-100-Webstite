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

	// Usecases
	authUsecase := usecase.NewAuthUsecase(userRepo, cfg)

	// Handlers
	authHandler := handlers.NewAuthHandler(authUsecase)
	academicRepo := postgres.NewAcademicRepository(db)
	academicUsecase := usecase.NewAcademicUsecase(academicRepo)
	academicHandler := handlers.NewAcademicHandler(academicUsecase)

	teacherRepo := postgres.NewTeacherRepository(db)
	teacherUsecase := usecase.NewTeacherUsecase(teacherRepo)
	teacherHandler := handlers.NewTeacherHandler(teacherUsecase)

	studentRepo := postgres.NewStudentRepository(db)
	attendanceRepo := postgres.NewAttendanceRepository(db)
	studentUsecase := usecase.NewStudentUsecase(studentRepo, attendanceRepo)
	studentHandler := handlers.NewStudentHandler(studentUsecase)

	publicRepo := postgres.NewPublicRepository(db)
	publicUsecase := usecase.NewPublicUsecase(publicRepo)
	publicHandler := handlers.NewPublicHandler(publicUsecase)

	financeRepo := postgres.NewFinanceRepository(db)
	financeUsecase := usecase.NewFinanceUsecase(financeRepo)
	financeHandler := handlers.NewFinanceHandler(financeUsecase)

	// Reuse existing userRepo
	userUsecase := usecase.NewUserUsecase(userRepo)
	userHandler := handlers.NewUserHandler(userUsecase)

	bkRepo := postgres.NewBKRepository(db)
	bkUsecase := usecase.NewBKUsecase(bkRepo)
	bkHandler := handlers.NewBKHandler(bkUsecase)

	elearningRepo := postgres.NewElearningRepository(db)
	elearningUsecase := usecase.NewElearningUsecase(elearningRepo)
	elearningHandler := handlers.NewElearningHandler(elearningUsecase)

	notificationRepo := postgres.NewNotificationRepository(db)
	notificationUsecase := usecase.NewNotificationUsecase(notificationRepo)
	notificationHandler := handlers.NewNotificationHandler(notificationUsecase)

	// Public Routes
	api := r.Group("/api")
	{
		public := api.Group("/public")
		{
			public.GET("/teachers", publicHandler.GetTeachers)
			public.GET("/downloads", publicHandler.GetDownloads)
			public.GET("/alumni", publicHandler.GetAlumni)
			public.POST("/ppdb", publicHandler.RegisterPPDB)
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
		// Add protected routes here
		protected.GET("/profile", authHandler.GetProfile)

		academic := protected.Group("/academic")
		{
			academic.POST("/classes", academicHandler.CreateClass)
			academic.GET("/classes", academicHandler.GetAllClasses)
			academic.POST("/subjects", academicHandler.CreateSubject)
			academic.GET("/subjects", academicHandler.GetAllSubjects)
			academic.POST("/schedules", academicHandler.CreateSchedule)
			academic.GET("/schedules", academicHandler.GetAllSchedules)
		}

		teachers := protected.Group("/teachers")
		{
			teachers.GET("/", teacherHandler.GetAllTeachers)
		}

		students := protected.Group("/students")
		{
			students.GET("/", studentHandler.GetAllStudents)
			students.POST("/attendance", studentHandler.RecordAttendance)
			students.GET("/attendance/:schedule_id", studentHandler.GetScheduleAttendance)
		}

		finance := protected.Group("/finance")
		{
			finance.POST("/bills", financeHandler.CreateBill)
			finance.GET("/bills", financeHandler.GetAllBills)
			finance.POST("/payments", financeHandler.RecordPayment)
		}

		users := protected.Group("/users")
		{
			users.GET("/", userHandler.GetAllUsers)
			users.POST("/", userHandler.CreateUser)
			users.DELETE("/:id", userHandler.DeleteUser)
		}

		bk := protected.Group("/bk")
		{
			bk.POST("/violations", bkHandler.CreateViolation)
			bk.GET("/violations", bkHandler.GetAllViolations)
			bk.POST("/calls", bkHandler.CreateBKCall)
			bk.GET("/calls", bkHandler.GetAllBKCalls)
		}

		elearning := protected.Group("/elearning")
		{
			elearning.POST("/materials", elearningHandler.CreateMaterial)
			elearning.GET("/materials", elearningHandler.GetMaterials)
			elearning.POST("/tasks", elearningHandler.CreateTask)
			elearning.GET("/tasks", elearningHandler.GetTasks)
			elearning.GET("/tasks/:id/submissions", elearningHandler.GetSubmissions)
			elearning.PUT("/submissions/:id/grade", elearningHandler.GradeSubmission)
		}

		notifications := protected.Group("/notifications")
		{
			notifications.GET("/", notificationHandler.GetNotifications)
			notifications.PUT("/:id/read", notificationHandler.MarkAsRead)
			notifications.POST("/", notificationHandler.SendNotification)
		}
	}
}
