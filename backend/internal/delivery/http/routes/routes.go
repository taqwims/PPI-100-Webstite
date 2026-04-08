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

	// Payment Types (Jenis Pembayaran)
	paymentTypeRepo := postgres.NewPaymentTypeRepository(db)
	paymentTypeUsecase := usecase.NewPaymentTypeUsecase(paymentTypeRepo)
	paymentTypeHandler := handlers.NewPaymentTypeHandler(paymentTypeUsecase)

	// Activities (Fase 3) - Need this early for FinanceUsecase
	activityRepo := postgres.NewActivityRepository(db)

	// Student Obligations (Tanggungan Siswa) - Need this early for FinanceUsecase
	studentObligationRepo := postgres.NewStudentObligationRepository(db)

	financeRepo := postgres.NewFinanceRepository(db)
	budgetRepo := postgres.NewBudgetRepository(db)
	
	financeUsecase := usecase.NewFinanceUsecase(financeRepo, notificationUsecase, userRepo, studentRepo, budgetRepo, studentObligationRepo, activityRepo)
	financeHandler := handlers.NewFinanceHandler(financeUsecase)

	payrollRepo := postgres.NewPayrollRepository(db)
	payrollUsecase := usecase.NewPayrollUsecase(payrollRepo, userRepo, financeRepo)
	payrollHandler := handlers.NewPayrollHandler(payrollUsecase)

	// Midtrans Payment Gateway
	midtransUsecase := usecase.NewMidtransUsecase(cfg, financeRepo, studentRepo, userRepo, notificationUsecase, financeUsecase, studentObligationRepo, activityRepo)
	midtransHandler := handlers.NewMidtransHandler(midtransUsecase)

	financeExtendedRepo := postgres.NewFinanceExtendedRepository(db)
	financeExtendedUsecase := usecase.NewFinanceExtendedUsecase(financeExtendedRepo, budgetRepo)
	financeExtendedHandler := handlers.NewFinanceExtendedHandler(financeExtendedUsecase)

	// Transaction Code
	transactionCodeRepo := postgres.NewTransactionCodeRepository(db)
	transactionCodeUsecase := usecase.NewTransactionCodeUsecase(transactionCodeRepo)
	transactionCodeHandler := handlers.NewTransactionCodeHandler(transactionCodeUsecase)

	// Budget / RKAS
	budgetUsecase := usecase.NewBudgetUsecase(budgetRepo, notificationUsecase, userRepo, transactionCodeRepo)
	budgetHandler := handlers.NewBudgetHandler(budgetUsecase)

	// Student Obligations (Tanggungan Siswa) - Continued
	studentObligationUsecase := usecase.NewStudentObligationUsecase(studentObligationRepo, paymentTypeRepo, financeUsecase, financeRepo)
	studentObligationHandler := handlers.NewStudentObligationHandler(studentObligationUsecase)

	// Profile Handler
	profileHandler := handlers.NewProfileHandler(userUsecase)

	// Activities (Fase 3) - Continued
	activityUsecase := usecase.NewActivityUsecase(activityRepo, financeRepo)
	activityHandler := handlers.NewActivityHandler(activityUsecase)

	// Enhancement Handlers (InfaqType, WATemplate)
	infaqTypeHandler := handlers.NewInfaqTypeHandler(db)
	waTemplateHandler := handlers.NewWATemplateHandler(db)

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

		// Midtrans Webhook (public, no auth required)
		api.POST("/midtrans/notification", midtransHandler.HandleNotification)

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
			finance.POST("/payment-proof", financeHandler.UploadPaymentProof)
			finance.POST("/bills/batch", middleware.RoleMiddleware(1, 2, 3, 9), financeHandler.CreateBillBatch)
			finance.GET("/bills/:id", financeHandler.GetBillByID)

			// Midtrans Snap (authenticated)
			finance.POST("/midtrans/create-transaction", midtransHandler.CreateSnapTransaction)
			finance.POST("/midtrans/check-status", midtransHandler.CheckTransactionStatus)

			// Bill Templates
			finance.POST("/templates", middleware.RoleMiddleware(1, 2, 3, 9), financeHandler.CreateBillTemplate)
			finance.GET("/templates", middleware.RoleMiddleware(1, 2, 3, 9), financeHandler.GetBillTemplates)
			finance.DELETE("/templates/:id", middleware.RoleMiddleware(1, 2, 3, 9), financeHandler.DeleteBillTemplate)

			// Extended Financial Features
			finance.POST("/academic-years", middleware.RoleMiddleware(1, 2, 3, 9), financeExtendedHandler.CreateAcademicYear)
			finance.GET("/academic-years", financeExtendedHandler.GetAllAcademicYears)
			finance.PUT("/academic-years/:id", middleware.RoleMiddleware(1, 9), financeExtendedHandler.UpdateAcademicYear)
			finance.DELETE("/academic-years/:id", middleware.RoleMiddleware(1, 9), financeExtendedHandler.DeleteAcademicYear)
			finance.PUT("/academic-years/:id/set-active", middleware.RoleMiddleware(1, 9), financeExtendedHandler.SetActiveAcademicYear)

			// Jenis Pembayaran (Payment Types)
			finance.POST("/payment-types", middleware.RoleMiddleware(1, 9), paymentTypeHandler.Create)
			finance.GET("/payment-types", middleware.RoleMiddleware(1, 8, 9), paymentTypeHandler.GetAll)
			finance.PUT("/payment-types/:id", middleware.RoleMiddleware(1, 9), paymentTypeHandler.Update)
			finance.DELETE("/payment-types/:id", middleware.RoleMiddleware(1, 9), paymentTypeHandler.Delete)

			finance.GET("/savings", middleware.RoleMiddleware(1, 9, 10), financeExtendedHandler.GetAllSavingAccounts)
			finance.POST("/savings/transactions", middleware.RoleMiddleware(1, 9, 10), financeExtendedHandler.ProcessSavingTransaction)
			finance.POST("/savings/transfer", middleware.RoleMiddleware(1, 9, 10), financeExtendedHandler.TransferSavings)
			finance.GET("/savings/transactions/:account_id", middleware.RoleMiddleware(1, 9, 10), financeExtendedHandler.GetSavingTransactions)
			finance.GET("/savings/my", middleware.RoleMiddleware(6, 7), financeExtendedHandler.GetMySavings)
			finance.GET("/savings/my-children", middleware.RoleMiddleware(7), financeExtendedHandler.GetMyChildrenSavings)
			finance.GET("/savings/student/:student_id", middleware.RoleMiddleware(1, 6, 7, 9, 10), financeExtendedHandler.GetStudentSavings)

			// Savings Operational (Pool-level)
			finance.POST("/savings/operational/withdraw", middleware.RoleMiddleware(1, 9), financeExtendedHandler.WithdrawSavingsOperational)
			finance.POST("/savings/operational/return", middleware.RoleMiddleware(1, 9), financeExtendedHandler.ReturnSavingsOperational)
			finance.GET("/savings/operational/history", middleware.RoleMiddleware(1, 9), financeExtendedHandler.GetSavingsOperationalHistory)
			finance.GET("/savings/operational/returns/:withdrawal_id", middleware.RoleMiddleware(1, 9), financeExtendedHandler.GetSavingsOperationalReturns)
			finance.GET("/savings/operational/summary", middleware.RoleMiddleware(1, 9), financeExtendedHandler.GetSavingsPoolSummary)

			finance.POST("/payroll", middleware.RoleMiddleware(1, 9), payrollHandler.CreatePayroll)
			finance.GET("/payroll", middleware.RoleMiddleware(1, 4, 9), payrollHandler.GetPayrolls)
			finance.PUT("/payroll/:id", middleware.RoleMiddleware(1, 9), payrollHandler.UpdatePayroll)
			finance.DELETE("/payroll/:id", middleware.RoleMiddleware(1, 9), payrollHandler.DeletePayroll)
			finance.POST("/payroll/:id/pay", middleware.RoleMiddleware(1, 9), payrollHandler.Pay)

			// Payroll Templates
			finance.GET("/payroll/templates", middleware.RoleMiddleware(1, 9), payrollHandler.GetTemplates)
			finance.GET("/payroll/templates/:userId", middleware.RoleMiddleware(1, 9), payrollHandler.GetTemplateByUserID)
			finance.POST("/payroll/templates", middleware.RoleMiddleware(1, 9), payrollHandler.UpsertTemplate)

			finance.POST("/cash-ledger", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.AddCashLedgerEntry)
			finance.GET("/cash-ledger", middleware.RoleMiddleware(1, 8, 9, 11), financeExtendedHandler.GetCashLedger)
			finance.PUT("/cash-ledger/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.UpdateCashLedgerEntry)
			finance.DELETE("/cash-ledger/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.DeleteCashLedgerEntry)

			finance.POST("/daily-infaq", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.AddDailyInfaqEntry)
			finance.GET("/daily-infaq", middleware.RoleMiddleware(1, 8, 9, 11), financeExtendedHandler.GetDailyInfaq)
			finance.PUT("/daily-infaq/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.UpdateDailyInfaqEntry)
			finance.DELETE("/daily-infaq/:id", middleware.RoleMiddleware(1, 9, 11), financeExtendedHandler.DeleteDailyInfaqEntry)

			finance.GET("/dashboard", middleware.RoleMiddleware(1, 8, 9), financeExtendedHandler.GetDashboardAnalytics)

			// Transaction Codes (Master Data)
			finance.POST("/transaction-codes", middleware.RoleMiddleware(1, 9), transactionCodeHandler.Create)
			finance.GET("/transaction-codes", middleware.RoleMiddleware(1, 8, 9, 10, 11), transactionCodeHandler.GetAll)
			finance.PUT("/transaction-codes/:id", middleware.RoleMiddleware(1, 9), transactionCodeHandler.Update)
			finance.DELETE("/transaction-codes/:id", middleware.RoleMiddleware(1, 9), transactionCodeHandler.Delete)

			// Global Transactions (Super Table)
			finance.GET("/global-transactions", middleware.RoleMiddleware(1, 8, 9, 10, 11), transactionCodeHandler.GetGlobalTransactions)

			// Budget Categories (RKAS)
			finance.POST("/budget-categories", middleware.RoleMiddleware(1, 9), budgetHandler.CreateCategory)
			finance.GET("/budget-categories", middleware.RoleMiddleware(1, 8, 9), budgetHandler.GetAllCategories)
			finance.PUT("/budget-categories/:id", middleware.RoleMiddleware(1, 9), budgetHandler.UpdateCategory)
			finance.DELETE("/budget-categories/:id", middleware.RoleMiddleware(1, 9), budgetHandler.DeleteCategory)

			// Budgets (RKAS)
			finance.POST("/budgets", middleware.RoleMiddleware(1, 9), budgetHandler.Create)
			finance.GET("/budgets", middleware.RoleMiddleware(1, 8, 9), budgetHandler.GetAll)
			finance.PUT("/budgets/:id", middleware.RoleMiddleware(1, 9), budgetHandler.Update)
			finance.DELETE("/budgets/:id", middleware.RoleMiddleware(1, 9), budgetHandler.Delete)

			finance.PUT("/budgets/:id/realize", middleware.RoleMiddleware(1, 9), budgetHandler.Realize)
			finance.GET("/budgets/summary", middleware.RoleMiddleware(1, 8, 9), budgetHandler.GetSummary)

			// Student Obligations (Tanggungan Siswa)
			finance.POST("/student-obligations", middleware.RoleMiddleware(1, 9), studentObligationHandler.Create)
			finance.POST("/student-obligations/bulk-assign", middleware.RoleMiddleware(1, 9), studentObligationHandler.BulkAssign)
			finance.GET("/student-obligations", middleware.RoleMiddleware(1, 8, 9), studentObligationHandler.GetAll)
			finance.GET("/student-obligations/student/:student_id", middleware.RoleMiddleware(1, 6, 7, 8, 9), studentObligationHandler.GetByStudentID)
			finance.PUT("/student-obligations/:id", middleware.RoleMiddleware(1, 9), studentObligationHandler.Update)
			finance.DELETE("/student-obligations/:id", middleware.RoleMiddleware(1, 9), studentObligationHandler.Delete)
			finance.POST("/student-obligations/:id/pay", middleware.RoleMiddleware(1, 9), studentObligationHandler.RecordPayment)

			// Jenis Infaq (CP4)
			finance.POST("/infaq-types", middleware.RoleMiddleware(1, 9), infaqTypeHandler.Create)
			finance.GET("/infaq-types", middleware.RoleMiddleware(1, 8, 9, 11), infaqTypeHandler.GetAll)
			finance.PUT("/infaq-types/:id", middleware.RoleMiddleware(1, 9), infaqTypeHandler.Update)
			finance.DELETE("/infaq-types/:id", middleware.RoleMiddleware(1, 9), infaqTypeHandler.Delete)

			// WhatsApp Templates (CP9)
			finance.POST("/wa-templates", middleware.RoleMiddleware(1, 9), waTemplateHandler.Create)
			finance.GET("/wa-templates", middleware.RoleMiddleware(1, 9), waTemplateHandler.GetAll)
			finance.PUT("/wa-templates/:id", middleware.RoleMiddleware(1, 9), waTemplateHandler.Update)
			finance.DELETE("/wa-templates/:id", middleware.RoleMiddleware(1, 9), waTemplateHandler.Delete)

			// Activities
			finance.POST("/activities", middleware.RoleMiddleware(1, 8, 9), activityHandler.Create)
			finance.GET("/activities", middleware.RoleMiddleware(1, 4, 5, 8, 9), activityHandler.GetAllByAcademicYear)
			finance.GET("/activities/:id", middleware.RoleMiddleware(1, 4, 5, 8, 9), activityHandler.GetByID)
			finance.PUT("/activities/:id", middleware.RoleMiddleware(1, 8, 9), activityHandler.Update)
			finance.DELETE("/activities/:id", middleware.RoleMiddleware(1, 8, 9), activityHandler.Delete)
			finance.GET("/activities/:id/summary", middleware.RoleMiddleware(1, 8, 9), activityHandler.GetSummary)
			finance.POST("/activities/:id/obligations/bulk-assign", middleware.RoleMiddleware(1, 8, 9), activityHandler.BulkAssignClass)
			finance.POST("/activities/:id/obligations/assign-student", middleware.RoleMiddleware(1, 8, 9), activityHandler.AssignStudent)
			finance.GET("/activities/:id/obligations", middleware.RoleMiddleware(1, 8, 9), activityHandler.GetObligations)
			finance.DELETE("/activities/obligations/:ob_id", middleware.RoleMiddleware(1, 8, 9), activityHandler.DeleteObligation)
			finance.POST("/activities/obligations/:ob_id/pay", middleware.RoleMiddleware(1, 8, 9), activityHandler.RecordPayment)
			finance.POST("/activities/:id/transactions", middleware.RoleMiddleware(1, 8, 9), activityHandler.CreateTransaction)
			finance.GET("/activities/:id/transactions", middleware.RoleMiddleware(1, 8, 9), activityHandler.GetTransactions)
			finance.DELETE("/activities/transactions/:tx_id", middleware.RoleMiddleware(1, 8, 9), activityHandler.DeleteTransaction)
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
