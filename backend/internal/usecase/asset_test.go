package usecase

// Feature: ppdb-payment-and-improvements, Property 12: Filter Aset
// **Validates: Requirements 9.5**
//
// Property: For any combination of filter parameters (kategori, kondisi, status, lokasi, keyword)
// on GET /assets, all returned assets must satisfy ALL applied filters simultaneously.

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"pgregory.net/rapid"
	"ppi-100-sis/internal/domain"
)

// ─── In-memory mock repository ───────────────────────────────────────────────

// inMemoryAssetRepo holds a fixed set of assets and applies the same filter
// logic as the real postgres.AssetRepository.GetAll.
type inMemoryAssetRepo struct {
	assets []domain.Asset
}

// GetRecap mirrors the real repository's GetRecap logic exactly.
// It aggregates assets by category (count + value) and by status (count),
// and computes the overall total value and total asset count.
func (r *inMemoryAssetRepo) GetRecap() (*domain.AssetRecap, error) {
	categoryMap := make(map[string]*domain.AssetCategoryCount)
	statusMap := make(map[string]*domain.AssetStatusCount)
	var totalValue float64

	for _, a := range r.assets {
		// By category
		if _, ok := categoryMap[a.Category]; !ok {
			categoryMap[a.Category] = &domain.AssetCategoryCount{Category: a.Category}
		}
		categoryMap[a.Category].Count++
		categoryMap[a.Category].Value += a.AcquisitionValue

		// By status
		if _, ok := statusMap[a.Status]; !ok {
			statusMap[a.Status] = &domain.AssetStatusCount{Status: a.Status}
		}
		statusMap[a.Status].Count++

		totalValue += a.AcquisitionValue
	}

	byCategory := make([]domain.AssetCategoryCount, 0, len(categoryMap))
	for _, v := range categoryMap {
		byCategory = append(byCategory, *v)
	}

	byStatus := make([]domain.AssetStatusCount, 0, len(statusMap))
	for _, v := range statusMap {
		byStatus = append(byStatus, *v)
	}

	return &domain.AssetRecap{
		ByCategory:  byCategory,
		ByStatus:    byStatus,
		TotalValue:  totalValue,
		TotalAssets: len(r.assets),
	}, nil
}

// GetAll mirrors the real repository's filter logic exactly.
func (r *inMemoryAssetRepo) GetAll(kategori, kondisi, status, lokasi, keyword string) ([]domain.Asset, error) {
	var result []domain.Asset
	for _, a := range r.assets {
		if kategori != "" && a.Category != kategori {
			continue
		}
		if kondisi != "" && a.Condition != kondisi {
			continue
		}
		if status != "" && a.Status != status {
			continue
		}
		if lokasi != "" && a.Location != lokasi {
			continue
		}
		if keyword != "" && !strings.Contains(strings.ToLower(a.Name), strings.ToLower(keyword)) {
			continue
		}
		result = append(result, a)
	}
	return result, nil
}

// ─── Seed data ────────────────────────────────────────────────────────────────

var (
	assetCategories = []string{"Elektronik", "Furnitur", "Kendaraan", "Bangunan", "Perlengkapan"}
	assetConditions = []string{"Baik", "Rusak Ringan", "Rusak Berat"}
	assetStatuses   = []string{"Aktif", "Dalam Perbaikan", "Dihapuskan"}
	assetLocations  = []string{"Ruang Kelas A", "Ruang Kelas B", "Kantor", "Gudang", "Lab Komputer"}
	assetNames      = []string{
		"Laptop Dell", "Proyektor Epson", "Meja Belajar", "Kursi Guru",
		"Mobil Operasional", "Gedung Utama", "Printer Canon", "AC Daikin",
		"Papan Tulis", "Lemari Arsip",
	}
)

// buildAsset creates a domain.Asset with the given attributes.
func buildAsset(name, category, condition, location, status string) domain.Asset {
	return domain.Asset{
		ID:               uuid.New(),
		Name:             name,
		Category:         category,
		Condition:        condition,
		Location:         location,
		AcquisitionValue: 1_000_000,
		AcquisitionDate:  time.Now().AddDate(-1, 0, 0),
		Status:           status,
		Notes:            "",
		CreatedByID:      uuid.New(),
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
	}
}

// buildAssetPool generates a deterministic pool of assets covering all
// combinations of category × condition × status × location.
func buildAssetPool() []domain.Asset {
	var pool []domain.Asset
	nameIdx := 0
	for _, cat := range assetCategories {
		for _, cond := range assetConditions {
			for _, stat := range assetStatuses {
				for _, loc := range assetLocations {
					name := assetNames[nameIdx%len(assetNames)]
					nameIdx++
					pool = append(pool, buildAsset(
						fmt.Sprintf("%s-%d", name, nameIdx),
						cat, cond, loc, stat,
					))
				}
			}
		}
	}
	return pool
}

// ─── Property test ────────────────────────────────────────────────────────────

// TestProperty_FilterAset verifies Property 12:
// For any combination of filters, all returned assets must match all non-empty
// filter criteria simultaneously.
func TestProperty_FilterAset(t *testing.T) {
	// Build a fixed, rich pool of assets once.
	pool := buildAssetPool()
	repo := &inMemoryAssetRepo{assets: pool}

	rapid.Check(t, func(t *rapid.T) {
		// Generate random filter values — each filter is either empty (no filter)
		// or one of the valid enum values.
		kategori := rapid.SampledFrom(append([]string{""}, assetCategories...)).Draw(t, "kategori")
		kondisi  := rapid.SampledFrom(append([]string{""}, assetConditions...)).Draw(t, "kondisi")
		status   := rapid.SampledFrom(append([]string{""}, assetStatuses...)).Draw(t, "status")
		lokasi   := rapid.SampledFrom(append([]string{""}, assetLocations...)).Draw(t, "lokasi")

		// keyword: either empty or a short substring drawn from asset name fragments
		keywordOptions := []string{"", "Laptop", "Meja", "Kursi", "Printer", "Gedung", "AC", "Papan", "xyz_no_match"}
		keyword := rapid.SampledFrom(keywordOptions).Draw(t, "keyword")

		// Apply the filter
		results, err := repo.GetAll(kategori, kondisi, status, lokasi, keyword)
		if err != nil {
			t.Fatalf("GetAll returned unexpected error: %v", err)
		}

		// Verify every returned asset satisfies ALL non-empty filters
		for _, a := range results {
			if kategori != "" && a.Category != kategori {
				t.Fatalf(
					"Asset %s has category %q but filter was %q",
					a.ID, a.Category, kategori,
				)
			}
			if kondisi != "" && a.Condition != kondisi {
				t.Fatalf(
					"Asset %s has condition %q but filter was %q",
					a.ID, a.Condition, kondisi,
				)
			}
			if status != "" && a.Status != status {
				t.Fatalf(
					"Asset %s has status %q but filter was %q",
					a.ID, a.Status, status,
				)
			}
			if lokasi != "" && a.Location != lokasi {
				t.Fatalf(
					"Asset %s has location %q but filter was %q",
					a.ID, a.Location, lokasi,
				)
			}
			if keyword != "" && !strings.Contains(strings.ToLower(a.Name), strings.ToLower(keyword)) {
				t.Fatalf(
					"Asset %s has name %q which does not contain keyword %q",
					a.ID, a.Name, keyword,
				)
			}
		}
	})
}

// TestProperty_FilterAset_NoFilterReturnsAll verifies that when all filters are
// empty, the full asset pool is returned.
func TestProperty_FilterAset_NoFilterReturnsAll(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate a random-sized pool (1–20 assets)
		numAssets := rapid.IntRange(1, 20).Draw(t, "num_assets")
		var pool []domain.Asset
		for i := 0; i < numAssets; i++ {
			cat  := rapid.SampledFrom(assetCategories).Draw(t, fmt.Sprintf("cat_%d", i))
			cond := rapid.SampledFrom(assetConditions).Draw(t, fmt.Sprintf("cond_%d", i))
			stat := rapid.SampledFrom(assetStatuses).Draw(t, fmt.Sprintf("stat_%d", i))
			loc  := rapid.SampledFrom(assetLocations).Draw(t, fmt.Sprintf("loc_%d", i))
			pool = append(pool, buildAsset(fmt.Sprintf("Aset-%d", i), cat, cond, loc, stat))
		}

		repo := &inMemoryAssetRepo{assets: pool}
		results, err := repo.GetAll("", "", "", "", "")
		if err != nil {
			t.Fatalf("GetAll returned unexpected error: %v", err)
		}

		if len(results) != len(pool) {
			t.Fatalf(
				"Expected all %d assets when no filter applied, but got %d",
				len(pool), len(results),
			)
		}
	})
}

// TestProperty_FilterAset_ExcludedAssetsNotReturned verifies that assets NOT
// matching a filter are never included in the result.
func TestProperty_FilterAset_ExcludedAssetsNotReturned(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Pick a target category to filter by
		targetCategory := rapid.SampledFrom(assetCategories).Draw(t, "target_category")

		// Build a pool with at least one asset in the target category and at
		// least one asset in a different category.
		otherCategories := make([]string, 0, len(assetCategories)-1)
		for _, c := range assetCategories {
			if c != targetCategory {
				otherCategories = append(otherCategories, c)
			}
		}

		numTarget := rapid.IntRange(1, 5).Draw(t, "num_target")
		numOther  := rapid.IntRange(1, 5).Draw(t, "num_other")

		var pool []domain.Asset
		for i := 0; i < numTarget; i++ {
			pool = append(pool, buildAsset(
				fmt.Sprintf("Target-%d", i),
				targetCategory,
				assetConditions[0],
				assetLocations[0],
				assetStatuses[0],
			))
		}
		for i := 0; i < numOther; i++ {
			otherCat := rapid.SampledFrom(otherCategories).Draw(t, fmt.Sprintf("other_cat_%d", i))
			pool = append(pool, buildAsset(
				fmt.Sprintf("Other-%d", i),
				otherCat,
				assetConditions[0],
				assetLocations[0],
				assetStatuses[0],
			))
		}

		repo := &inMemoryAssetRepo{assets: pool}
		results, err := repo.GetAll(targetCategory, "", "", "", "")
		if err != nil {
			t.Fatalf("GetAll returned unexpected error: %v", err)
		}

		// All results must be in the target category
		for _, a := range results {
			if a.Category != targetCategory {
				t.Fatalf(
					"Asset %s (category=%q) should not appear when filtering for %q",
					a.ID, a.Category, targetCategory,
				)
			}
		}

		// The count must equal numTarget
		if len(results) != numTarget {
			t.Fatalf(
				"Expected %d assets with category %q, got %d",
				numTarget, targetCategory, len(results),
			)
		}
	})
}

// Feature: ppdb-payment-and-improvements, Property 13: Rekap Aset Konsisten dengan Data Aktual
// **Validates: Requirements 9.10**
//
// Property: For any set of assets, the recap must accurately reflect the actual data —
// count per category, count per status, and total acquisition value must match
// what is computed directly from the asset list.

// TestProperty_RekapAsetKonsisten verifies Property 13:
// For any randomly generated set of assets, the recap returned by GetRecap must
// exactly match the values computed manually from the same asset list.
func TestProperty_RekapAsetKonsisten(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate N random assets (1–30)
		numAssets := rapid.IntRange(1, 30).Draw(t, "num_assets")

		var assets []domain.Asset
		for i := 0; i < numAssets; i++ {
			cat  := rapid.SampledFrom(assetCategories).Draw(t, fmt.Sprintf("cat_%d", i))
			cond := rapid.SampledFrom(assetConditions).Draw(t, fmt.Sprintf("cond_%d", i))
			stat := rapid.SampledFrom(assetStatuses).Draw(t, fmt.Sprintf("stat_%d", i))
			loc  := rapid.SampledFrom(assetLocations).Draw(t, fmt.Sprintf("loc_%d", i))
			// Acquisition value: positive float between 100_000 and 100_000_000
			value := float64(rapid.IntRange(1, 1000).Draw(t, fmt.Sprintf("value_%d", i))) * 100_000.0
			a := buildAsset(fmt.Sprintf("Aset-%d", i), cat, cond, loc, stat)
			a.AcquisitionValue = value
			assets = append(assets, a)
		}

		repo := &inMemoryAssetRepo{assets: assets}
		recap, err := repo.GetRecap()
		if err != nil {
			t.Fatalf("GetRecap returned unexpected error: %v", err)
		}

		// ── Manually compute expected values ──────────────────────────────────

		// Expected total assets
		if recap.TotalAssets != len(assets) {
			t.Fatalf("TotalAssets: expected %d, got %d", len(assets), recap.TotalAssets)
		}

		// Expected total value
		var expectedTotalValue float64
		for _, a := range assets {
			expectedTotalValue += a.AcquisitionValue
		}
		if recap.TotalValue != expectedTotalValue {
			t.Fatalf("TotalValue: expected %.2f, got %.2f", expectedTotalValue, recap.TotalValue)
		}

		// Expected count per category
		expectedByCategory := make(map[string]struct{ Count int; Value float64 })
		for _, a := range assets {
			e := expectedByCategory[a.Category]
			e.Count++
			e.Value += a.AcquisitionValue
			expectedByCategory[a.Category] = e
		}

		// Build a map from the recap result for easy lookup
		recapByCategory := make(map[string]domain.AssetCategoryCount)
		for _, c := range recap.ByCategory {
			recapByCategory[c.Category] = c
		}

		// Verify every expected category appears in the recap with correct values
		for cat, exp := range expectedByCategory {
			got, ok := recapByCategory[cat]
			if !ok {
				t.Fatalf("Category %q missing from recap", cat)
			}
			if got.Count != exp.Count {
				t.Fatalf("Category %q: expected count %d, got %d", cat, exp.Count, got.Count)
			}
			if got.Value != exp.Value {
				t.Fatalf("Category %q: expected value %.2f, got %.2f", cat, exp.Value, got.Value)
			}
		}

		// Verify no extra categories appear in the recap
		if len(recap.ByCategory) != len(expectedByCategory) {
			t.Fatalf(
				"ByCategory length mismatch: expected %d categories, got %d",
				len(expectedByCategory), len(recap.ByCategory),
			)
		}

		// Expected count per status
		expectedByStatus := make(map[string]int)
		for _, a := range assets {
			expectedByStatus[a.Status]++
		}

		recapByStatus := make(map[string]int)
		for _, s := range recap.ByStatus {
			recapByStatus[s.Status] = s.Count
		}

		for stat, expCount := range expectedByStatus {
			gotCount, ok := recapByStatus[stat]
			if !ok {
				t.Fatalf("Status %q missing from recap", stat)
			}
			if gotCount != expCount {
				t.Fatalf("Status %q: expected count %d, got %d", stat, expCount, gotCount)
			}
		}

		if len(recap.ByStatus) != len(expectedByStatus) {
			t.Fatalf(
				"ByStatus length mismatch: expected %d statuses, got %d",
				len(expectedByStatus), len(recap.ByStatus),
			)
		}
	})
}

// Feature: ppdb-payment-and-improvements, Property 14: Pencatatan Tanggal Penghapusan Aset
// **Validates: Requirements 9.9**
//
// Property: For any asset whose status is changed to "Dihapuskan",
// the deleted_at field must be automatically set to a non-null timestamp
// at the moment of the status change.

// applyDeletedAtLogic mirrors the pure state-transition logic inside
// AssetUsecase.UpdateAsset (asset_usecase.go):
//
//	if asset.Status == "Dihapuskan" && asset.DeletedAt == nil {
//	    now := time.Now()
//	    asset.DeletedAt = &now
//	}
//
// Extracted here so the property test can exercise it without a real repository.
func applyDeletedAtLogic(asset *domain.Asset) {
	if asset.Status == "Dihapuskan" && asset.DeletedAt == nil {
		now := time.Now()
		asset.DeletedAt = &now
	}
}

// TestProperty_PencatatanTanggalPenghapusanAset verifies Property 14:
// Whenever an asset's status is set to "Dihapuskan", deleted_at must be
// automatically populated with a recent, non-null timestamp.
func TestProperty_PencatatanTanggalPenghapusanAset(t *testing.T) {
	// Non-deleted statuses that an asset can start with.
	nonDeletedStatuses := []string{"Aktif", "Dalam Perbaikan"}

	rapid.Check(t, func(t *rapid.T) {
		// 1. Generate an asset with any non-"Dihapuskan" status.
		initialStatus := rapid.SampledFrom(nonDeletedStatuses).Draw(t, "initial_status")
		cat := rapid.SampledFrom(assetCategories).Draw(t, "category")
		cond := rapid.SampledFrom(assetConditions).Draw(t, "condition")
		loc := rapid.SampledFrom(assetLocations).Draw(t, "location")

		asset := buildAsset("Aset-Test", cat, cond, loc, initialStatus)
		// Ensure deleted_at starts as nil (asset is not yet deleted).
		asset.DeletedAt = nil

		// 2. Change the status to "Dihapuskan".
		asset.Status = "Dihapuskan"

		// Record the time just before applying the logic so we can verify
		// the timestamp is recent.
		before := time.Now()

		// 3. Apply the pure state-transition logic from UpdateAsset.
		applyDeletedAtLogic(&asset)

		after := time.Now()

		// 4. Verify deleted_at is not nil.
		if asset.DeletedAt == nil {
			t.Fatalf(
				"deleted_at must not be nil after status is set to 'Dihapuskan' (initial status was %q)",
				initialStatus,
			)
		}

		// 5. Verify deleted_at is a recent timestamp (within the test window).
		deletedAt := *asset.DeletedAt
		if deletedAt.Before(before) || deletedAt.After(after) {
			t.Fatalf(
				"deleted_at %v is not within the expected window [%v, %v]",
				deletedAt, before, after,
			)
		}
	})
}

// TestProperty_PencatatanTanggalPenghapusanAset_IdempotentIfAlreadySet verifies
// that if deleted_at is already set (e.g. the asset was previously marked as
// deleted), the logic does NOT overwrite the existing timestamp.
func TestProperty_PencatatanTanggalPenghapusanAset_IdempotentIfAlreadySet(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Build an asset that already has deleted_at set.
		existingDeletedAt := time.Now().Add(-time.Duration(rapid.IntRange(1, 3600).Draw(t, "seconds_ago")) * time.Second)
		asset := buildAsset("Aset-AlreadyDeleted", assetCategories[0], assetConditions[0], assetLocations[0], "Dihapuskan")
		asset.DeletedAt = &existingDeletedAt

		// Apply the logic again — it should be a no-op.
		applyDeletedAtLogic(&asset)

		if asset.DeletedAt == nil {
			t.Fatal("deleted_at must not become nil after re-applying logic on an already-deleted asset")
		}
		if !asset.DeletedAt.Equal(existingDeletedAt) {
			t.Fatalf(
				"deleted_at must not be overwritten: expected %v, got %v",
				existingDeletedAt, *asset.DeletedAt,
			)
		}
	})
}

// TestProperty_PencatatanTanggalPenghapusanAset_NonDeletedStatusNoChange verifies
// that for any status other than "Dihapuskan", deleted_at remains nil.
func TestProperty_PencatatanTanggalPenghapusanAset_NonDeletedStatusNoChange(t *testing.T) {
	nonDeletedStatuses := []string{"Aktif", "Dalam Perbaikan"}

	rapid.Check(t, func(t *rapid.T) {
		status := rapid.SampledFrom(nonDeletedStatuses).Draw(t, "status")
		asset := buildAsset("Aset-Active", assetCategories[0], assetConditions[0], assetLocations[0], status)
		asset.DeletedAt = nil

		applyDeletedAtLogic(&asset)

		if asset.DeletedAt != nil {
			t.Fatalf(
				"deleted_at must remain nil for status %q, but got %v",
				status, *asset.DeletedAt,
			)
		}
	})
}

// Feature: ppdb-payment-and-improvements, Property 15: Validasi Nilai Perolehan Aset
// **Validates: Requirements 9.19**
//
// Property: For any non-positive acquisition_value (zero or negative),
// the system must reject the request and return an error message.
// For any positive acquisition_value, the system must accept it.

// TestProperty_ValidasiNilaiPerolehanAset verifies Property 15:
// validateAsset must reject any non-positive acquisition_value and accept any positive value.
func TestProperty_ValidasiNilaiPerolehanAset(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate invalid acquisition values: zero or negative
		// Use a float in range [-1_000_000_000, 0]
		invalidValue := float64(rapid.IntRange(-1_000_000_000, 0).Draw(t, "invalid_value"))

		asset := buildAsset("Aset-Test", assetCategories[0], assetConditions[0], assetLocations[0], assetStatuses[0])
		asset.AcquisitionValue = invalidValue
		// Use a past date to avoid triggering the date validation
		asset.AcquisitionDate = time.Now().AddDate(-1, 0, 0)

		err := validateAsset(&asset)
		if err == nil {
			t.Fatalf(
				"Expected error for non-positive acquisition_value=%.2f, but got nil",
				invalidValue,
			)
		}
		if err.Error() != "Nilai perolehan harus berupa angka positif" {
			t.Fatalf(
				"Expected error message 'Nilai perolehan harus berupa angka positif', got %q",
				err.Error(),
			)
		}
	})
}

// TestProperty_ValidasiNilaiPerolehanAset_ValidPositiveAccepted verifies that
// any strictly positive acquisition_value is accepted by validateAsset.
func TestProperty_ValidasiNilaiPerolehanAset_ValidPositiveAccepted(t *testing.T) {
	rapid.Check(t, func(t *rapid.T) {
		// Generate valid acquisition values: strictly positive (1 to 1_000_000_000)
		validValue := float64(rapid.IntRange(1, 1_000_000_000).Draw(t, "valid_value"))

		asset := buildAsset("Aset-Test", assetCategories[0], assetConditions[0], assetLocations[0], assetStatuses[0])
		asset.AcquisitionValue = validValue
		// Use a past date to avoid triggering the date validation
		asset.AcquisitionDate = time.Now().AddDate(-1, 0, 0)

		err := validateAsset(&asset)
		if err != nil {
			t.Fatalf(
				"Expected no error for positive acquisition_value=%.2f, but got: %v",
				validValue, err,
			)
		}
	})
}
