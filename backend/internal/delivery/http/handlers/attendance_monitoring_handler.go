package handlers

import (
	"fmt"
	"net/http"
	"ppi-100-sis/internal/domain"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AttendanceMonitoringHandler struct {
	db *gorm.DB
}

func NewAttendanceMonitoringHandler(db *gorm.DB) *AttendanceMonitoringHandler {
	return &AttendanceMonitoringHandler{db: db}
}

// GET /attendance/daily-personnel-status - Feed monitoring harian personil (Siswa & Guru/Staf) beserta alasannya
func (h *AttendanceMonitoringHandler) GetDailyPersonnelStatus(c *gin.Context) {
	loc, _ := time.LoadLocation("Asia/Jakarta")
	if loc == nil {
		loc = time.Local
	}

	dateStr := c.DefaultQuery("date", time.Now().In(loc).Format("2006-01-02"))
	unitIDStr := c.DefaultQuery("unit_id", "0")
	unitID, _ := strconv.ParseUint(unitIDStr, 10, 32)
	roleType := c.DefaultQuery("role_type", "all") // "all", "student", "staff"

	classIDStr := c.Query("class_id")
	var classID uint
	if classIDStr != "" {
		cid, _ := strconv.ParseUint(classIDStr, 10, 32)
		classID = uint(cid)
	}

	parsedDate, err := time.ParseInLocation("2006-01-02", dateStr, loc)
	if err != nil {
		parsedDate = time.Now().In(loc)
	}

	startOfDay := time.Date(parsedDate.Year(), parsedDate.Month(), parsedDate.Day(), 0, 0, 0, 0, loc)
	endOfDay := startOfDay.Add(24 * time.Hour)

	var response domain.DailyPersonnelStatusResponse
	response.Date = parsedDate.Format("2006-01-02")
	response.Personnel = make([]domain.PersonnelDailyStatusItem, 0)

	// ── 1. Proses Data Siswa ──
	if roleType == "all" || roleType == "student" {
		queryStudents := h.db.Model(&domain.Student{}).
			Preload("User").
			Preload("Class")

		if unitID > 0 {
			queryStudents = queryStudents.Where("unit_id = ?", unitID)
		}
		if classID > 0 {
			queryStudents = queryStudents.Where("class_id = ?", classID)
		}

		var students []domain.Student
		if err := queryStudents.Order("class_id ASC, nisn ASC").Find(&students).Error; err == nil {
			// Query seluruh presensi siswa hari ini
			var attendances []domain.Attendance
			_ = h.db.Where("timestamp >= ? AND timestamp < ?", startOfDay, endOfDay).Find(&attendances).Error
			attMap := make(map[uuid.UUID]domain.Attendance)
			for _, att := range attendances {
				attMap[att.StudentID] = att
			}

			// Query permohonan izin siswa yang disetujui dan aktif hari ini
			var studentLeaves []domain.StudentLeaveRequest
			_ = h.db.
				Preload("ApproverTeacher.User").
				Preload("ApproverUser").
				Where("status = 'Approved' AND start_date <= ? AND end_date >= ?", startOfDay, startOfDay).
				Find(&studentLeaves).Error
			leaveMap := make(map[uuid.UUID]domain.StudentLeaveRequest)
			for _, l := range studentLeaves {
				leaveMap[l.StudentID] = l
			}

			for _, s := range students {
				att, hasAtt := attMap[s.ID]
				leaveReq, hasLeave := leaveMap[s.ID]

				status := "Absent"
				var checkInTime *string
				reason := ""
				attachmentURL := ""
				approvedBy := ""
				leaveTypeStr := ""

				if hasAtt {
					status = att.Status
					timeStr := fmt.Sprintf("%02d:%02d WIB", att.Timestamp.In(loc).Hour(), att.Timestamp.In(loc).Minute())
					checkInTime = &timeStr
					reason = att.Notes

					if hasLeave {
						leaveTypeStr = leaveReq.Type
						if leaveReq.Reason != "" {
							reason = leaveReq.Reason
						}
						attachmentURL = leaveReq.AttachmentURL
						if leaveReq.ApproverUser != nil {
							approvedBy = leaveReq.ApproverUser.Name
						} else if leaveReq.ApproverTeacher != nil {
							approvedBy = leaveReq.ApproverTeacher.User.Name
						}
					}
				} else if hasLeave {
					status = leaveReq.Type // "Sick" atau "Permission"
					leaveTypeStr = leaveReq.Type
					reason = leaveReq.Reason
					attachmentURL = leaveReq.AttachmentURL
					if leaveReq.ApproverUser != nil {
						approvedBy = leaveReq.ApproverUser.Name
					} else if leaveReq.ApproverTeacher != nil {
						approvedBy = leaveReq.ApproverTeacher.User.Name
					}
				} else {
					status = "Absent"
					reason = "Belum absen / tidak ada keterangan"
				}

				// Metrik Siswa
				response.Summary.Students.Total++
				switch status {
				case "Present":
					response.Summary.Students.Present++
				case "Late":
					response.Summary.Students.Late++
				case "Sick":
					response.Summary.Students.Sick++
				case "Permission":
					response.Summary.Students.Permission++
				default:
					response.Summary.Students.Absent++
				}

				className := "Belum Ada Kelas"
				if s.Class.Name != "" {
					className = s.Class.Name
				}

				userName := s.User.Name
				if userName == "" {
					userName = "Siswa"
				}

				response.Personnel = append(response.Personnel, domain.PersonnelDailyStatusItem{
					ID:            s.ID.String(),
					UserID:        s.UserID.String(),
					Name:          userName,
					Role:          "Student",
					RoleTitle:     fmt.Sprintf("Siswa (%s)", className),
					UnitID:        s.UnitID,
					UnitName:      className,
					Status:        status,
					CheckInTime:   checkInTime,
					Reason:        reason,
					AttachmentURL: attachmentURL,
					ApprovedBy:    approvedBy,
					LeaveType:     leaveTypeStr,
				})
			}
		}
	}

	// ── 2. Proses Data Guru & Staf ──
	if roleType == "all" || roleType == "staff" {
		queryStaff := h.db.Model(&domain.User{}).
			Preload("Teacher").
			Where("role_id IN (4, 5)") // Guru & Wali Kelas

		if unitID > 0 {
			queryStaff = queryStaff.Where("unit_id = ? OR unit_id = 0", unitID)
		}

		var staffUsers []domain.User
		if err := queryStaff.Order("name ASC").Find(&staffUsers).Error; err == nil {
			// Query seluruh presensi staf hari ini
			var staffAtts []domain.StaffAttendance
			_ = h.db.Where("date >= ? AND date < ?", startOfDay, endOfDay).Find(&staffAtts).Error
			staffAttMap := make(map[uuid.UUID]domain.StaffAttendance)
			for _, sa := range staffAtts {
				staffAttMap[sa.UserID] = sa
			}

			// Query pengajuan izin/tugas luar staf yang disetujui dan aktif hari ini
			var staffLeaves []domain.StaffLeaveRequest
			_ = h.db.
				Preload("ApproverUser").
				Where("status = 'Approved' AND start_date <= ? AND end_date >= ?", startOfDay, startOfDay).
				Find(&staffLeaves).Error
			staffLeaveMap := make(map[uuid.UUID]domain.StaffLeaveRequest)
			for _, sl := range staffLeaves {
				staffLeaveMap[sl.UserID] = sl
			}

			for _, u := range staffUsers {
				sa, hasSA := staffAttMap[u.ID]
				sl, hasSL := staffLeaveMap[u.ID]

				status := "Absent"
				var checkInTime *string
				lateMinutes := 0
				var penaltyAmount float64 = 0
				reason := ""
				attachmentURL := ""
				approvedBy := ""
				leaveTypeStr := ""

				if hasSA {
					status = sa.Status
					timeStr := fmt.Sprintf("%02d:%02d WIB", sa.CheckInTime.In(loc).Hour(), sa.CheckInTime.In(loc).Minute())
					checkInTime = &timeStr
					lateMinutes = sa.LateMinutes
					penaltyAmount = sa.PenaltyAmount
					reason = sa.Notes

					if hasSL {
						leaveTypeStr = sl.Type
						if sl.Reason != "" {
							reason = sl.Reason
						}
						attachmentURL = sl.AttachmentURL
						if sl.ApproverUser != nil {
							approvedBy = sl.ApproverUser.Name
						}
					}
				} else if hasSL {
					status = sl.Type // "Duty", "Sick", "Permission", "Dispensation", "Leave"
					leaveTypeStr = sl.Type
					reason = sl.Reason
					attachmentURL = sl.AttachmentURL
					if sl.ApproverUser != nil {
						approvedBy = sl.ApproverUser.Name
					}
				} else {
					status = "Absent"
					reason = "Belum absen / tidak ada keterangan"
				}

				// Normalisasi penamaan status
				if status == "Dispensation" {
					status = "Duty"
				} else if status == "Leave" {
					status = "Permission"
				}

				// Metrik Staf
				response.Summary.Staff.Total++
				switch status {
				case "Present":
					response.Summary.Staff.Present++
				case "Late":
					response.Summary.Staff.Late++
				case "Duty":
					response.Summary.Staff.Duty++
				case "Sick":
					response.Summary.Staff.Sick++
				case "Permission":
					response.Summary.Staff.Permission++
				default:
					response.Summary.Staff.Absent++
				}

				roleTitle := "Guru"
				if u.RoleID == 5 {
					roleTitle = "Wali Kelas"
				}
				if u.Teacher != nil && u.Teacher.NIP != "" {
					roleTitle = fmt.Sprintf("%s (NIP: %s)", roleTitle, u.Teacher.NIP)
				}

				response.Personnel = append(response.Personnel, domain.PersonnelDailyStatusItem{
					ID:            u.ID.String(),
					UserID:        u.ID.String(),
					Name:          u.Name,
					Role:          "Teacher",
					RoleTitle:     roleTitle,
					UnitID:        u.UnitID,
					UnitName:      "Tenaga Pendidik",
					Status:        status,
					CheckInTime:   checkInTime,
					LateMinutes:   lateMinutes,
					PenaltyAmount: penaltyAmount,
					Reason:        reason,
					AttachmentURL: attachmentURL,
					ApprovedBy:    approvedBy,
					LeaveType:     leaveTypeStr,
				})
			}
		}
	}

	c.JSON(http.StatusOK, response)
}

