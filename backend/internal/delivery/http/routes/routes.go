package routes

import (
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/delivery/http/handlers"
	"ppi-100-sis/internal/delivery/http/middleware"
	"ppi-100-sis/internal/repository/postgres"
	"ppi-100-sis/internal/service/storage"
	"ppi-100-sis/internal/usecase"
	"ppi-100-sis/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	// Enable CORS
	r.Use(middleware.CORSMiddleware())
	r.Static("/uploads", "./uploads")

	// Repositories
	userRepo := postgres.NewUserRepository(db)
	academicRepo := postgres.NewAcademicRepository(db)
	elearningRepo := postgres.NewElearningRepository(db)
	teacherRepo := postgres.NewTeacherRepository(db)

	// Usecases
	authUsecase := usecase.NewAuthUsecase(userRepo, cfg)
	academicUsecase := usecase.NewAcademicUsecase(academicRepo, elearningRepo, userRepo, teacherRepo)

	// Handlers
	authHandler := handlers.NewAuthHandler(authUsecase)
	academicHandler := handlers.NewAcademicHandler(academicUsecase)

	teacherUsecase := usecase.NewTeacherUsecase(teacherRepo)
	teacherHandler := handlers.NewTeacherHandler(teacherUsecase)

	studentRepo := postgres.NewStudentRepository(db)
	attendanceRepo := postgres.NewAttendanceRepository(db)
	studentUsecase := usecase.NewStudentUsecase(studentRepo, attendanceRepo, userRepo)
	studentHandler := handlers.NewStudentHandler(studentUsecase, userRepo)

	publicRepo := postgres.NewPublicRepository(db)
	publicUsecase := usecase.NewPublicUsecase(publicRepo)
	publicHandler := handlers.NewPublicHandler(publicUsecase)

	waService := utils.NewWAService(cfg)

	notificationRepo := postgres.NewNotificationRepository(db)
	notificationUsecase := usecase.NewNotificationUsecase(notificationRepo, waService)
	notificationHandler := handlers.NewNotificationHandler(notificationUsecase)

	// Reuse existing userRepo and studentRepo
	parentRepo := postgres.NewParentRepository(db)
	userUsecase := usecase.NewUserUsecase(userRepo, studentRepo, parentRepo, teacherRepo)
	userHandler := handlers.NewUserHandler(userUsecase)

	bkRepo := postgres.NewBKRepository(db)
	bkUsecase := usecase.NewBKUsecase(bkRepo, userRepo, studentRepo, notificationUsecase)
	bkHandler := handlers.NewBKHandler(bkUsecase, academicUsecase)

	// elearningRepo already declared above
	elearningUsecase := usecase.NewElearningUsecase(elearningRepo, notificationUsecase, userRepo)
	elearningHandler := handlers.NewElearningHandler(elearningUsecase, academicUsecase)

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

	// Invoice Signature & Config - Need this early for FinanceUsecase
	invoiceSignatureRepo := postgres.NewInvoiceSignatureRepository(db)
	invoiceSignatureUsecase := usecase.NewInvoiceSignatureUsecase(invoiceSignatureRepo)
	invoiceSignatureHandler := handlers.NewInvoiceSignatureHandler(invoiceSignatureUsecase)

	schoolSettingRepo := postgres.NewSchoolSettingRepository(db)
	schoolSettingUsecase := usecase.NewSchoolSettingUsecase(schoolSettingRepo)
	schoolSettingHandler := handlers.NewSchoolSettingHandler(schoolSettingUsecase)

	financeUsecase := usecase.NewFinanceUsecase(financeRepo, notificationUsecase, userRepo, studentRepo, budgetRepo, studentObligationRepo, activityRepo, invoiceSignatureUsecase, schoolSettingRepo)

	// Midtrans Payment Gateway
	midtransUsecase := usecase.NewMidtransUsecase(cfg, schoolSettingRepo, financeRepo, studentRepo, userRepo, notificationUsecase, financeUsecase, studentObligationRepo, activityRepo, budgetRepo)
	midtransHandler := handlers.NewMidtransHandler(midtransUsecase)

	// Xendit Payment Gateway
	xenditUsecase := usecase.NewXenditUsecase(cfg, schoolSettingRepo, financeRepo, studentRepo, userRepo, notificationUsecase, financeUsecase, studentObligationRepo, activityRepo, budgetRepo)
	xenditHandler := handlers.NewXenditHandler(xenditUsecase)

	// Mayar Payment Gateway
	mayarUsecase := usecase.NewMayarUsecase(cfg, schoolSettingRepo, financeRepo, studentRepo, userRepo, notificationUsecase, financeUsecase, studentObligationRepo, activityRepo, budgetRepo)
	mayarHandler := handlers.NewMayarHandler(mayarUsecase)

	// Storage Service (Cloudflare R2 + local fallback)
	storageSvc := storage.NewStorageService(cfg)

	financeHandler := handlers.NewFinanceHandler(financeUsecase, midtransUsecase, xenditUsecase, mayarUsecase, storageSvc)

	// Transaction Code
	transactionCodeRepo := postgres.NewTransactionCodeRepository(db)
	transactionCodeUsecase := usecase.NewTransactionCodeUsecase(transactionCodeRepo)
	transactionCodeHandler := handlers.NewTransactionCodeHandler(transactionCodeUsecase)

	payrollRepo := postgres.NewPayrollRepository(db)
	payrollUsecase := usecase.NewPayrollUsecase(payrollRepo, userRepo, financeRepo, budgetRepo, transactionCodeRepo)
	payrollHandler := handlers.NewPayrollHandler(payrollUsecase)

	financeExtendedRepo := postgres.NewFinanceExtendedRepository(db)
	financeExtendedUsecase := usecase.NewFinanceExtendedUsecase(financeExtendedRepo, budgetRepo)
	financeExtendedHandler := handlers.NewFinanceExtendedHandler(financeExtendedUsecase)

	// Budget / RKAS
	budgetUsecase := usecase.NewBudgetUsecase(budgetRepo, notificationUsecase, userRepo, transactionCodeRepo)
	budgetHandler := handlers.NewBudgetHandler(budgetUsecase)

	// Student Obligations (Tanggungan Siswa) - Continued
	studentObligationUsecase := usecase.NewStudentObligationUsecase(studentObligationRepo, paymentTypeRepo, financeUsecase, financeRepo, budgetRepo)
	studentObligationUsecase.SetSchoolSettingRepo(schoolSettingRepo)
	paymentTypeUsecase.SetDependencies(studentObligationRepo, studentObligationUsecase, schoolSettingRepo)
	studentObligationHandler := handlers.NewStudentObligationHandler(studentObligationUsecase, cfg)
	
	// Inject StudentObligationUsecase into StudentHandler for Grade Promotion
	studentHandler.SetStudentObligationUsecase(studentObligationUsecase)
	studentUsecase.SetSchoolSettingRepo(schoolSettingRepo)
	studentUsecase.SetNotificationUsecase(notificationUsecase)
	studentUsecase.SetCfg(cfg)

	// Profile Handler
	profileHandler := handlers.NewProfileHandler(userUsecase)

	// Parent Handler
	parentUsecase := usecase.NewParentUsecase(parentRepo, userRepo, studentRepo)
	parentHandler := handlers.NewParentHandler(parentUsecase)

	// Activities (Fase 3) - Continued
	activityUsecase := usecase.NewActivityUsecase(activityRepo, financeRepo)
	activityHandler := handlers.NewActivityHandler(activityUsecase)

	// Enhancement Handlers (InfaqType, WATemplate)
	infaqTypeRepo := postgres.NewInfaqTypeRepository(db)
	infaqTypeUsecase := usecase.NewInfaqTypeUsecase(infaqTypeRepo)
	infaqTypeHandler := handlers.NewInfaqTypeHandler(infaqTypeUsecase)

	waTemplateRepo := postgres.NewWATemplateRepository(db)
	waTemplateUsecase := usecase.NewWATemplateUsecase(waTemplateRepo)
	waTemplateHandler := handlers.NewWATemplateHandler(waTemplateUsecase)

	// WA Scheduler
	waScheduleRepo := postgres.NewWAScheduleRepository(db)
	waScheduleUsecase := usecase.NewWAScheduleUsecase(waScheduleRepo, studentObligationRepo, waTemplateRepo, notificationRepo, waService)
	waScheduleHandler := handlers.NewWAScheduleHandler(waScheduleUsecase)
	waScheduleUsecase.StartScheduler()

	// External Debt (Catatan Hutang)
	externalDebtRepo := postgres.NewExternalDebtRepository(db)
	externalDebtUsecase := usecase.NewExternalDebtUsecase(externalDebtRepo)
	externalDebtHandler := handlers.NewExternalDebtHandler(externalDebtUsecase)

	// PPDB Payment
	ppdbPaymentRepo := postgres.NewPPDBPaymentRepository(db)
	ppdbPaymentUsecase := usecase.NewPPDBPaymentUsecase(ppdbPaymentRepo, publicRepo, invoiceSignatureUsecase)
	ppdbPaymentHandler := handlers.NewPPDBPaymentHandler(ppdbPaymentUsecase)

	// Asset Management
	assetRepo := postgres.NewAssetRepository(db)
	assetUsecase := usecase.NewAssetUsecase(assetRepo)
	assetHandler := handlers.NewAssetHandler(assetUsecase)

	// Asset Category
	assetCategoryRepo := postgres.NewAssetCategoryRepository(db)
	assetCategoryUsecase := usecase.NewAssetCategoryUsecase(assetCategoryRepo)
	assetCategoryHandler := handlers.NewAssetCategoryHandler(assetCategoryUsecase)

	// School Bank Account
	schoolBankRepo := postgres.NewSchoolBankRepository(db)
	schoolBankUsecase := usecase.NewSchoolBankUsecase(schoolBankRepo)
	schoolBankHandler := handlers.NewSchoolBankHandler(schoolBankUsecase)

	// Database Backup
	backupRepo := postgres.NewBackupRepository(db)
	backupUsecase := usecase.NewBackupUsecase(backupRepo)
	backupHandler := handlers.NewBackupHandler(backupUsecase, cfg)

	// Face Biometrics & Staff Attendance
	staffAttendanceRepo := postgres.NewStaffAttendanceRepository(db)
	staffAttendanceUsecase := usecase.NewStaffAttendanceUsecase(staffAttendanceRepo, userRepo, schoolSettingRepo)
	faceBiometricUsecase := usecase.NewFaceBiometricUsecase(userRepo, studentRepo, attendanceRepo, staffAttendanceRepo, schoolSettingRepo, notificationUsecase)
	faceAttendanceHandler := handlers.NewFaceAttendanceHandler(faceBiometricUsecase, staffAttendanceUsecase)
	payrollUsecase.SetStaffAttendanceRepo(staffAttendanceRepo)

	// Student Leave Requests (Portal Izin Siswa & Approval Wali Kelas)
	studentLeaveRepo := postgres.NewStudentLeaveRepository(db)
	studentLeaveUsecase := usecase.NewStudentLeaveUsecase(studentLeaveRepo, studentRepo, userRepo, notificationRepo, db)
	studentLeaveHandler := handlers.NewStudentLeaveHandler(studentLeaveUsecase, db)

	// Public Routes
	apiGroup := r.Group("/api")
	RegisterPublicRoutes(apiGroup, cfg, authHandler, publicHandler, midtransHandler, xenditHandler, mayarHandler, invoiceSignatureHandler, schoolBankUsecase, schoolSettingUsecase, studentHandler)

	// Public Face Attendance Routes (untuk Kiosk Gerbang / Tablet tanpa session timeout)
	if cfg.FeatureFaceAttendance {
		apiGroup.POST("/attendance/face-scan", faceAttendanceHandler.MatchAndRecordAttendance)
		apiGroup.GET("/attendance/face-descriptors", faceAttendanceHandler.GetRegisteredFaces)
		apiGroup.GET("/staff-attendance/live-recent", faceAttendanceHandler.GetStaffRecentDaily)
		apiGroup.GET("/staff-attendance/today-summary", faceAttendanceHandler.GetStaffDailySummary)
	}

	// Protected Routes (requires authentication)
	protectedGroup := apiGroup.Group("/")
	protectedGroup.Use(middleware.AuthMiddleware(cfg))

	// Protected Face Attendance routes (Admin / Registration / Management)
	if cfg.FeatureFaceAttendance {
		attendanceGroup := protectedGroup.Group("/attendance")
		{
			attendanceGroup.POST("/face-register", faceAttendanceHandler.RegisterFace)
			attendanceGroup.DELETE("/face/:user_id", faceAttendanceHandler.RemoveFace)
		}
	}

	staffAttendanceGroup := protectedGroup.Group("/staff-attendance")
	{
		staffAttendanceGroup.GET("/daily", faceAttendanceHandler.GetStaffDailyAttendance)
		staffAttendanceGroup.GET("/export", faceAttendanceHandler.GetStaffAttendanceExport)
		staffAttendanceGroup.GET("/leaderboard", faceAttendanceHandler.GetStaffLeaderboard)
		staffAttendanceGroup.GET("/monthly-summary", faceAttendanceHandler.GetStaffMonthlySummary)
		staffAttendanceGroup.POST("/:id/waive-penalty", middleware.RoleMiddleware(1, 8, 9), faceAttendanceHandler.WaiveStaffPenalty)
	}

	// Register modular mapped routes
	RegisterAcademicRoutes(protectedGroup, academicHandler, teacherHandler, studentHandler, bkHandler, elearningHandler, studentLeaveHandler, cfg.FeatureBK, cfg.FeatureElearning, cfg.FeatureRFIDAttendance)
	
	RegisterAdminRoutes(protectedGroup, cfg, userHandler, profileHandler, notificationHandler, assetHandler, assetCategoryHandler, schoolSettingHandler, backupHandler, publicHandler, ppdbPaymentHandler, parentHandler)

	RegisterFinanceRoutes(
		protectedGroup, cfg, financeHandler, midtransHandler, xenditHandler, mayarHandler, financeExtendedHandler,
		paymentTypeHandler, studentObligationHandler, infaqTypeHandler, payrollHandler,
		transactionCodeHandler, budgetHandler, activityHandler, externalDebtHandler,
		waTemplateHandler, waScheduleHandler, invoiceSignatureHandler, schoolBankHandler,
	)
}
