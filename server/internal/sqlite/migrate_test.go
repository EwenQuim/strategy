package sqlite

import (
	"database/sql"
	"path/filepath"
	"strings"
	"testing"
)

func openDB(t *testing.T, path string) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", path+"?_pragma=busy_timeout(100)")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func TestAddPublicColumn(t *testing.T) {
	path := filepath.Join(t.TempDir(), "hexmate.db")
	db := openDB(t, path)
	if _, err := db.Exec(`CREATE TABLE games (code TEXT PRIMARY KEY) STRICT`); err != nil {
		t.Fatal(err)
	}

	if err := addPublicColumn(db); err != nil {
		t.Fatal(err)
	}
	var present int
	if err := db.QueryRow(`SELECT COUNT(*) FROM pragma_table_info('games') WHERE name = 'public'`).Scan(&present); err != nil {
		t.Fatal(err)
	}
	if present != 1 {
		t.Fatalf("public column present = %d, want 1", present)
	}

	if err := addPublicColumn(db); err != nil {
		t.Fatalf("second migration: %v", err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM pragma_table_info('games') WHERE name = 'public'`).Scan(&present); err != nil {
		t.Fatal(err)
	}
	if present != 1 {
		t.Fatalf("public column present = %d after second migration, want 1", present)
	}
}

func TestAddPublicColumnFailsWhenLocked(t *testing.T) {
	path := filepath.Join(t.TempDir(), "hexmate.db")
	holder := openDB(t, path)
	if _, err := holder.Exec(`CREATE TABLE games (code TEXT PRIMARY KEY) STRICT`); err != nil {
		t.Fatal(err)
	}
	if _, err := holder.Exec(`BEGIN IMMEDIATE`); err != nil {
		t.Fatal(err)
	}

	migrator := openDB(t, path)
	err := addPublicColumn(migrator)
	if err == nil || !strings.Contains(err.Error(), "add public column") {
		t.Fatalf("want migration failure, got %v", err)
	}
}
