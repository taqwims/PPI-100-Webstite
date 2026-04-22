package routes

import (
	"ppi-100-sis/internal/config"
	"ppi-100-sis/internal/delivery/http/handlers"
	"ppi-100-sis/internal/delivery/http/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterAdminRoutes(
	rg *gin.RouterGroup,
	cfg *config.Config,
	userHandler *handlers.UserHandler,
	profileHandler *handlers.ProfileHandler,
	notificationHandler *handlers.NotificationHandler,
	assetHandler *handlers.AssetHandler,
	assetCategoryHandler *handlers.AssetCategoryHandler,
	schoolSettingHandler *handlers.SchoolSettingHandler,
	backupHandler *handlers.BackupHandler,
	publicHandler *handlers.PublicHandler,
	ppdbPaymentHandler *handlers.PPDBPaymentHandler,
	parentHandler *handlers.ParentHandler,
) {
	// ── Profile ──
	rg.GET("/profile", profileHandler.GetProfile)
	rg.PUT("/profile", profileHandler.UpdateProfile)
	rg.POST("/profile/photo", profileHandler.UploadPhoto)
	rg.PUT("/profile/password", profileHandler.ChangePassword)

	// ── Users ──
	users := rg.Group("/users")
	{
		users.GET("/", middleware.RoleMiddleware(1, 2, 3, 9), userHandler.GetAllUsers)
		users.POST("/", middleware.RoleMiddleware(1, 2, 3), userHandler.CreateUser)
		users.POST("/bulk", middleware.RoleMiddleware(1, 2, 3), userHandler.BulkCreateUsers)
		users.PUT("/:id", middleware.RoleMiddleware(1, 2, 3), userHandler.UpdateUser)
		users.DELETE("/:id", middleware.RoleMiddleware(1, 2, 3), userHandler.DeleteUser)
	}

	// ── Parents ──
	parents := rg.Group("/parents")
	{
		parents.GET("/", middleware.RoleMiddleware(1, 2, 3, 9), parentHandler.GetAllParents)
		parents.GET("/:id", middleware.RoleMiddleware(1, 2, 3, 9), parentHandler.GetParentByID)
		parents.POST("/", middleware.RoleMiddleware(1, 2, 3), parentHandler.CreateParent)
		parents.PUT("/:id", middleware.RoleMiddleware(1, 2, 3), parentHandler.UpdateParent)
		parents.DELETE("/:id", middleware.RoleMiddleware(1, 2, 3), parentHandler.DeleteParent)
		parents.POST("/:id/assign", middleware.RoleMiddleware(1, 2, 3), parentHandler.AssignChild)
		parents.DELETE("/:id/remove/:student_id", middleware.RoleMiddleware(1, 2, 3), parentHandler.RemoveChild)
	}

	// ── Notifications ──
	notifications := rg.Group("/notifications")
	{
		notifications.GET("/", notificationHandler.GetNotifications)
		notifications.GET("/all", notificationHandler.GetAllNotifications)
		notifications.PUT("/:id/read", notificationHandler.MarkAsRead)
		notifications.POST("/", notificationHandler.SendNotification)
		notifications.DELETE("/:id", notificationHandler.DeleteNotification)
	}

	// ── PPDB Management (Admin) ──
	if cfg.FeaturePPDB {
		ppdb := rg.Group("/ppdb")
		{
			ppdb.GET("/", publicHandler.GetPPDBRegistrations)
			ppdb.PUT("/:id/status", publicHandler.UpdatePPDBStatus)
			ppdb.DELETE("/:id", publicHandler.DeletePPDBRegistration)

			ppdb.POST("/payments", middleware.RoleMiddleware(1, 2, 3, 9), ppdbPaymentHandler.CreatePayment)
			ppdb.GET("/payments", middleware.RoleMiddleware(1, 2, 3, 9), ppdbPaymentHandler.GetPayments)
			ppdb.GET("/payments/:id", middleware.RoleMiddleware(1, 2, 3, 9), ppdbPaymentHandler.GetPaymentByID)
			ppdb.PUT("/payments/:id", middleware.RoleMiddleware(1, 2, 3, 9), ppdbPaymentHandler.UpdatePayment)
			ppdb.DELETE("/payments/:id", middleware.RoleMiddleware(1, 2, 3, 9), ppdbPaymentHandler.DeletePayment)
		}
	}

	// ── Asset Management ──
	if cfg.FeatureAssets {
		rg.POST("/assets", middleware.RoleMiddleware(1, 2, 3, 10), assetHandler.CreateAsset)
		rg.GET("/assets", middleware.RoleMiddleware(1, 2, 3, 8, 9, 10), assetHandler.GetAssets)
		rg.GET("/assets/recap", middleware.RoleMiddleware(1, 2, 3, 8, 9, 10), assetHandler.GetAssetRecap)
		rg.GET("/assets/:id", middleware.RoleMiddleware(1, 2, 3, 8, 9, 10), assetHandler.GetAssetByID)
		rg.PUT("/assets/:id", middleware.RoleMiddleware(1, 2, 3, 10), assetHandler.UpdateAsset)
		rg.DELETE("/assets/:id", middleware.RoleMiddleware(1, 2, 3), assetHandler.DeleteAsset)

		rg.POST("/assets/categories", middleware.RoleMiddleware(1, 2, 3, 10), assetCategoryHandler.Create)
		rg.GET("/assets/categories", middleware.RoleMiddleware(1, 2, 3, 8, 9, 10), assetCategoryHandler.GetAll)
		rg.PUT("/assets/categories/:id", middleware.RoleMiddleware(1, 2, 3, 10), assetCategoryHandler.Update)
		rg.DELETE("/assets/categories/:id", middleware.RoleMiddleware(1, 2, 3, 10), assetCategoryHandler.Delete)
	}

	// ── Public Content Management (Admin) ──
	if cfg.FeaturePublicWebsite {
		publicContent := rg.Group("/public-content")
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
	}

	// ── Admin (Settings, Backups, Contacts) ──
	admin := rg.Group("/admin")
	{
		admin.GET("/contacts", publicHandler.GetContactMessages)
		admin.DELETE("/contacts/:id", publicHandler.DeleteContactMessage)

		// School Settings (SaaS)
		admin.GET("/settings", middleware.RoleMiddleware(1), schoolSettingHandler.GetAllSettings)
		admin.PUT("/settings", middleware.RoleMiddleware(1), schoolSettingHandler.UpdateSettings)
		admin.POST("/settings/logo", middleware.RoleMiddleware(1), schoolSettingHandler.UploadLogo)
		admin.GET("/units", middleware.RoleMiddleware(1), schoolSettingHandler.GetUnits)

		// Database Backup & Restore
		admin.POST("/backups", middleware.RoleMiddleware(1), backupHandler.CreateBackup)
		admin.GET("/backups", middleware.RoleMiddleware(1), backupHandler.ListBackups)
		admin.POST("/backups/:id/restore", middleware.RoleMiddleware(1), backupHandler.RestoreBackup)
		admin.GET("/backups/:id/download", middleware.RoleMiddleware(1), backupHandler.DownloadBackup)
		admin.DELETE("/backups/:id", middleware.RoleMiddleware(1), backupHandler.DeleteBackup)
	}

	// Manual WhatsApp Trigger
	if cfg.FeatureWAGateway {
		rg.POST("/notifications/wa", notificationHandler.SendManualWA)
	}
}
