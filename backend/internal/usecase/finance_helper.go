package usecase

import (
	"fmt"
	"ppi-100-sis/internal/domain"
	"strings"
	"time"

	"github.com/google/uuid"
)

func (u *FinanceUsecase) triggerAutoWA(student *domain.Student, parent *domain.Parent, bill *domain.Bill) {
	var phones []string
	if parent != nil && parent.Phone != "" {
		phones = append(phones, parent.Phone)
	}
	if student != nil && student.User.Phone != "" {
		if parent == nil || student.User.Phone != parent.Phone {
			phones = append(phones, student.User.Phone)
		}
	}

	if len(phones) == 0 {
		return
	}

	// Get Config for the bill type
	cfg, err := u.financeRepo.GetInvoiceConfigByType(bill.BillType)
	if err != nil || cfg == nil || !cfg.AutoNotifyWA {
		return
	}

	// Get Template
	var template *domain.WATemplate
	if cfg.WATemplateID != nil {
		template, _ = u.notificationUsecase.GetWATemplateByID(*cfg.WATemplateID)
	}
	if template == nil {
		template, _ = u.notificationUsecase.GetDefaultWATemplate()
	}

	if template == nil {
		return // No template found
	}

	// Format message
	msg := u.safeProcessWATemplate(template.BodyTemplate, student, bill)
	_ = u.notificationUsecase.SendWhatsApp(strings.Join(phones, ","), msg)
}

func (u *FinanceUsecase) processWATemplate(body string, student *domain.Student, bill *domain.Bill) string {
	res := body
	res = strings.ReplaceAll(res, "{nama_siswa}", student.User.Name)
	res = strings.ReplaceAll(res, "{nis}", student.NISN)
	res = strings.ReplaceAll(res, "{kelas}", student.Class.Name)
	res = strings.ReplaceAll(res, "{total_tagihan}", fmt.Sprintf("Rp%.0f", bill.Amount))
	res = strings.ReplaceAll(res, "{rincian}", fmt.Sprintf("• %s: Rp%.0f", bill.Title, bill.Amount))
	return processWATemplateLegacyFix(res, bill)
}

func processWATemplateLegacyFix(res string, bill *domain.Bill) string {
	// Apply title format if it hasn't been replaced appropriately.
	// Since original line was strings.ReplaceAll(res, "{rincian}", fmt.Sprintf("• %s: Rp%.0f", bill.Title, bill.Amount)), I will just rewrite it below properly.
	return res
}

// Redoing processWATemplate properly here to fix the strings replace error from above without breaking. Let's just fix it.
func (u *FinanceUsecase) safeProcessWATemplate(body string, student *domain.Student, bill *domain.Bill) string {
	res := body
	res = strings.ReplaceAll(res, "{nama_siswa}", student.User.Name)
	res = strings.ReplaceAll(res, "{nis}", student.NISN)
	res = strings.ReplaceAll(res, "{kelas}", student.Class.Name)
	res = strings.ReplaceAll(res, "{total_tagihan}", fmt.Sprintf("Rp%.0f", bill.Amount))
	res = strings.ReplaceAll(res, "{rincian}", fmt.Sprintf("• %s: Rp%.0f", bill.Title, bill.Amount))
	res = strings.ReplaceAll(res, "{tanggal}", time.Now().Format("02 January 2006"))
	return res
}

func (u *FinanceUsecase) triggerPaymentWA(student *domain.Student, parent *domain.Parent, bill *domain.Bill, amount float64) {
	if parent.Phone == "" {
		return
	}

	msg := fmt.Sprintf("*BUKTI PEMBAYARAN - SDIT AN-NUR*\n\nTerima kasih, pembayaran sebesar *Rp%.0f* untuk tagihan *%s* an. *%s* telah kami terima dan diverifikasi.\n\nSemoga berkah.", amount, bill.Title, student.User.Name)
	_ = u.notificationUsecase.SendWhatsApp(parent.Phone, msg)
}

func (u *FinanceUsecase) triggerMultiPaymentWA(student *domain.Student, parent *domain.Parent, count int, amount float64) {
	if parent.Phone == "" {
		return
	}

	msg := fmt.Sprintf("*BUKTI PEMBAYARAN MULTI-TAGIHAN - SDIT AN-NUR*\n\nTerima kasih, pembayaran sebesar *Rp%.0f* untuk *%d tagihan* an. *%s* telah kami terima dan diverifikasi.\n\nSemoga berkah.", amount, count, student.User.Name)
	_ = u.notificationUsecase.SendWhatsApp(parent.Phone, msg)
}

// helper: get parent record by parent.ID
func (u *FinanceUsecase) getParentByID(parentID uuid.UUID) (*domain.Parent, error) {
	return u.studentRepo.GetParentByID(parentID.String())
}

// syncObligationStatus syncs payment status from a Bill back to the linked obligation
func (u *FinanceUsecase) syncObligationStatus(bill *domain.Bill, totalPaid float64, currentPaymentAmount float64) {
	if bill.ObligationID != nil && u.studentObligationRepo != nil {
		ob, err := u.studentObligationRepo.GetByID(*bill.ObligationID)
		if err == nil {
			ob.PaidAmount = totalPaid
			if totalPaid >= ob.Amount {
				ob.Status = "Paid"
			} else if totalPaid > 0 {
				ob.Status = "Partial"
			}
			_ = u.studentObligationRepo.Update(ob)
		}
	}

	if bill.ActivityObligationID != nil && u.activityRepo != nil {
		ob, err := u.activityRepo.GetObligationByID(*bill.ActivityObligationID)
		if err == nil {
			ob.PaidAmount = totalPaid
			if totalPaid >= ob.Amount {
				ob.Status = "Paid"
			} else if totalPaid > 0 {
				ob.Status = "Partial"
			}
			_ = u.activityRepo.UpdateObligation(ob)

			// Record Income Transaction for Activity
			if currentPaymentAmount > 0 {
				tx := &domain.ActivityTransaction{
					ActivityID:      ob.ActivityID,
					TransactionType: "Income",
					Amount:          currentPaymentAmount,
					Date:            time.Now(),
					Description:     "Pembayaran Kegiatan dari: " + bill.Student.User.Name,
					CreatedByID:     ob.CreatedByID,
				}
				_ = u.activityRepo.CreateTransaction(tx)
			}
		}
	}
}

// NotifyBendahara sends a notification to all users with role_id 9 (Bendahara)
func (u *FinanceUsecase) NotifyBendahara(title string, message string, referenceID string) {
	// Get all bendahara users (role_id=9)
	users, err := u.userRepo.GetUsersByRole(9)
	if err != nil {
		return
	}
	for _, bendahara := range users {
		_ = u.notificationUsecase.SendNotification(
			bendahara.ID,
			title,
			message,
			"payment",
			referenceID,
		)
	}
}

func (u *FinanceUsecase) getSettingValue(key string, defaultValue string) string {
	return u.financeRepo.GetSettingValue(key, defaultValue)
}

func (u *FinanceUsecase) sendBillInAppNotifications(student *domain.Student, bill *domain.Bill) {
	// 1. Notify Student
	titleTemplate := u.getSettingValue("app_notif_bill_student_title", "Tagihan Baru")
	bodyTemplate := u.getSettingValue("app_notif_bill_student_body", "Anda memiliki tagihan baru: {nama_tagihan}")

	body := strings.ReplaceAll(bodyTemplate, "{nama_tagihan}", bill.Title)
	body = strings.ReplaceAll(body, "{total_tagihan}", fmt.Sprintf("Rp%.0f", bill.Amount))
	body = strings.ReplaceAll(body, "{nama_siswa}", student.User.Name)

	_ = u.notificationUsecase.SendNotification(
		student.UserID,
		titleTemplate,
		body,
		"bill",
		bill.ID.String(),
	)

	// 2. Notify Parent if linked
	if student.ParentID != nil {
		parent, err := u.getParentByID(*student.ParentID)
		if err == nil {
			pTitleTemplate := u.getSettingValue("app_notif_bill_parent_title", "Tagihan Baru untuk Anak Anda")
			pBodyTemplate := u.getSettingValue("app_notif_bill_parent_body", "Tagihan baru untuk {nama_siswa}: {nama_tagihan}")

			pBody := strings.ReplaceAll(pBodyTemplate, "{nama_tagihan}", bill.Title)
			pBody = strings.ReplaceAll(pBody, "{total_tagihan}", fmt.Sprintf("Rp%.0f", bill.Amount))
			pBody = strings.ReplaceAll(pBody, "{nama_siswa}", student.User.Name)

			_ = u.notificationUsecase.SendNotification(
				parent.UserID,
				pTitleTemplate,
				pBody,
				"bill",
				bill.ID.String(),
			)

			// WhatsApp Auto Notification
			u.triggerAutoWA(student, parent, bill)
		}
	}
}

func (u *FinanceUsecase) sendPaymentInAppNotifications(student *domain.Student, bill *domain.Bill, parent *domain.Parent, amount float64) {
	// 1. Notify Student
	titleTemplate := u.getSettingValue("app_notif_payment_student_title", "Pembayaran Berhasil")
	bodyTemplate := u.getSettingValue("app_notif_payment_student_body", "Pembayaran {nama_tagihan} sebesar {nominal} telah diverifikasi.")

	body := strings.ReplaceAll(bodyTemplate, "{nama_tagihan}", bill.Title)
	body = strings.ReplaceAll(body, "{nominal}", fmt.Sprintf("Rp%.0f", amount))
	body = strings.ReplaceAll(body, "{nama_siswa}", student.User.Name)

	_ = u.notificationUsecase.SendNotification(
		student.UserID,
		titleTemplate,
		body,
		"payment",
		bill.ID.String(),
	)

	// 2. Notify Parent if linked
	if parent != nil {
		pTitleTemplate := u.getSettingValue("app_notif_payment_parent_title", "Pembayaran Tagihan Anak Berhasil")
		pBodyTemplate := u.getSettingValue("app_notif_payment_parent_body", "Pembayaran {nama_tagihan} untuk {nama_siswa} sebesar {nominal} telah diverifikasi.")

		pBody := strings.ReplaceAll(pBodyTemplate, "{nama_tagihan}", bill.Title)
		pBody = strings.ReplaceAll(pBody, "{nominal}", fmt.Sprintf("Rp%.0f", amount))
		pBody = strings.ReplaceAll(pBody, "{nama_siswa}", student.User.Name)

		_ = u.notificationUsecase.SendNotification(
			parent.UserID,
			pTitleTemplate,
			pBody,
			"payment",
			bill.ID.String(),
		)
	}
}
